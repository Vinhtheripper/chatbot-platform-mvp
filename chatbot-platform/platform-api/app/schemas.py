"""Configuration contract shared by admin and runtime; no provider secrets here."""
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class ModelConfig(BaseModel):
    provider: Literal['demo', 'ollama', 'anthropic'] = 'demo'
    name: str = Field(default='demo', min_length=1, max_length=150)
    temperature: float = Field(default=0.2, ge=0, le=1)
    timeout_seconds: int = Field(default=60, ge=5, le=180)
    max_tokens: int = Field(default=1024, ge=64, le=8192)

class Theme(BaseModel):
    primary_color: str = Field(default='#2563eb', pattern=r'^#[0-9a-fA-F]{6}$')
    welcome: str = Field(default='Xin chào! Tôi có thể giúp gì cho bạn?', max_length=1000)
    placeholder: str = Field(default='Nhập câu hỏi của bạn…', max_length=150)

class PromptRule(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=150)
    instruction: str = Field(min_length=1, max_length=24000)
    enabled: bool = True

class ResponseRule(BaseModel):
    matcher: Literal['keywords', 'tvts_score'] = 'keywords'
    excluded_routes: list[str] = Field(default_factory=list, max_length=20)
    id: str = Field(min_length=1, max_length=80)
    keywords: list[str] = Field(default_factory=list, max_length=100)
    exclude_keywords: list[str] = Field(default_factory=list, max_length=100)
    response: str = Field(min_length=1, max_length=8000)
    enabled: bool = True

class KnowledgeDocument(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=200000)
    route_id: str | None = None

class RetrievalConfig(BaseModel):
    chunk_size: int = Field(default=1600, ge=200, le=8000)
    overlap: int = Field(default=200, ge=0, le=2000)
    top_k: int = Field(default=4, ge=1, le=12)
    strategy: Literal['lexical', 'bm25', 'semantic', 'hybrid'] = 'lexical'
    embedding_revision: str = Field(default='1', min_length=1, max_length=100)
    embedding_model: str = Field(default='nomic-embed-text', min_length=1, max_length=150)
    semantic_weight: float = Field(default=0.5, ge=0, le=1)
    context_max_chars: int = Field(default=16000, ge=1000, le=60000)
    chunk_strategy: Literal['characters', 'paragraphs'] = 'characters'
    min_score: float = Field(default=0.3, gt=0, le=1)

    @model_validator(mode='after')
    def valid_overlap(self):
        if self.overlap >= self.chunk_size:
            raise ValueError('Overlap phải nhỏ hơn chunk size')
        return self

class Route(BaseModel):
    id: str = Field(min_length=1, max_length=60, pattern=r'^[a-z0-9_-]+$')
    label: str = Field(min_length=1, max_length=120)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    instruction: str = Field(default='', max_length=24000)
    model_override: ModelConfig | None = None
    handler_id: str | None = None

class PromptProfile(BaseModel):
    role: str = Field(default='', max_length=2000)
    audience: str = Field(default='', max_length=2000)
    scope: str = Field(default='', max_length=4000)
    tone: str = Field(default='Rõ ràng, chuyên nghiệp, thân thiện.', max_length=1000)
    format: str = Field(default='Trả lời trực tiếp, giữ đúng số liệu trong nguồn.', max_length=2000)

class AnswerExample(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=4000)

class ActionLink(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=2000)
    when: Literal['always', 'fallback', 'route'] = 'fallback'
    route_id: str | None = None
    enabled: bool = True

    @model_validator(mode='after')
    def valid_url(self):
        from urllib.parse import urlsplit
        url = urlsplit(self.url)
        if url.scheme not in ('https', 'http') or not url.hostname or url.username or url.password or any(c.isspace() for c in self.url):
            raise ValueError('Liên kết phải là URL http/https đầy đủ, không chứa thông tin đăng nhập')
        return self

class ChatFeatures(BaseModel):
    show_sources: bool = True
    allow_mode_selection: bool = True
    starter_questions: list[str] = Field(default_factory=list, max_length=6)

class RoutingConfig(BaseModel):
    unmatched: Literal['general', 'fallback'] = 'general'

class PostprocessingConfig(BaseModel):
    remove_artifacts: bool = False
    remove_suggestions: bool = False
    strip_topic_metadata: bool = False
    normalize_tables: bool = True

class HandlerConfig(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    kind: Literal['static_response', 'document_lookup']
    enabled: bool = True
    response: str = Field(default='', max_length=8000)

class BotConfig(BaseModel):
    name: str = Field(default='Trợ lý mới', min_length=1, max_length=100)
    description: str = Field(default='', max_length=500)
    model: ModelConfig = Field(default_factory=ModelConfig)
    system_prompt: str = Field(default='Bạn là trợ lý hữu ích. Trả lời bằng tiếng Việt. Không tự tạo dữ kiện khi thiếu căn cứ.', min_length=1, max_length=16000)
    fallback_message: str = Field(default='Chưa có đủ tài liệu để trả lời câu hỏi này.', min_length=1, max_length=1000)
    theme: Theme = Field(default_factory=Theme)
    routes: list[Route] = Field(default_factory=list, max_length=20)
    knowledge_enabled: bool = False
    prompt_rules: list[PromptRule] = Field(default_factory=list, max_length=30)
    response_rules: list[ResponseRule] = Field(default_factory=list, max_length=30)
    enforce_defer_only: bool = True
    documents: list[KnowledgeDocument] = Field(default_factory=list, max_length=50)
    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)
    prompt_profile: PromptProfile = Field(default_factory=PromptProfile)
    answer_examples: list[AnswerExample] = Field(default_factory=list, max_length=10)
    links: list[ActionLink] = Field(default_factory=list, max_length=20)
    features: ChatFeatures = Field(default_factory=ChatFeatures)
    routing: RoutingConfig = Field(default_factory=RoutingConfig)
    postprocessing: PostprocessingConfig = Field(default_factory=PostprocessingConfig)
    handlers: list[HandlerConfig] = Field(default_factory=list, max_length=20)
    history_limit: int = Field(default=10, ge=0, le=30)

    @model_validator(mode='after')
    def unique_routes(self):
        ids = [r.id for r in self.routes]
        if len(ids) != len(set(ids)):
            raise ValueError('ID chuyên đề phải duy nhất')
        for collection in (self.prompt_rules, self.response_rules, self.documents, self.links, self.handlers):
            identifiers = [item.id for item in collection]
            if len(identifiers) != len(set(identifiers)):
                raise ValueError('ID rule/tài liệu phải duy nhất')
        if any(doc.route_id and doc.route_id not in ids for doc in self.documents):
            raise ValueError('Chuyên đề của tài liệu không tồn tại')
        if any(link.when == 'route' and link.route_id not in ids for link in self.links):
            raise ValueError('Liên kết theo chuyên đề phải chọn chuyên đề tồn tại')
        if any(route not in ids for rule in self.response_rules for route in rule.excluded_routes):
            raise ValueError('Chuyên đề loại trừ của rule không tồn tại')
        handlers = {h.id: h for h in self.handlers}
        if any(r.handler_id and r.handler_id not in handlers for r in self.routes):
            raise ValueError('Handler của chuyên đề không tồn tại')
        if any(h.kind == 'static_response' and not h.response.strip() for h in self.handlers):
            raise ValueError('Handler phản hồi cố định phải có nội dung')
        self.features.starter_questions = [q.strip() for q in self.features.starter_questions if q.strip()]
        if any(not q.strip() or len(q) > 300 for q in self.features.starter_questions):
            raise ValueError('Câu hỏi gợi ý phải có 1–300 ký tự')
        if any(not doc.content.strip() or '\x00' in doc.content for doc in self.documents):
            raise ValueError('Tài liệu phải có nội dung văn bản, không chứa ký tự NUL')
        if sum(len(doc.content) for doc in self.documents) > 1000000:
            raise ValueError('Tổng tài liệu tối đa 1 triệu ký tự mỗi bot trong bản local')
        return self

class SaveDraft(BaseModel):
    expected_revision: int = Field(ge=1)
    config: BotConfig

class Publish(BaseModel):
    expected_revision: int = Field(ge=1)

class Turn(BaseModel):
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=8000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    history: list[Turn] = Field(default_factory=list, max_length=30)
    mode: str = Field(default='auto', max_length=60)
