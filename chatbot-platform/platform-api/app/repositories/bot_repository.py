"""SQLite implementation; replace behind this boundary for MongoDB/Postgres."""
from contextlib import contextmanager
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

class Conflict(Exception):
    pass

class Repository:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS bots (
                id TEXT PRIMARY KEY, draft TEXT NOT NULL, published TEXT,
                revision INTEGER NOT NULL, published_revision INTEGER,
                updated_at TEXT NOT NULL)''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def decode(row):
        if row is None:
            raise KeyError('Không tìm thấy chatbot')
        item = dict(row)
        for key in ('draft', 'published'):
            item[key] = json.loads(item[key]) if item[key] else None
        return item

    def list(self):
        with self.connect() as db:
            return [self.decode(r) for r in db.execute('SELECT * FROM bots ORDER BY updated_at DESC')]

    def get(self, bot_id):
        with self.connect() as db:
            return self.decode(db.execute('SELECT * FROM bots WHERE id=?', (bot_id,)).fetchone())

    def create(self, config):
        bot_id = uuid.uuid4().hex
        with self.connect() as db:
            db.execute('INSERT INTO bots VALUES (?, ?, NULL, 1, NULL, ?)',
                       (bot_id, json.dumps(config, ensure_ascii=False), datetime.now(timezone.utc).isoformat()))
        return self.get(bot_id)

    def save(self, bot_id, revision, config):
        with self.connect() as db:
            count = db.execute('UPDATE bots SET draft=?, revision=revision+1, updated_at=? WHERE id=? AND revision=?',
                               (json.dumps(config, ensure_ascii=False), datetime.now(timezone.utc).isoformat(), bot_id, revision)).rowcount
            if not count:
                raise Conflict('Bản nháp đã thay đổi hoặc bot không tồn tại. Tải lại trước khi lưu.')
        return self.get(bot_id)

    def publish(self, bot_id, revision):
        with self.connect() as db:
            count = db.execute('UPDATE bots SET published=draft, published_revision=revision, updated_at=? WHERE id=? AND revision=?',
                               (datetime.now(timezone.utc).isoformat(), bot_id, revision)).rowcount
            if not count:
                raise Conflict('Bản nháp đã thay đổi. Tải lại trước khi publish.')
        return self.get(bot_id)
