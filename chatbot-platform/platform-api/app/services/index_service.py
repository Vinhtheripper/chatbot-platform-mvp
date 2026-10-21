import logging
import math
from ..core.errors import ProviderUnavailable
from .index_identity import fingerprint

log = logging.getLogger(__name__)


class IndexService:
    def __init__(self, repository):
        self.repository = repository

    def status(self, bot_id, config):
        key = fingerprint(config)
        record = self.repository.get(bot_id,key,metadata_only=True)
        return {'fingerprint':key,'state':('interrupted' if record['interrupted'] else record['state']) if record else 'missing',
                'chunk_count':record['chunk_count'] if record and record['serving_ready'] else 0,
                'serving_ready':bool(record and record['serving_ready']),
                'progress':record['progress'] if record else 0,
                'dimension':record['dimension'] if record else None,
                'error':record['error'] if record else None,
                'updated_at':record['updated_at'] if record else None}

    def reserve(self, bot_id, config, force=False):
        return self.repository.reserve(bot_id, fingerprint(config), force)

    async def build(self, bot_id, config, token):
        from .knowledge_service import chunks, embed
        key = fingerprint(config)
        try:
            if not self.repository.heartbeat(bot_id,key,token,0):
                return
            corpus = []
            for document in config.documents:
                for chunk in chunks(document,config.retrieval):
                    corpus.append({**chunk,'route_id':document.route_id})
                    if len(corpus)>10000:
                        raise ValueError('Vượt 10.000 đoạn: tăng chunk size hoặc giảm overlap')
            vectors = []
            if config.retrieval.strategy in ('semantic','hybrid'):
                for start in range(0,len(corpus),32):
                    if not self.repository.heartbeat(bot_id,key,token,start):
                        return
                    batch = await embed([c['content'] for c in corpus[start:start+32]],config.retrieval.embedding_model,bot_id)
                    if len(batch)!=len(corpus[start:start+32]):
                        raise ValueError('Số vector không khớp số đoạn')
                    vectors.extend(batch)
                if vectors and (not vectors[0] or any(len(v)!=len(vectors[0]) or any(not math.isfinite(x) for x in v) for v in vectors)):
                    raise ValueError('Vector không hợp lệ hoặc không đồng nhất chiều')
            self.repository.finish(bot_id,key,token,corpus,vectors)
        except Exception as exc:
            log.exception('Index build failed for bot %s',bot_id)
            message = str(exc) if isinstance(exc,(ValueError,ProviderUnavailable)) else 'Lập chỉ mục thất bại; kiểm tra log backend rồi thử lại.'
            self.repository.fail(bot_id,key,token,message)
        finally:
            self.repository.prune(bot_id)

    async def ensure(self, bot_id, config):
        key = fingerprint(config)
        record = self.repository.get(bot_id,key)
        if record and record['serving_ready']:
            return record
        token = self.reserve(bot_id,config)
        if token:
            await self.build(bot_id,config,token)
        record = self.repository.get(bot_id,key)
        if not record or record['state']!='ready':
            detail = record['error'] if record and record['state']=='error' else 'Index đang xử lý. Thử lại sau hoặc kiểm tra trạng thái trong admin.'
            raise ProviderUnavailable(detail)
        return record
