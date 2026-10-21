from .routing_service import resolve_route
from .knowledge_service import KnowledgeRetriever
from .prompt_service import build_prompt
from .provider_service import generate
from .policy_service import match_response, finalize
from .handler_service import resolve_handler, run_handler


async def _answer(bot_id, config, request, retriever):
    route = resolve_route(config, request)
    if route and route.model_override:
        config = config.model_copy(update={'model': route.model_override})
    meta = {'resolved_route': route.id if route else None, 'citations': [], 'provider': config.model.provider}
    rule = match_response(config, request.message, route)
    if rule:
        return {**meta, 'response': rule.response, 'reason': 'response_rule'}
    if route is None and config.routes and config.routing.unmatched == 'fallback':
        return {**meta, 'response': config.fallback_message, 'reason': 'unmatched_route'}
    handler = resolve_handler(config, route)
    if handler:
        return {**meta, **await run_handler(bot_id, config, request, route, handler, retriever)}
    documents = await retriever.search(bot_id, request.message, config, route) if config.knowledge_enabled else []
    if config.knowledge_enabled and not documents:
        return {**meta, 'response': config.fallback_message, 'reason': 'no_context'}
    system = build_prompt(config, route, documents)
    if config.model.provider == 'demo':
        return {**meta, 'response': f'[DEMO — không gọi mô hình]\nBot: {config.name}\nChuyên đề: {route.label if route else "Chung"}\nModel: {config.model.name}\nĐã nhận: {request.message}', 'reason': 'demo'}
    text = await generate(config, request, system)
    return {**meta, 'response': finalize(config, text), 'reason': 'generated',
            'citations': [{'id': d['id'], 'name': d['name'], 'offset': d['offset']} for d in documents]}


async def answer(bot_id, config, request, retriever=None):
    retriever = retriever or KnowledgeRetriever()
    if request.mode != 'auto' and not config.features.allow_mode_selection:
        raise ValueError('Chatbot chỉ cho phép điều hướng tự động')
    history = request.history[-config.history_limit:] if config.history_limit else []
    request = request.model_copy(update={'history': history})
    result = await _answer(bot_id, config, request, retriever)
    if not result['reason'].startswith('handler_document'):
        result['response'] = finalize(config, result['response'])
    fallback = result['response'] == config.fallback_message
    result['actions'] = [{'id': link.id, 'label': link.label, 'url': link.url} for link in config.links
                         if link.enabled and (link.when == 'always' or
                         (link.when == 'fallback' and fallback) or
                         (link.when == 'route' and link.route_id == result['resolved_route']))]
    if not config.features.show_sources:
        result['citations'] = []
    return result
