import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from .repositories.bot_repository import Repository, Conflict
from .services.bot_service import BotService
from .repositories.index_repository import IndexRepository
from .services.index_service import IndexService
from .core.errors import BotNotPublished, ProviderUnavailable
from .modules import admin, public, health, configuration


def create_app(db_path=None):
    app = FastAPI(title='Chatbot Platform Skeleton', version='0.1.0')
    repo = Repository(db_path or os.getenv('PLATFORM_DB', str(Path(__file__).parent.parent / 'data/platform.sqlite3')))
    app.state.repo = repo
    app.state.bot_service = BotService(repo, IndexService(IndexRepository(repo)))

    @app.exception_handler(KeyError)
    async def missing(_, exc):
        return JSONResponse(status_code=404, content={'detail': 'Không tìm thấy chatbot'})

    @app.exception_handler(Conflict)
    async def conflict(_, exc):
        return JSONResponse(status_code=409, content={'detail': str(exc)})

    @app.exception_handler(BotNotPublished)
    async def unpublished(_, exc):
        return JSONResponse(status_code=404, content={'detail': str(exc)})

    @app.exception_handler(ValueError)
    async def invalid(_, exc):
        return JSONResponse(status_code=422, content={'detail': str(exc)})

    @app.exception_handler(ProviderUnavailable)
    async def unavailable(_, exc):
        return JSONResponse(status_code=503, content={'detail': str(exc)})

    for router in (health.router, configuration.router, admin.router, public.router):
        app.include_router(router)
    return app


app = create_app()
