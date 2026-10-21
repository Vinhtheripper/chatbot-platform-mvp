from fastapi import APIRouter

router = APIRouter(tags=['Health'])


@router.get('/api/health')
def health():
    return {'status': 'ok'}
