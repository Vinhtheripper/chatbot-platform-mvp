from fastapi import APIRouter, Depends
from ..core.dependencies import get_bot_service
from ..schemas import ChatRequest
from ..services.bot_service import BotService

router = APIRouter(prefix='/api/bots', tags=['Public chat'])


@router.get('/{bot_id}')
def config(bot_id: str, service: BotService = Depends(get_bot_service)):
    return service.public_config(bot_id)


@router.post('/{bot_id}/chat')
async def chat(bot_id: str, payload: ChatRequest, service: BotService = Depends(get_bot_service)):
    return await service.chat(bot_id, payload)
