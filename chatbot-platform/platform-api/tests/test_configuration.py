import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import create_app
from app.schemas import BotConfig, ChatRequest
from app.services.prompt_service import build_prompt
from app.services.policy_service import finalize
from app.services.configuration_service import catalog


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.env = patch.dict('os.environ', {'ADMIN_TOKEN': 'test-token'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.client = TestClient(create_app(Path(self.tmp.name) / 'db.sqlite3'))
        self.headers = {'Authorization': 'Bearer test-token'}

    def create(self, **config):
        res = self.client.post('/api/admin/bots', headers=self.headers, json=config)
        self.assertEqual(res.status_code, 201, res.text)
        return res.json()

    def publish(self, bot):
        res = self.client.post(f"/api/admin/bots/{bot['id']}/publish", headers=self.headers,
                               json={'expected_revision': bot['revision']})
        self.assertEqual(res.status_code, 200)

    def test_catalog_authenticated_and_tvts_rules_extracted(self):
        self.assertEqual(self.client.get('/api/admin/configuration').status_code, 401)
        response = self.client.get('/api/admin/configuration', headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        tvts = next(t for t in response.json()['templates'] if t['id'] == 'tvts')
        self.assertEqual(len(tvts['config']['prompt_rules']), 3)
        self.assertTrue(tvts['config']['knowledge_enabled'])
        self.assertIn('CẤM NỘI SUY', tvts['config']['prompt_rules'][1]['instruction'])
        self.assertNotIn('module_2', [r['id'] for r in tvts['config']['routes']])

    def test_rules_short_circuit_provider_and_exclusions(self):
        bot = self.create(model={'provider':'anthropic'}, response_rules=[
            {'id':'handoff', 'keywords':['ĐIỂM'], 'exclude_keywords':['điểm cộng'], 'response':'Liên hệ phòng tư vấn'}])
        endpoint = f"/api/admin/bots/{bot['id']}/preview"
        with patch('app.services.chat_service.generate', new_callable=AsyncMock, return_value='OK') as provider:
            out = self.client.post(endpoint, headers=self.headers, json={'message':'điểm chuẩn?'}).json()
            self.assertEqual(out['response'], 'Liên hệ phòng tư vấn')
            provider.assert_not_called()
            out = self.client.post(endpoint, headers=self.headers, json={'message':'điểm cộng?'}).json()
            self.assertEqual(out['response'], 'OK')
            provider.assert_awaited_once()

    def test_documents_isolated_by_bot_route_and_publication(self):
        doc = {'id':'secret', 'name':'A.md', 'content':'kiểm định ALPHA_PRIVATE', 'route_id':'quality'}
        bot = self.create(knowledge_enabled=True, model={'provider':'anthropic'},
                          routes=[{'id':'quality','label':'Chất lượng'}], documents=[doc])
        other = self.create(knowledge_enabled=True, model={'provider':'anthropic'})
        self.publish(bot); self.publish(other)
        with patch('app.services.chat_service.generate', new_callable=AsyncMock, return_value='Kết quả') as provider:
            # Auto does not accidentally retrieve documents scoped to an unselected route.
            result = self.client.post(f"/api/bots/{bot['id']}/chat", json={'message':'kiểm định'}).json()
            self.assertEqual(result['reason'], 'no_context')
            result = self.client.post(f"/api/bots/{other['id']}/chat", json={'message':'kiểm định'}).json()
            self.assertEqual(result['reason'], 'no_context')
            provider.assert_not_called()
            result = self.client.post(f"/api/bots/{bot['id']}/chat", json={'message':'kiểm định','mode':'quality'}).json()
            self.assertEqual(result['citations'][0]['id'], 'secret')
            self.assertIn('ALPHA_PRIVATE', provider.call_args.args[2])
            bot['draft']['documents'][0]['content'] = 'kiểm định BETA_DRAFT'
            saved = self.client.put(f"/api/admin/bots/{bot['id']}/draft", headers=self.headers,
                                   json={'expected_revision':1,'config':bot['draft']})
            self.assertEqual(saved.status_code, 200)
            self.client.post(f"/api/bots/{bot['id']}/chat", json={'message':'kiểm định','mode':'quality'})
            self.assertNotIn('BETA_DRAFT', provider.call_args.args[2])
            self.client.post(f"/api/admin/bots/{bot['id']}/preview", headers=self.headers,
                             json={'message':'kiểm định','mode':'quality'})
            self.assertIn('BETA_DRAFT', provider.call_args.args[2])
        public = self.client.get(f"/api/bots/{bot['id']}").json()
        self.assertNotIn('documents', public)
        self.assertNotIn('prompt_rules', public)

    def test_defer_guard_and_rule_toggle(self):
        config = BotConfig(fallback_message='Không đủ căn cứ.', prompt_rules=[
            {'id':'on','label':'A','instruction':'ACTIVE_RULE'},
            {'id':'off','label':'B','instruction':'DISABLED_RULE','enabled':False}])
        self.assertEqual(finalize(config,'Phỏng đoán. Không đủ căn cứ. Tuy nhiên...'), 'Không đủ căn cứ.')
        prompt = build_prompt(config, None)
        self.assertIn('ACTIVE_RULE', prompt)
        self.assertNotIn('DISABLED_RULE', prompt)
        self.assertEqual(finalize(config, ''), config.fallback_message)

    def test_invalid_document_scope_and_chunking(self):
        for payload in [{'documents':[{'id':'x','name':'x','content':'x','route_id':'missing'}]},
                        {'retrieval':{'chunk_size':200,'overlap':200}},
                        {'response_rules':[{'id':'x','response':'a'},{'id':'x','response':'b'}]}]:
            self.assertEqual(self.client.post('/api/admin/bots', headers=self.headers, json=payload).status_code,422)

class GuidedConfigurationTests(unittest.TestCase):
    setUp = ConfigurationTests.setUp
    create = ConfigurationTests.create
    publish = ConfigurationTests.publish

    def test_inspection_matches_pipeline_without_calling_provider(self):
        bot = self.create(knowledge_enabled=True, documents=[{'id':'a','name':'a.md','content':'kiểm định hồ sơ'}],
                          prompt_profile={'role':'QUALITY_ROLE'}, answer_examples=[{'question':'Example?','answer':'STYLE_ONLY'}])
        path = f"/api/admin/bots/{bot['id']}/inspect"
        self.assertEqual(self.client.post(path,json={'message':'kiểm định'}).status_code,401)
        with patch('app.services.chat_service.generate',new_callable=AsyncMock) as provider:
            res = self.client.post(path,headers=self.headers,json={'message':'kiểm định'})
            self.assertEqual(res.status_code,200,res.text)
            out = res.json()
            self.assertEqual(out['documents'][0]['id'],'a')
            self.assertIn('QUALITY_ROLE',out['prompt'])
            self.assertIn('STYLE_ONLY',out['prompt'])
            self.assertFalse(out['calls_model'])
            provider.assert_not_called()

    def test_actions_and_features_are_enforced(self):
        bot = self.create(knowledge_enabled=True, features={'allow_mode_selection':False, 'show_sources':False,
                          'starter_questions':['Chào']}, links=[{'id':'help','label':'Hỗ trợ',
                          'url':'https://example.edu/help','when':'fallback'}])
        self.publish(bot)
        out = self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'Hỏi'}).json()
        self.assertEqual(out['actions'][0]['url'],'https://example.edu/help')
        self.assertEqual(out['citations'],[])
        self.assertEqual(self.client.post(f"/api/bots/{bot['id']}/chat",json={'message':'Hỏi','mode':'manual'}).status_code,422)
        public = self.client.get(f"/api/bots/{bot['id']}").json()
        self.assertFalse(public['features']['allow_mode_selection'])
        for url in ['javascript:alert(1)','//example.edu','https://user:pass@example.edu']:
            self.assertEqual(self.client.post('/api/admin/bots',headers=self.headers,json={
                'links':[{'id':'x','label':'x','url':url}]}).status_code,422)

    def test_route_priority_and_unmatched_fallback(self):
        bot = self.create(routes=[{'id':'first','label':'A','keywords':['kiểm định']},
                                  {'id':'second','label':'B','keywords':['kiểm định']}],
                          routing={'unmatched':'fallback'},model={'provider':'anthropic'})
        with patch('app.services.chat_service.generate',new_callable=AsyncMock,return_value='OK') as provider:
            path = f"/api/admin/bots/{bot['id']}/preview"
            result = self.client.post(path,headers=self.headers,json={'message':'không khớp'}).json()
            self.assertEqual(result['reason'],'unmatched_route')
            provider.assert_not_called()
            result = self.client.post(path,headers=self.headers,json={'message':'kiểm định'}).json()
            self.assertEqual(result['resolved_route'],'first')
