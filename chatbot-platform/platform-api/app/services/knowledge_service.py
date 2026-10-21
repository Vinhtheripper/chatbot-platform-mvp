"""Snapshot-scoped lexical/BM25/semantic retrieval; shared cache contains vectors only."""
import re
import os
import math
import hashlib
import unicodedata
from collections import Counter
import httpx
from ..core.errors import ProviderUnavailable


def token_list(text):
    return re.findall(r'\w{2,}', unicodedata.normalize('NFC', text).casefold())


def tokens(text):
    return set(token_list(text)) - {'là', 'gì', 'của', 'và', 'cho', 'tôi', 'có', 'nào', 'về', 'xin'}


def chunks(document, settings):
    text = document.content
    start = 0
    while start < len(text):
        end = min(start + settings.chunk_size, len(text))
        if settings.chunk_strategy == 'paragraphs' and end < len(text):
            boundary = text.rfind('\n\n', start + settings.chunk_size // 2, end)
            if boundary > start:
                end = boundary
        yield {'id': document.id, 'name': document.name, 'offset': start, 'content': text[start:end]}
        if end == len(text):
            break
        start = max(start + 1, end - settings.overlap)


async def embed(texts, model, bot_id):
    # Document vectors are persisted by IndexService; query vectors are intentionally transient.
    base = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').rstrip('/')
    result = []
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            for start in range(0, len(texts), 32):
                batch = texts[start:start+32]
                response = await client.post(base + '/api/embed', json={'model': model, 'input': batch})
                response.raise_for_status()
                vectors = response.json()['embeddings']
                if len(vectors) != len(batch) or any(not v or any(not math.isfinite(float(x)) for x in v) for v in vectors):
                    raise ValueError('Invalid embedding')
                result.extend([[float(x) for x in vector] for vector in vectors])
        return result
    except (httpx.HTTPError, KeyError, ValueError, TypeError) as exc:
        raise ProviderUnavailable('Không tạo được embedding. Kiểm tra Ollama và embedding model; không tự chuyển sang lexical.') from exc


def cosine(a, b):
    if len(a) != len(b):
        raise ProviderUnavailable('Embedding không đồng nhất chiều vector; kiểm tra model.')
    norm = math.sqrt(sum(x*x for x in a) * sum(y*y for y in b))
    return max(0.0, sum(x*y for x, y in zip(a,b)) / norm) if norm else 0.0


class KnowledgeRetriever:
    def __init__(self, index_service=None):
        self.index_service = index_service

    async def search(self, bot_id, query, config, route=None):
        settings = config.retrieval
        query_tokens = tokens(query)
        if not query_tokens:
            return []
        persisted_vectors = None
        if self.index_service:
            index = await self.index_service.ensure(bot_id, config)
            selected = [(i,c) for i,c in enumerate(index['chunks']) if not c['route_id'] or (route and c['route_id']==route.id)]
            corpus = [c for _,c in selected]
            if index['vectors']:
                persisted_vectors = [index['vectors'][i] for i,_ in selected]
        else:
            corpus = []
            for doc in config.documents:
                if doc.route_id and (not route or doc.route_id != route.id):
                    continue
                for chunk in chunks(doc, settings):
                    corpus.append(chunk)
                    if len(corpus) > 10000:
                        raise ValueError('Vượt 10.000 đoạn: tăng kích thước đoạn hoặc giảm overlap')
        if not corpus:
            return []
        counts = [Counter(token_list(row['content'])) for row in corpus]
        average = sum(sum(c.values()) for c in counts) / len(counts) or 1
        dfs = {token: sum(token in count for count in counts) for token in query_tokens}
        vectors = None
        if settings.strategy in ('semantic', 'hybrid'):
            if persisted_vectors is not None:
                vectors = await embed([query], settings.embedding_model, bot_id) + persisted_vectors
            else:
                vectors = await embed([query] + [r['content'] for r in corpus], settings.embedding_model, bot_id)
        matches = []
        for i, row in enumerate(corpus):
            if settings.strategy == 'lexical':
                score = len(query_tokens & set(counts[i])) / len(query_tokens)
            else:
                raw = sum(math.log(1 + (len(corpus) - dfs[t] + .5)/(dfs[t] + .5)) *
                          counts[i][t] * 2.2 / (counts[i][t] + 1.2*(.25 + .75*sum(counts[i].values())/average))
                          for t in query_tokens)
                score = raw / (1 + raw)
                if vectors:
                    semantic = cosine(vectors[0], vectors[i+1])
                    score = semantic if settings.strategy == 'semantic' else settings.semantic_weight*semantic + (1-settings.semantic_weight)*score
            if score >= settings.min_score:
                matches.append({**row, 'score': score})
        selected, size, seen = [], 0, set()
        for row in sorted(matches, key=lambda r:r['score'], reverse=True):
            digest = hashlib.sha256(row['content'].encode()).hexdigest()
            if digest in seen:
                continue
            remaining = settings.context_max_chars - size
            if remaining <= 0:
                break
            row = {**row, 'content': row['content'][:remaining]}
            selected.append(row); seen.add(digest); size += len(row['content'])
            if len(selected) >= settings.top_k:
                break
        return selected
