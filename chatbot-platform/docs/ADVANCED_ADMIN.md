# Admin nâng cao: pipeline, rule và handler

## Những gì đã chạy

- Parser backend nhận tệp qua `POST /api/admin/documents/parse?filename=...` (body nhị phân, admin token).
  MD/TXT UTF-8, CSV/JSON, DOCX (đoạn và bảng theo thứ tự), XLSX (từng sheet), PDF có lớp text.
  PDF scan cần OCR bên ngoài; tệp có mật khẩu bị từ chối. Parse chưa lưu: kiểm tra rồi Lưu nháp để persist.
- Tìm lexical, BM25, semantic hoặc hybrid. Semantic/hybrid dùng `/api/embed` trên Ollama server đã cấu hình.
  Admin chọn embedding model, trọng số hybrid, chunk size/overlap, ranh giới đoạn, top_k, threshold và ngân sách context.
  Tài liệu lọc theo bot snapshot/chuyên đề trước khi tìm. Dedupe đoạn giống nhau, cắt theo ngân sách ký tự.
- Chunks/vector lưu bền vững trong SQLite theo bot và fingerprint snapshot; restart dùng lại index. Xem PERSISTENT_INDEX.md. Lỗi embedding không âm thầm đổi chiến lược.
- Thư viện 15 khối prompt TVTS: toàn bộ phần nền, các nhánh literal của `_get_system_prompt`, suffix trong chat_modes.
  Script `scripts/port_tvts_rules.py` tạo thư viện và port ResponseCleaner, `_is_score_query` không import runtime TVTS.
  Admin xem, thêm khối (mặc định tắt), chỉnh nội dung rồi bật. Các career_block là nhánh thay thế nhau.
- Hậu xử lý: bỏ artifact, khối gợi ý, metadata, chuẩn hóa ranh giới bảng; chốt fallback giữ một câu.
  Cleaner được port từ nguồn, bỏ token domain UEL trong danh sách nhận diện FAQ, giữ nhận diện URL chung.
- Response rule chọn matcher từ khóa hoặc matcher điểm TVTS có regex; cấu hình chuyên đề miễn áp dụng và câu phản hồi.
- Mỗi chuyên đề có model override và handler_id. Bot cấu hình history_limit 0–30, model timeout 5–180 giây.
- Registry handler thực thi hai loại: static_response và document_lookup. Cấu hình/lựa chọn riêng theo bot.
  Không tự thực thi Python, URL webhook hay công thức do client nhập. Thêm loại mới cần triển khai adapter phía server.

## Thứ tự xử lý

Kiểm tra quyền chọn mode → chọn route/model → rule phản hồi trực tiếp → unmatched policy
→ handler nếu gán → retrieval/fallback → prompt → model → hậu xử lý → links/citations.

Handler document_lookup chạy retrieval dù knowledge_enabled của pipeline LLM đang tắt;
đầu ra là đoạn trích nguyên văn, không chạy cleaner làm thay đổi nguồn. Handler bị tắt nhưng vẫn gán route
sẽ báo lỗi, không tự chuyển sang model. Rule phản hồi trực tiếp vẫn ưu tiên trước handler.

## Giới hạn và phần chưa tương đương TVTS

Thư viện có đủ **khối prompt literal và suffix** trong hai nguồn đã nêu; không có nghĩa đã chuyển toàn bộ logic
LLMService, _build_context_text, RAG enrichment, hội thoại, tính điểm, quiz, đăng ký hoặc email.
Các khối gốc vẫn chứa tên trường, năm, liên hệ và chỉ dẫn panel; admin phải chỉnh theo bot trước bật/publish.
Chưa có bộ tự ghép nhánh TVTS tương đương từng mode, cũng chưa chứng minh chống bịa tương đương bằng LLM thật.

Tìm semantic là adapter Ollama + cosine local, không phải port nguyên Qdrant/FAISS của TVTS.
Đã có index bền vững và background task trong FastAPI sau lưu nháp; chưa có worker/queue độc lập. Tệp được parse đồng bộ trong thread pool;
5 MB/tệp, 200.000 ký tự/tệp, 1 triệu ký tự/bot, 10.000 chunks tối đa.
Chia đoạn theo paragraph chưa bảo đảm giữ trọn bảng dài; phải xem đoạn trong bước kiểm thử.
Parser XLSX đọc giá trị cache công thức, không tính lại công thức Excel.

“Nhiều quyền admin” ở đây là nhiều điều khiển cấu hình, chưa phải hệ thống tài khoản/RBAC mới.
Admin token chung vẫn quản trị tất cả bot. Quy tắc bảo mật hệ thống, giới hạn upload và adapter executable
không được biến thành mã tùy ý qua form.

## Kiểm tra

Tests kiểm tra parser MD/CSV/DOCX/XLSX/PDF text, từ chối PDF rỗng/scan, bảng số 0,
BM25/context budget, semantic với vector giả, bot/route isolation, handler không gọi LLM,
model override/history, matcher TVTS và cleaner. Ollama embedding/LLM thật và browser E2E chưa kiểm chứng.

Cài dependencies mới trong venv backend:

```bash
pip install -r requirements.txt
```

Sau đó restart backend, refresh và đăng nhập lại Studio để lấy catalog/cấu hình đã chuẩn hóa.
