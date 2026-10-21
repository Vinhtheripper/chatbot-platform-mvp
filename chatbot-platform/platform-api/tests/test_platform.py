import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import create_app


class PlatformTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.tmp_path = Path(self.temp.name)
        env = patch.dict('os.environ', {'ADMIN_TOKEN': 'test-token'})
        env.start()
        self.addCleanup(env.stop)
        self.client = TestClient(create_app(self.tmp_path / 'test.sqlite3'))
        self.headers = {'Authorization': 'Bearer test-token'}

    def test_draft_publish_isolation_and_conflict(self):
        c, h = self.client, self.headers
        assert c.get('/api/admin/bots').status_code == 401
        bot = c.post('/api/admin/bots', headers=h, json={'name': 'ĐBCL'}).json()
        bid = bot['id']
        assert c.get(f'/api/bots/{bid}').status_code == 404
        assert c.post(f'/api/bots/{bid}/chat', json={'message':'Chào'}).status_code == 404
        assert c.post(f'/api/admin/bots/{bid}/publish', headers=h, json={'expected_revision':1}).status_code == 200
        draft = bot['draft']; draft['name'] = 'Tên nháp'; draft['system_prompt'] = 'PRIVATE_PROMPT'
        saved = c.put(f'/api/admin/bots/{bid}/draft', headers=h, json={'expected_revision':1,'config':draft})
        assert saved.status_code == 200
        assert c.put(f'/api/admin/bots/{bid}/draft', headers=h, json={'expected_revision':1,'config':draft}).status_code == 409
        assert c.post(f'/api/admin/bots/{bid}/publish', headers=h, json={'expected_revision':1}).status_code == 409
        public = c.get(f'/api/bots/{bid}').json()
        assert public['name'] == 'ĐBCL'
        assert 'system_prompt' not in public and 'model' not in public
        preview = c.post(f'/api/admin/bots/{bid}/preview', headers=h, json={'message':'Chào'}).json()
        runtime = c.post(f'/api/bots/{bid}/chat', json={'message':'Chào'}).json()
        assert 'Tên nháp' in preview['response'] and 'ĐBCL' in runtime['response']
        assert 'PRIVATE_PROMPT' not in runtime['response']
        c.post(f'/api/admin/bots/{bid}/publish', headers=h, json={'expected_revision':2})
        assert c.get(f'/api/bots/{bid}').json()['name'] == 'Tên nháp'


    def test_routes_knowledge_and_bot_isolation(self):
        c,h = self.client, self.headers
        bot=c.post('/api/admin/bots',headers=h,json={'name':'A','routes':[{'id':'criteria','label':'Tiêu chí','keywords':['tiêu chí'],'instruction':'Chỉ trả lời tiêu chí'}]}).json()
        other=c.post('/api/admin/bots',headers=h,json={'name':'B','knowledge_enabled':True,'fallback_message':'Thiếu nguồn B'}).json()
        for b in [bot,other]: c.post(f"/api/admin/bots/{b['id']}/publish",headers=h,json={'expected_revision':1})
        first=c.post(f"/api/bots/{bot['id']}/chat",json={'message':'TIÊU CHÍ là gì?'}).json()
        second=c.post(f"/api/bots/{other['id']}/chat",json={'message':'TIÊU CHÍ là gì?'}).json()
        assert first['resolved_route']=='criteria'
        assert second['resolved_route'] is None and second['response']=='Thiếu nguồn B'
        assert c.post(f"/api/bots/{other['id']}/chat",json={'message':'a','mode':'criteria'}).status_code==422
        assert c.post('/api/admin/bots',headers=h,json={'theme':{'primary_color':'javascript:bad'}}).status_code==422
        assert c.post('/api/admin/bots',headers=h,json={'routes':[{'id':'x','label':'X'},{'id':'x','label':'Y'}]}).status_code==422


    def test_missing_admin_configuration_fails_closed(self):
        with patch.dict('os.environ', {'ADMIN_TOKEN': ''}):
            assert self.client.post('/api/admin/bots',json={}).status_code == 503

    def test_config_persists_across_app_instances(self):
        created = self.client.post('/api/admin/bots', headers=self.headers, json={'name':'Persistent'}).json()
        again = TestClient(create_app(self.tmp_path / 'test.sqlite3'))
        rows = again.get('/api/admin/bots', headers=self.headers).json()
        assert len(rows) == 1 and rows[0]['id'] == created['id']

    def test_provider_failure_is_explicit(self):
        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': ''}):
            bot = self.client.post('/api/admin/bots', headers=self.headers,
                json={'model':{'provider':'anthropic','name':'configured-model'}}).json()
            result = self.client.post(f"/api/admin/bots/{bot['id']}/preview", headers=self.headers,
                json={'message':'Xin chào'})
            assert result.status_code == 503
            assert 'ANTHROPIC_API_KEY' in result.json()['detail']

if __name__ == "__main__":
    unittest.main()
