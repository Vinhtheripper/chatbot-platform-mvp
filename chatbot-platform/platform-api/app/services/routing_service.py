def resolve_route(config, request):
    route = None
    if request.mode != 'auto':
        route = next((r for r in config.routes if r.id == request.mode), None)
        if route is None:
            raise ValueError('Chuyên đề không tồn tại trong phiên bản chatbot này')
    else:
        # Stable rule: first configured matching route wins. Never route to an unrelated bot.
        route = next((r for r in config.routes if any(k.strip() and k.strip().casefold() in request.message.casefold() for k in r.keywords)), None)
    return route
