import json
from pathlib import Path
from ..schemas import BotConfig


def catalog():
    templates = [{'id': 'blank', 'label': 'Trợ lý dùng chung',
                  'notes': 'Cấu hình độc lập, chưa có tài liệu.', 'config': BotConfig().model_dump()}]
    for path in sorted((Path(__file__).resolve().parent.parent / 'templates').glob('*.json')):
        item = json.loads(path.read_text())
        item['config'] = BotConfig.model_validate(item['config']).model_dump()
        templates.append(item)
    packs = [json.loads(path.read_text()) for path in sorted((Path(__file__).resolve().parent.parent / 'rule_packs').glob('*.json'))]
    from .ingestion_service import FORMATS, MAX_BYTES
    return {'rule_packs': packs, 'handler_types': [
                {'id': 'static_response', 'label': 'Phản hồi cố định — không gọi model'},
                {'id': 'document_lookup', 'label': 'Trích tài liệu — không sinh câu trả lời'}],'templates': templates,
            'providers': [{'id': 'demo', 'label': 'Demo — không gọi model'},
                          {'id': 'ollama', 'label': 'Ollama'},
                          {'id': 'anthropic', 'label': 'Anthropic'}],
            'document_formats': FORMATS, 'document_max_bytes': MAX_BYTES}
