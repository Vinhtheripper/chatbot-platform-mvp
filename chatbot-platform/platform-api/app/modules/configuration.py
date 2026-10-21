from fastapi import APIRouter, Depends, Request, HTTPException
from ..core.security import require_admin
from ..services.configuration_service import catalog

router = APIRouter(prefix='/api/admin', tags=['Configuration'], dependencies=[Depends(require_admin)])


@router.get('/configuration')
def configuration():
    return catalog()


@router.post('/documents/parse')
async def parse_upload(request: Request, filename: str):
    from ..services.ingestion_service import MAX_BYTES, parse_document
    from starlette.concurrency import run_in_threadpool
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, 'Tệp vượt giới hạn 5 MB')
    return {'document': await run_in_threadpool(parse_document, filename, bytes(data)),
            'warnings': ['Kiểm tra bảng, ký tự và thứ tự nội dung sau chuyển đổi trước khi lưu.']}
