# Tích hợp chatbot_config vào platform

`chatbot_config/` là bản nguồn TVTS để đối chiếu, không được import trực tiếp vào runtime mới.
Dự án `n2nai_chatbot_tvts/` và bản nguồn trong `chatbot_config/` không bị sửa/xóa.
Import cả backend TVTS sẽ kéo theo singleton model, thư mục module cố định, dữ liệu và nhánh nghiệp vụ riêng;
đổi tên thư mục không tạo được cách ly nhiều chatbot.

## Đã chuyển sang cấu hình theo bot

| Thành phần | Triển khai mới |
|---|---|
| Cấu hình mặc định bị lặp ở FE | FE lấy `/api/admin/configuration`; defaults dùng BotConfig ở backend |
| Lựa chọn provider bị lặp ở FE | Catalog backend trả các adapter được hỗ trợ; bí mật vẫn ở server |
| Danh sách mode TVTS | Mẫu `app/templates/tvts.json`; mỗi bot lưu bản sao routes riêng |
| Luật grounding/nội suy/làm rõ bậc | Script trích nguyên văn 3 khối từ `_get_system_prompt`; lưu thành prompt_rules, sửa/bật/tắt trên FE |
| Nhận diện câu hỏi để phản hồi cố định | response_rules với keywords/exclude_keywords; trả trước retrieval/provider |
| `_enforce_defer_only` | policy_service.finalize dùng fallback của từng bot; mạnh hơn bản cũ: bỏ cả tiền tố lẫn hậu tố |
| Kho tài liệu cố định theo thư mục module | documents trong snapshot cấu hình bot; tùy chọn route_id; không đọc chéo bot |
| Retrieval stub luôn rỗng | Cắt đoạn, tìm lexical theo query, threshold/top_k; ghép context và trả citations metadata |
| Upload chưa có | Chọn nhiều `.md`/`.txt` UTF-8 trên FE; xem/xóa/gán phạm vi; Lưu nháp để persist |

Luồng: Studio chọn template → tạo bot → sửa prompt/rule/routes → thêm tài liệu → lưu nháp
→ preview → publish snapshot → public chat sử dụng đúng snapshot đó.

Tài liệu chỉ thuộc route sẽ không được truy xuất nếu chưa chọn được route. Auto chưa có classifier:
cần cấu hình keywords trong tab Điều hướng hoặc chọn chuyên đề khi chat.
Mẫu TVTS giữ keywords rỗng để không giả định độ chính xác của bộ định tuyến gốc.

## Dùng ngay

1. Khởi động lại backend, refresh FE, đăng nhập.
2. Chọn “Tuyển sinh — kế thừa rule TVTS” hoặc “Trợ lý dùng chung” rồi Tạo chatbot.
3. Kiểm tra tab Luật trả lời. Với ĐBCL, dùng mẫu chung và thêm luật phù hợp; không mang nguyên luật bậc đào tạo/đậu-rớt sang ĐBCL.
4. Thêm tài liệu bằng tab Tri thức, đặt phạm vi chung/chuyên đề, bật chỉ trả lời khi có tài liệu.
5. Lưu nháp. Demo không thực thi prompt; muốn đánh giá câu trả lời thật phải cấu hình provider và model thật.
6. Chỉ publish sau khi kiểm tra dữ liệu và các câu hỏi gài.

Để trích lại mẫu từ bản nguồn (ghi đè template trên đĩa, không sửa bot đã tạo):

```bash
cd chatbot-platform/backend
python scripts/import_tvts_template.py
```

Template lưu SHA256 nguồn và các thay đổi trong provenance. Không import secrets, không chạy module TVTS,
không tự đưa toàn bộ tài liệu lên chatbot công khai. Các bot đã tạo chỉ đổi khi người quản trị lưu cấu hình của bot đó.

## Phần chưa được chuyển — không tuyên bố tương đương TVTS

- Chưa bê nguyên `_get_system_prompt`, `_build_context_text`, ResponseCleaner, intent classifier và langgraph workflow.
  Prompt chung hiện được tổng hợp lại; chỉ ba khối kể trên và suffix của ba chuyên đề tài liệu được trích nguyên văn.
- `score_handoff` là luật cấu hình đơn giản, không thay toàn bộ `_is_score_query` (regex/ngoại lệ theo mode).
  Phản hồi đã thay bằng thông báo công cụ chưa tích hợp; không dẫn tới panel/URL nội bộ không tồn tại.
- Công thức tính điểm, quiz Holland/MBTI, form đăng ký, email phải được tích hợp thành tool/service có hợp đồng
  input/output và bật theo bot. Hiện không đưa các mode tương ứng vào mẫu để tránh quảng bá tính năng chưa có.
- Local lexical retrieval không tương đương FAISS/Qdrant, embedding, hybrid search hay reranking của TVTS.
  Chưa có parse PDF/DOCX, worker ingest, index hoặc tự đồng bộ thư mục dữ liệu nguồn.
- Snapshot chứa nội dung tài liệu để giữ cách ly draft/public; phù hợp bản local, chưa phải lưu trữ tài liệu lớn.
  Giới hạn 50 tài liệu, 200.000 ký tự/tài liệu, tổng 1 triệu ký tự/bot. Khi mở rộng cần document repository,
  object storage, ingestion job và snapshot manifest bất biến.
- Chưa có workspace RBAC. Public bot và câu trả lời của nó là công khai: không đưa tài liệu nội bộ lên public bot.
- Luật prompt không bảo đảm tuyệt đối model không bịa; guard chỉ xử lý khi có đúng câu fallback hoặc output rỗng.
  Kiểm thử hiện mock provider để chứng minh luồng/cách ly, chưa đánh giá chất lượng LLM thật.

## Kiểm chứng

Tests bao gồm: catalog cần admin; template lấy đúng rule; response rule không gọi LLM; keyword loại trừ;
nguồn không lẫn bot/chuyên đề; draft tài liệu không đổi public; context truyền đến provider; citations;
không lộ rules/documents qua public config; defer guard; validation cấu hình.
