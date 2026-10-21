import unittest
import time
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import test_configuration as fixtures
from app.main import create_app
from app.schemas import BotConfig
from app.services.index_identity import fingerprint
from app.core.errors import ProviderUnavailable


class PersistentIndexTests(unittest.TestCase):
    setUp = fixtures.ConfigurationTests.setUp
    create = fixtures.ConfigurationTests.create
    publish = fixtures.ConfigurationTests.publish

    def service(self):
        return self.client.app.state.bot_service

    def status(self, bot):
        return self.client.get(f"/api/admin/bots/{bot['id']}/index",headers=self.headers).json()

    def save(self, bot):
        res = self.client.put(f"/api/admin/bots/{bot['id']}/draft",headers=self.headers,
                             json={'expected_revision':bot['revision'],'config':bot['draft']})
        self.assertEqual(res.status_code,200,res.text)
        return res.json()

    def test_vectors_survive_restart_and_query_only_embeds_question(self):
        with patch('app.services.knowledge_service.embed',new_callable=AsyncMock,return_value=[[1.,0.]]) as embed:
            bot=self.create(knowledge_enabled=True,retrieval={'strategy':'semantic'},
                            documents=[{'id':'a','name':'a.md','content':'kiểm định ALPHA'}],
                            model={'provider':'anthropic'})
            self.assertEqual(embed.await_count,1)
            self.publish(bot)
        again=TestClient(create_app(self.service().repository.path))
        with patch('app.services.knowledge_service.chunks',side_effect=AssertionError('Must not rechunk')), \
             patch('app.services.knowledge_service.embed',new_callable=AsyncMock,return_value=[[1.,0.]]) as embed, \
             patch('app.services.chat_service.generate',new_callable=AsyncMock,return_value='OK'):
            result=again.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'})
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(embed.call_args.args[0],['kiểm định'])
            self.assertEqual(result.json()['citations'][0]['id'],'a')

    def test_draft_edit_delete_and_cleanup_preserve_published(self):
        bot=self.create(knowledge_enabled=True,model={'provider':'anthropic'},
                        documents=[{'id':'a','name':'a','content':'kiểm định OLD'}])
        self.publish(bot)
        oldkey=self.status(bot)['published']['fingerprint']
        bot['draft']['documents'][0]['content']='kiểm định NEW'
        bot=self.save(bot)
        status=self.status(bot)
        self.assertNotEqual(status['draft']['fingerprint'],oldkey)
        with patch('app.services.chat_service.generate',new_callable=AsyncMock,return_value='OK') as gen:
            self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'})
            self.assertIn('OLD',gen.call_args.args[2]);self.assertNotIn('NEW',gen.call_args.args[2])
            self.client.post(f"/api/admin/bots/{bot['id']}/preview",headers=self.headers,json={'message':'kiểm định'})
            self.assertIn('NEW',gen.call_args.args[2])
        bot['draft']['documents']=[]
        bot=self.save(bot)
        out=self.client.post(f"/api/admin/bots/{bot['id']}/preview",headers=self.headers,json={'message':'kiểm định'}).json()
        self.assertEqual(out['reason'],'no_context')
        self.assertIsNotNone(self.service().index_service.repository.get(bot['id'],oldkey))
        self.publish(bot)
        self.assertIsNone(self.service().index_service.repository.get(bot['id'],oldkey))
        self.assertEqual(self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'}).json()['reason'],'no_context')

    def test_same_document_keys_do_not_cross_bots(self):
        a=self.create(documents=[{'id':'same','name':'same','content':'kiểm định A'}])
        b=self.create(documents=[{'id':'same','name':'same','content':'kiểm định B'}])
        indexes=self.service().index_service.repository
        self.assertIsNone(indexes.get(b['id'],self.status(a)['draft']['fingerprint']))
        self.assertEqual(indexes.get(a['id'],self.status(a)['draft']['fingerprint'])['chunks'][0]['content'],'kiểm định A')

    def test_model_revision_and_chunk_settings_change_identity(self):
        config=BotConfig(documents=[{'id':'x','name':'x','content':'text'}],retrieval={'strategy':'semantic'})
        key=fingerprint(config)
        config.retrieval.embedding_model='other'
        self.assertNotEqual(key,fingerprint(config))
        config.retrieval.embedding_model='nomic-embed-text';config.retrieval.embedding_revision='2'
        self.assertNotEqual(key,fingerprint(config))
        config.retrieval.embedding_revision='1';config.retrieval.chunk_size=800
        self.assertNotEqual(key,fingerprint(config))
        config.retrieval.chunk_size=1600;config.system_prompt='New prompt'
        self.assertEqual(key,fingerprint(config))

    def test_failed_build_blocks_publish_and_retry_recovers(self):
        with patch('app.services.knowledge_service.embed',new_callable=AsyncMock,side_effect=ProviderUnavailable('Embedding unavailable')), \
             patch('app.services.index_service.log.exception'):
            bot=self.create(knowledge_enabled=True,retrieval={'strategy':'semantic'},documents=[{'id':'a','name':'a','content':'kiểm định'}])
        self.assertEqual(self.status(bot)['draft']['state'],'error')
        result=self.client.post(f"/api/admin/bots/{bot['id']}/publish",headers=self.headers,json={'expected_revision':1})
        self.assertEqual(result.status_code,409)
        with patch('app.services.knowledge_service.embed',new_callable=AsyncMock,return_value=[[1.,0.]]):
            result=self.client.post(f"/api/admin/bots/{bot['id']}/index/rebuild",headers=self.headers,json={'expected_revision':1})
            self.assertEqual(result.status_code,202)
        self.assertEqual(self.status(bot)['draft']['state'],'ready')
        self.publish(bot)

    def test_stale_worker_cannot_overwrite_new_generation(self):
        bot=self.create(documents=[{'id':'a','name':'a','content':'text'}])
        index=self.service().index_service
        config=BotConfig.model_validate(bot['draft']);key=fingerprint(config)
        token=index.reserve(bot['id'],config,True)
        self.assertIsNone(index.reserve(bot['id'],config,True))
        with self.service().repository.connect() as db:
            db.execute('UPDATE document_indexes SET updated_at=? WHERE bot_id=?',(time.time()-400,bot['id']))
        self.assertEqual(index.status(bot['id'],config)['state'],'interrupted')
        newer=index.reserve(bot['id'],config,True)
        self.assertNotEqual(token,newer)
        self.assertFalse(index.repository.finish(bot['id'],key,token,[],[]))
        self.assertTrue(index.repository.finish(bot['id'],key,newer,[],[]))

    def test_rebuild_keeps_serving_ready_snapshot(self):
        bot=self.create(knowledge_enabled=True,documents=[{'id':'a','name':'a','content':'kiểm định'}],model={'provider':'anthropic'})
        self.publish(bot)
        config=BotConfig.model_validate(bot['draft'])
        self.service().index_service.reserve(bot['id'],config,True)
        with patch('app.services.chat_service.generate',new_callable=AsyncMock,return_value='OK'):
            res=self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'})
            self.assertEqual(res.status_code,200,res.text)
        self.assertTrue(self.status(bot)['published']['serving_ready'])

    def test_index_routes_require_admin_and_revision(self):
        bot=self.create()
        self.assertEqual(self.client.get(f"/api/admin/bots/{bot['id']}/index").status_code,401)
        self.assertEqual(self.client.post(f"/api/admin/bots/{bot['id']}/index/rebuild",headers=self.headers,
                                         json={'expected_revision':99}).status_code,409)

    def test_changed_embedding_model_keeps_public_vectors_separate(self):
        async def embedding(texts,model,bot_id):
            return [[1.,0.] if model=='old-model' else [1.,0.,0.] for _ in texts]
        with patch('app.services.knowledge_service.embed',side_effect=embedding), \
             patch('app.services.chat_service.generate',new_callable=AsyncMock,return_value='OK'):
            bot=self.create(knowledge_enabled=True,model={'provider':'anthropic'},retrieval={'strategy':'semantic','embedding_model':'old-model'},
                            documents=[{'id':'a','name':'a','content':'kiểm định'}])
            self.publish(bot)
            bot['draft']['retrieval']['embedding_model']='new-model'
            bot=self.save(bot)
            status=self.status(bot)
            self.assertEqual(status['draft']['dimension'],3)
            self.assertEqual(status['published']['dimension'],2)
            self.assertEqual(self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'}).status_code,200)
            self.assertEqual(self.client.post(f"/api/admin/bots/{bot['id']}/preview",headers=self.headers,json={'message':'kiểm định'}).status_code,200)
        with patch('app.services.knowledge_service.embed',new_callable=AsyncMock,return_value=[[1.,0.,0.,0.]]):
            self.assertEqual(self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'kiểm định'}).status_code,503)
