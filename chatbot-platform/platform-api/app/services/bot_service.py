from ..core.errors import BotNotPublished
from ..schemas import BotConfig
from .chat_service import answer
from .knowledge_service import KnowledgeRetriever
from ..repositories.bot_repository import Conflict


class BotService:
    """Bot lifecycle and draft/public boundaries, independent of HTTP."""

    def __init__(self, repository, index_service):
        self.repository = repository
        self.index_service = index_service
        self.retriever = KnowledgeRetriever(index_service)

    def list(self):
        rows = self.repository.list()
        for row in rows:
            row['draft'] = BotConfig.model_validate(row['draft']).model_dump()
        return rows

    def create(self, config):
        return self.repository.create(config.model_dump())

    def save(self, bot_id, payload):
        bot = self.repository.save(bot_id, payload.expected_revision, payload.config.model_dump())
        self.index_service.repository.prune(bot_id)
        return bot

    def publish(self, bot_id, payload):
        current = self.repository.get(bot_id)
        if current['revision'] != payload.expected_revision:
            raise Conflict('Bản nháp đã thay đổi. Tải lại trước khi publish.')
        config = BotConfig.model_validate(current['draft'])
        needs_index = config.knowledge_enabled or any(h.enabled and h.kind == 'document_lookup' for h in config.handlers)
        if needs_index and config.documents and not self.index_service.status(bot_id,config)['serving_ready']:
            raise Conflict('Index của bản nháp chưa sẵn sàng. Xây index thành công trước khi xuất bản.')
        bot = self.repository.publish(bot_id, payload.expected_revision)
        self.index_service.repository.prune(bot_id)
        bot['draft'] = BotConfig.model_validate(bot['draft']).model_dump()
        return bot

    def published(self, bot_id):
        bot = self.repository.get(bot_id)
        if bot['published'] is None:
            raise BotNotPublished('Chatbot chưa publish')
        return bot

    def public_config(self, bot_id):
        bot = self.published(bot_id)
        config = bot['published']
        return {'id': bot_id, 'name': config['name'], 'description': config['description'],
                'theme': config['theme'], 'features': BotConfig.model_validate(config).features.model_dump(), 'revision': bot['published_revision'],
                'routes': [{'id': r['id'], 'label': r['label']} for r in config['routes']]}

    async def preview(self, bot_id, request):
        config = self.repository.get(bot_id)['draft']
        return await answer(bot_id, BotConfig.model_validate(config), request, self.retriever)

    async def chat(self, bot_id, request):
        bot = self.published(bot_id)
        result = await answer(bot_id, BotConfig.model_validate(bot['published']), request, self.retriever)
        return {**result, 'revision': bot['published_revision']}

    def index_status(self, bot_id):
        bot = self.repository.get(bot_id)
        return {field: {'revision': bot['revision'] if field=='draft' else bot['published_revision'],
                        **self.index_service.status(bot_id,BotConfig.model_validate(bot[field]))}
                if bot[field] else None for field in ('draft','published')}

    def queue_index(self, bot, tasks, force=False):
        config = BotConfig.model_validate(bot['draft'])
        token = self.index_service.reserve(bot['id'],config,force)
        if token:
            tasks.add_task(self.index_service.build,bot['id'],config,token)
        return token
