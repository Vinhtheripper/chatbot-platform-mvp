"""Executable allowlist. Admin config selects handlers, never uploads Python or arbitrary URLs."""
from .knowledge_service import KnowledgeRetriever


async def static_response(bot_id, config, request, route, handler, retriever):
    return {'response': handler.response, 'citations': [], 'reason': 'handler_static_response'}


async def document_lookup(bot_id, config, request, route, handler, retriever):
    documents = await retriever.search(bot_id, request.message, config, route)
    return {'response': '\n\n'.join(d['content'] for d in documents) or config.fallback_message,
            'citations': [{'id':d['id'], 'name':d['name'], 'offset':d['offset']} for d in documents],
            'reason': 'handler_document_lookup' if documents else 'no_context'}


HANDLERS = {'static_response': static_response, 'document_lookup': document_lookup}


def resolve_handler(config, route):
    if not route or not route.handler_id:
        return None
    handler = next((h for h in config.handlers if h.id == route.handler_id), None)
    if not handler or not handler.enabled:
        raise ValueError('Handler của chuyên đề đang tắt hoặc không tồn tại')
    return handler


async def run_handler(bot_id, config, request, route, handler, retriever):
    return await HANDLERS[handler.kind](bot_id, config, request, route, handler, retriever)
