from ..schemas import BotConfig
from .routing_service import resolve_route
from .knowledge_service import KnowledgeRetriever
from .prompt_service import build_prompt
from .policy_service import match_response
from .handler_service import resolve_handler


async def inspect_config(bot_id, config, request, retriever=None):
    retriever = retriever or KnowledgeRetriever()
    config = BotConfig.model_validate(config)
    route = resolve_route(config, request)
    if route and route.model_override:
        config = config.model_copy(update={'model':route.model_override})
    rule = match_response(config, request.message, route)
    handler = resolve_handler(config, route) if not rule else None
    docs = await retriever.search(bot_id, request.message, config, route) if config.knowledge_enabled or (handler and handler.kind == 'document_lookup') else []
    branch = ('mode_disabled' if request.mode != 'auto' and not config.features.allow_mode_selection else
              'response_rule' if rule else
              'unmatched_route' if not route and config.routes and config.routing.unmatched == 'fallback' else
              'handler_' + handler.kind if handler else
              'no_context' if config.knowledge_enabled and not docs else
              'demo' if config.model.provider == 'demo' else 'provider')
    warnings = []
    if config.knowledge_enabled and not config.documents:
        warnings.append('Đã bật kiểm tra tài liệu nhưng chưa có tài liệu.')
    if config.documents and not config.knowledge_enabled:
        warnings.append('Có tài liệu nhưng chưa bật truy xuất: model sẽ không đọc tài liệu.')
    if any(not any(k.strip() for k in r.keywords) for r in config.routes):
        warnings.append('Có chuyên đề không có từ khóa; auto sẽ không chọn chuyên đề đó.')
    if config.model.provider == 'demo':
        warnings.append('Demo không thực thi prompt hoặc sinh câu trả lời từ tài liệu.')
    return {'branch': branch, 'route': route.id if route else None,
            'rule': rule.id if rule else None,
            'documents': docs, 'prompt': build_prompt(config, route, docs),
            'warnings': warnings, 'calls_model': False, 'embedding_strategy': config.retrieval.strategy,
            'handler': handler.id if handler else None, 'effective_model': config.model.model_dump()}
