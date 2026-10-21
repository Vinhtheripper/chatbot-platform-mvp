from fastapi import APIRouter, Depends, BackgroundTasks
from ..core.security import require_admin
from ..core.dependencies import get_bot_service
from ..schemas import BotConfig, SaveDraft, Publish, ChatRequest
from ..services.bot_service import BotService

router = APIRouter(prefix='/api/admin/bots', tags=['Admin bots'], dependencies=[Depends(require_admin)])


@router.get('')
def list_bots(service: BotService = Depends(get_bot_service)):
    return service.list()


@router.post('', status_code=201)
def create(config: BotConfig, tasks: BackgroundTasks, service: BotService = Depends(get_bot_service)):
    bot = service.create(config)
    service.queue_index(bot,tasks)
    return bot


@router.put('/{bot_id}/draft')
def save(bot_id: str, payload: SaveDraft, tasks: BackgroundTasks, service: BotService = Depends(get_bot_service)):
    bot = service.save(bot_id,payload)
    service.queue_index(bot,tasks)
    return bot


@router.post('/{bot_id}/publish')
def publish(bot_id: str, payload: Publish, service: BotService = Depends(get_bot_service)):
    return service.publish(bot_id, payload)


@router.post('/{bot_id}/preview')
async def preview(bot_id: str, payload: ChatRequest, service: BotService = Depends(get_bot_service)):
    return await service.preview(bot_id, payload)


@router.post('/{bot_id}/inspect')
async def inspect(bot_id: str, payload: ChatRequest, service: BotService = Depends(get_bot_service)):
    from ..services.inspection_service import inspect_config
    bot = service.repository.get(bot_id)
    return {'revision': bot['revision'], **await inspect_config(bot_id, bot['draft'], payload, service.retriever)}


@router.get('/{bot_id}/index')
def index_status(bot_id: str, service: BotService = Depends(get_bot_service)):
    return service.index_status(bot_id)


@router.post('/{bot_id}/index/rebuild', status_code=202)
def rebuild_index(bot_id: str, payload: Publish, tasks: BackgroundTasks, service: BotService = Depends(get_bot_service)):
    from ..repositories.bot_repository import Conflict
    bot = service.repository.get(bot_id)
    if bot['revision'] != payload.expected_revision:
        raise Conflict('Bản nháp đã đổi. Tải lại trước khi xây index.')
    token = service.queue_index(bot,tasks,force=True)
    return {'queued': bool(token), **service.index_status(bot_id)}
