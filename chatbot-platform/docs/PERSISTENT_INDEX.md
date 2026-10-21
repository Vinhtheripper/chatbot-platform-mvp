# Chỉ mục tài liệu bền vững

## Lưu trữ và cách ly

`document_indexes` trong SQLite hiện có lưu chunks, route_id, vector, chiều vector, trạng thái,
progress và thông tin lỗi. Dữ liệu còn sau restart. Truy vấn semantic chỉ tạo embedding câu hỏi;
không tạo lại embedding tài liệu nếu có index phù hợp đã sẵn sàng.

Khóa `(bot_id, fingerprint)` cách ly bot. Fingerprint gồm nội dung/ID/tên/phạm vi tài liệu,
chunk size/overlap/strategy, embedding server/model và embedding_revision. Prompt, top_k,
ngưỡng lọc và trọng số hybrid không thay đổi vector nên không bắt buộc rebuild.

Mỗi bản nháp/published xác định index từ snapshot cấu hình bất biến được đọc ở đầu request.
Hai phiên bản có cùng tài liệu/cách lập chỉ mục được dùng chung index trong cùng bot.
Khi sửa hoặc xóa tài liệu, index mới chỉ chứa tài liệu còn trong bản nháp.
Index cũ vẫn phục vụ published; sau publish bản mới, index không còn thuộc hai snapshot được dọn.
Dọn dữ liệu đọc hai đầu snapshot và xóa trong cùng transaction để tránh race với save/publish.

Đổi tên embedding model hoặc embedding_revision tạo fingerprint mới. Tất cả vector trong một index
phải cùng chiều; query khác chiều trả 503. Phải dùng tên/digest model ổn định: hệ thống không tự phát hiện
thay trọng số ở provider nếu giữ nguyên tên và chiều vector. Khi thay như vậy, đổi embedding_revision.

## Luồng admin

- Tạo bot/Lưu nháp: reserve index, trả response và chạy background task trong process FastAPI.
- GET `/api/admin/bots/{id}/index`: trạng thái riêng của draft/published và revision tương ứng.
- POST `/api/admin/bots/{id}/index/rebuild` với `expected_revision`: xây lại/thử lại bản nháp.
- Cần admin token. Revision đã đổi bị trả 409. Một build cùng bot/fingerprint chỉ có một lease.
- Chỉ publish cấu hình cần tài liệu khi index đã sẵn sàng. Không có tài liệu vẫn có thể publish bot fallback.
- Bot cũ chưa có index được xây khi tìm lần đầu hoặc qua nút Xây lại. Không chọn một index khác để thay thế khi lỗi.

Trạng thái: missing → queued → building → ready/error. UI tự cập nhật mỗi 3 giây tại bước Tài liệu
và Kiểm thử. Build lỗi giữ lỗi để admin thử lại, không tự lặp gọi provider mỗi câu hỏi.
Rebuild cùng fingerprint vẫn phục vụ dữ liệu sẵn sàng trước đó; hoàn tất swap payload nguyên tử.
Nếu rebuild thất bại, bản sẵn sàng trước vẫn dùng được và admin thấy lỗi của lần xây lại.

## Gián đoạn và giới hạn

Lease heartbeat được cập nhật giữa các batch embedding. Sau 5 phút không cập nhật, UI hiển thị
“Xử lý bị gián đoạn”; admin có thể thử lại, hoặc truy vấn đầu tiên tái lập khi chưa có bản sẵn sàng.
Token generation ngăn worker cũ ghi đè kết quả worker mới. Backend restart không tự resume toàn bộ hàng đợi:
job nền hiện thuộc process, chưa có worker/queue riêng. Index đã ready không bị ảnh hưởng.

Đây là index bền vững local trong SQLite, chưa phải Qdrant/FAISS ANN. Tìm cosine/BM25 vẫn quét các đoạn
đúng phạm vi; phù hợp giới hạn tài liệu hiện tại. Sao lưu cùng file database cấu hình. Các nội dung đã xóa khỏi
snapshot hiện hành được dọn khỏi bảng index khi không còn published tham chiếu; không tuyên bố xóa vật lý khỏi
backup hoặc các trang trống trong SQLite.

## Kiểm chứng

Tests: dùng lại chunks/vectors sau khởi tạo app mới; chỉ embed query; cách ly bot; sửa/xóa draft giữ published;
publish dọn index cũ; đổi model và chiều vector; từ chối query sai chiều; build lỗi/chặn publish/retry;
lease gián đoạn và worker cũ; vẫn phục vụ khi rebuild; xác thực admin và optimistic revision.
Embedding provider được mock trong tests, chưa benchmark Ollama thật hoặc độ trễ trên tập tài liệu lớn.
