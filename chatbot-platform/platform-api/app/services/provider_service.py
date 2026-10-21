import os
import httpx
from ..core.errors import ProviderUnavailable


async def generate(config, request, system):
    messages = [t.model_dump() for t in request.history] + [{'role': 'user', 'content': request.message}]
    try:
        async with httpx.AsyncClient(timeout=config.model.timeout_seconds) as client:
            if config.model.provider == 'ollama':
                # Endpoint is server-owned to avoid arbitrary URLs/SSRF in admin configuration.
                base = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').rstrip('/')
                response = await client.post(base + '/api/chat', json={
                    'model': config.model.name, 'stream': False,
                    'messages': [{'role': 'system', 'content': system}] + messages,
                    'options': {'temperature': config.model.temperature, 'num_predict': config.model.max_tokens},
                })
                response.raise_for_status()
                text = response.json()['message']['content']
            else:
                key = os.getenv('ANTHROPIC_API_KEY')
                if not key:
                    raise ProviderUnavailable('Chưa cấu hình ANTHROPIC_API_KEY trên backend.')
                response = await client.post('https://api.anthropic.com/v1/messages',
                    headers={'x-api-key': key, 'anthropic-version': '2023-06-01'},
                    json={'model': config.model.name, 'system': system, 'messages': messages,
                          'max_tokens': config.model.max_tokens, 'temperature': config.model.temperature})
                response.raise_for_status()
                text = ''.join(b.get('text', '') for b in response.json()['content'] if b.get('type') == 'text')
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise ProviderUnavailable('Không lấy được phản hồi từ provider. Kiểm tra model và cấu hình backend.') from exc
    return text
