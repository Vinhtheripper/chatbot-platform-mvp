# Rà soát module Chatbot Platform

## Đã có và giới hạn thực tế

| Module | Trạng thái | Nơi xử lý / giới hạn |
|---|---|---|
| Admin bot | Có | modules/admin.py → services/bot_service.py: tạo, danh sách, lưu nháp, publish, preview |
| Public bot | Có | modules/public.py → bot_service.py: chỉ đọc snapshot published; không trả prompt/model bí mật |
| Cấu hình | Có | schemas.py: model, prompt, route, theme, validation |
| Lưu cấu hình | Có | repositories/bot_repository.py: SQLite, optimistic revision; không có toàn bộ lịch sử |
| Chat | Cơ bản | services/chat_service.py: JSON một lần; history do client gửi |
| Điều hướng | Cơ bản | routing_service.py: mode trực tiếp hoặc từ khóa đầu tiên khớp, chưa có classifier |
| Prompt & rule | Cấu hình theo bot | Template TVTS, prompt rules, response rules, defer guard; xem TVTS_INTEGRATION.md |
| Provider | Có adapter | provider_service.py: Ollama/Anthropic; cần kiểm chứng với provider thật; demo ở chat_service.py không gọi LLM |
| Tri thức | Local cơ bản | Thêm MD/TXT trên FE, snapshot tài liệu, lexical retrieval theo bot/route, context + citations; chưa có vector RAG |
| Bảo vệ admin | Local | core/security.py: token chung, chưa có tài khoản/phân quyền |
| Studio | Cơ bản | 5 tab cấu hình, preview, publish; hamburger mở/đóng sidebar và Escape |
| Health | Có | modules/health.py: kiểm tra ứng dụng sống, chưa kiểm tra dependency |

## Luồng và ranh giới module

```text
Admin UI → modules/admin → BotService → Repository → SQLite
Preview → BotService đọc draft → ChatService
Public UI → modules/public → BotService đọc published → ChatService
ChatService → RoutingService → KnowledgeRetriever
            → không có nguồn khi bật knowledge: fallback
            → PromptService → ProviderService → trả response
```

Router chỉ nhận/kiểm tra hợp đồng HTTP và gọi service. Service xử lý nghiệp vụ;
repository quản lý truy vấn/lưu trữ. main.py ghép các thành phần và ánh xạ lỗi.
Các đường dẫn API và vị trí database cũ được giữ để FE và dữ liệu đang có tiếp tục dùng.

## Module còn thiếu, theo thứ tự đề xuất

| Ưu tiên | Module | Cần bổ sung và tích hợp |
|---|---|---|
| 1 | Tài khoản/workspace/RBAC | Đăng nhập, quyền chủ sở hữu/người sửa/người xem; áp dụng quyền từ API đến repository và retrieval |
| 1 | Knowledge ingestion | Upload, kiểm tra định dạng/dung lượng, metadata nguồn và quyền, parse/chunk/embed, worker + trạng thái job, xóa/reindex |
| 1 | RAG có nguồn | Chỉ mục theo bot/workspace, retrieval theo quyền, ghép context, citations, tiêu chí thiếu căn cứ; không chỉ thay search() |
| 1 | Kiểm thử chatbot | Bộ câu hỏi theo bot, kiểm thử routing/retrieval/câu trả lời và câu gài; lưu kết quả trước publish |
| 1 | Quản trị vận hành | Rate limit, quota, timeout, audit log, theo dõi lỗi/latency/token/cost; secret store phía server |
| 2 | Hội thoại | Session ID, lưu tin nhắn server, quyền truy cập, thời hạn lưu/xóa, feedback; không tin history client như dữ liệu có thẩm quyền |
| 2 | Phiên bản & phê duyệt | Lịch sử cấu hình, diff, rollback, publish có duyệt, archive/xóa bot |
| 2 | Streaming | SSE, hủy request, reconnect, xử lý lỗi và lưu hội thoại khi stream bị ngắt |
| 2 | Tích hợp | Connector tài liệu/hệ thống trường, đồng bộ theo lịch và quyền nguồn; giới hạn tool được gọi theo bot |
| 3 | Template & giao diện | Mẫu TVTS/ĐBCL, logo, Markdown an toàn, widget nhúng, tùy biến bố cục |
| 3 | Danh mục model | Allowlist theo workspace, kiểm tra kết nối, cấu hình quota và chính sách chuyển provider |

Các dòng “còn thiếu” là kế hoạch, chưa được tạo API hoặc màn hình giả để coi như đã hoàn thành.
Frontend hiện vẫn tập trung trong main.jsx; khi phát triển tiếp nên tách pages, components,
features/bots, features/knowledge và features/conversations theo nghiệp vụ.

Chi tiết cập nhật tích hợp nguồn TVTS: [TVTS_INTEGRATION.md](TVTS_INTEGRATION.md). Upload MD/TXT local đã có; ingestion job/PDF/DOCX/vector index vẫn chưa triển khai.
