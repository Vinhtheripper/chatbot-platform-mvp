from fastapi import Request


def get_bot_service(request: Request):
    return request.app.state.bot_service
