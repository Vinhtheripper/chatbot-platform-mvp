# Cấu hình chatbot theo 8 bước

1. **Thông tin:** tên, mô tả, mã bot và link public sau xuất bản.
2. **Tài liệu:** chọn MD/TXT/CSV/JSON/PDF/DOCX/XLSX → kiểm tra nội dung → chọn phạm vi chung/chuyên đề → Lưu nháp.
   Khi chưa tạo chuyên đề, giữ tài liệu dùng chung; có thể quay lại gán sau bước 5.
   Bật truy xuất để model đọc tài liệu. Cấu hình nâng cao: chunk_size/overlap theo ký tự, top_k và tỷ lệ từ khóa khớp.
3. **Prompt & câu mẫu:** vai trò, đối tượng, phạm vi, giọng điệu, định dạng; cặp hỏi–đáp làm mẫu; model/provider;
   system prompt nền và câu fallback. Câu mẫu không được coi là tài liệu chứa dữ kiện.
4. **Luật trả lời:** prompt rules, phản hồi cố định theo từ khóa/loại trừ, chốt chỉ giữ câu fallback.
5. **Điều hướng:** từ khóa, thứ tự ưu tiên (nút lên/xuống), chỉ dẫn chuyên đề và xử lý không khớp.
6. **Tính năng & link:** bật tên nguồn, cho phép chọn chuyên đề, câu hỏi mở đầu, nút liên kết.
   URL http/https được nhập bởi admin, backend chèn action theo điều kiện luôn hiện/fallback/chuyên đề;
   FE mở URL trong tab mới, không tự gửi thông tin hoặc thực thi API.
7. **Giao diện:** màu, lời chào, gợi ý ô nhập.
8. **Kiểm thử & xuất bản:** nhập câu hỏi và mode; kiểm tra nhánh/nguồn/prompt từ bản nháp đã lưu;
   thử câu trả lời ở preview; xuất bản khi đã rà soát. Không có trạng thái tự đánh dấu “AI đạt” chỉ dựa trên retrieval.

Nút Trước/Tiếp tục chỉ đổi bước, không tự lưu. Lưu nháp để persist; đổi bot khi có thay đổi sẽ hỏi xác nhận bỏ thay đổi.
API `POST /api/admin/bots/{id}/inspect` cần admin token, không gọi model và không công khai prompt.
Runtime: chọn route → rule phản hồi trực tiếp → chính sách không khớp → retrieval/fallback → prompt → model → guard → nút link.

Pipeline đã mở rộng parser Office/PDF và BM25/semantic/hybrid; xem ADVANCED_ADMIN.md. Semantic/hybrid có thể gọi embedding ngay ở bước inspect.
Tính điểm/quiz/email chưa có backend tool; chỉ có thể tạo link tới hệ thống đang tồn tại.
Chưa có browser E2E hoặc đánh giá LLM thật; tests API kiểm tra cách ly nguồn, inspect, rule, URL và điều hướng.
