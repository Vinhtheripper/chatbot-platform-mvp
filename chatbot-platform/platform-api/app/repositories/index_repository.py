import json
import time
import uuid
from .bot_repository import Conflict

LEASE_SECONDS = 300


class IndexRepository:
    def __init__(self, repository):
        self.repository = repository
        with repository.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS document_indexes (
                bot_id TEXT NOT NULL, fingerprint TEXT NOT NULL, state TEXT NOT NULL,
                token TEXT, updated_at REAL NOT NULL, error TEXT,
                chunks TEXT, vectors TEXT, dimension INTEGER, progress INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY(bot_id, fingerprint))''')
            columns = {row[1] for row in db.execute("PRAGMA table_info(document_indexes)")}
            if "chunk_count" not in columns:
                db.execute("ALTER TABLE document_indexes ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0")
                db.execute("UPDATE document_indexes SET chunk_count=progress WHERE state='ready'")
            if "serving_ready" not in columns:
                db.execute("ALTER TABLE document_indexes ADD COLUMN serving_ready INTEGER NOT NULL DEFAULT 0")
                db.execute("UPDATE document_indexes SET serving_ready=1 WHERE state='ready'")

    def get(self, bot_id, key, metadata_only=False):
        with self.repository.connect() as db:
            fields = 'bot_id,fingerprint,state,updated_at,error,dimension,progress,serving_ready,chunk_count' if metadata_only else '*'
            row = db.execute(f'SELECT {fields} FROM document_indexes WHERE bot_id=? AND fingerprint=?', (bot_id,key)).fetchone()
        if not row:
            return None
        result = dict(row)
        for field in (() if metadata_only else ('chunks','vectors')):
            result[field] = json.loads(result[field]) if result[field] else []
        result['interrupted'] = result['state'] in ('queued','building') and time.time()-result['updated_at'] > LEASE_SECONDS
        return result

    def reserve(self, bot_id, key, force=False):
        now = time.time()
        with self.repository.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT state,updated_at FROM document_indexes WHERE bot_id=? AND fingerprint=?', (bot_id,key)).fetchone()
            if row:
                if row['state'] in ('queued','building') and now-row['updated_at'] <= LEASE_SECONDS:
                    return None
                if row['state']=='ready' and not force:
                    return None
                if row['state']=='error' and not force:
                    return None
            token = uuid.uuid4().hex
            db.execute('''INSERT INTO document_indexes(bot_id,fingerprint,state,token,updated_at,progress)
                          VALUES(?,?,'queued',?,?,0) ON CONFLICT(bot_id,fingerprint) DO UPDATE SET
                          state='queued',token=excluded.token,updated_at=excluded.updated_at,error=NULL,progress=0''',
                       (bot_id,key,token,now))
            return token

    def heartbeat(self, bot_id, key, token, progress):
        with self.repository.connect() as db:
            return db.execute("UPDATE document_indexes SET state='building',progress=?,updated_at=? WHERE bot_id=? AND fingerprint=? AND token=?",
                              (progress,time.time(),bot_id,key,token)).rowcount > 0

    def finish(self, bot_id, key, token, chunks, vectors):
        with self.repository.connect() as db:
            return db.execute('''UPDATE document_indexes SET state='ready',serving_ready=1,chunks=?,vectors=?,dimension=?,
                updated_at=?,error=NULL,progress=?,chunk_count=?,token=NULL WHERE bot_id=? AND fingerprint=? AND token=?''',
                (json.dumps(chunks,ensure_ascii=False),json.dumps(vectors),len(vectors[0]) if vectors else None,
                 time.time(),len(chunks),len(chunks),bot_id,key,token)).rowcount > 0

    def fail(self, bot_id, key, token, error):
        with self.repository.connect() as db:
            db.execute("UPDATE document_indexes SET state='error',error=?,updated_at=?,token=NULL WHERE bot_id=? AND fingerprint=? AND token=?",
                       (error,time.time(),bot_id,key,token))

    def prune(self, bot_id):
        # Read current heads and delete in one write transaction: never prune a newly published head.
        from ..schemas import BotConfig
        from ..services.index_identity import fingerprint
        with self.repository.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT draft,published FROM bots WHERE id=?',(bot_id,)).fetchone()
            if not row:
                raise KeyError(bot_id)
            keep = [fingerprint(BotConfig.model_validate_json(row[field])) for field in ('draft','published') if row[field]]
            placeholders = ','.join('?' for _ in keep)
            return db.execute(f'DELETE FROM document_indexes WHERE bot_id=? AND fingerprint NOT IN ({placeholders})',
                              [bot_id,*keep]).rowcount
