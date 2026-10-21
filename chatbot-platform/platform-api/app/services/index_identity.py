"""Content-addressed identity; prompt/ranking changes do not invalidate document embeddings."""
import hashlib
import json
import os


def fingerprint(config):
    settings = config.retrieval
    vector = settings.strategy in ('semantic', 'hybrid')
    spec = {'version': 1, 'documents': [d.model_dump() for d in config.documents],
            'chunk_size': settings.chunk_size, 'overlap': settings.overlap,
            'chunk_strategy': settings.chunk_strategy,
            'embedding': {'provider': 'ollama',
                          'base': os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').rstrip('/'),
                          'model': settings.embedding_model, 'revision': settings.embedding_revision} if vector else None}
    return hashlib.sha256(json.dumps(spec, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
