import React from "react";
import Icon from "../common/Icon";
import Field from "../common/Field";
import IndexStatus from "../IndexStatus";
import { RetrievalSettings } from "../AdvancedSettings";

export default function KnowledgeStep({
  form,
  selected,
  catalog,
  dirty,
  busy,
  patch,
  nested,
  routeChange,
  deleteRoute,
  upload,
  publish,
}) {
  return (
    <>
      <IndexStatus
        botId={selected.id}
        revision={selected.revision}
        dirty={dirty}
        busy={busy}
      />
      <h2>Tài liệu của chatbot</h2>
      <p className="muted">
        Chọn tệp → kiểm tra nội dung/phạm vi → Lưu nháp → kiểm tra nguồn ở bước
        8. Chỉ xuất hiện ở chatbot công khai sau khi xuất bản. Backend chuyển
        tệp sang văn bản. PDF scan cần OCR trước; bảng Office cần kiểm tra lại
        sau chuyển đổi.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={form.knowledge_enabled}
          onChange={(e) => patch("knowledge_enabled", e.target.checked)}
        />{" "}
        Chỉ gọi model khi tìm được tài liệu phù hợp
      </label>
      <Field
        label="Thêm tài liệu (MD, TXT, CSV, JSON, PDF, DOCX, XLSX)"
        hint="Tối đa 50 tài liệu, 200.000 ký tự/tài liệu và 1 triệu ký tự/bot. Tối đa 5 MB/tệp; cấu hình cách tìm tài liệu bên dưới."
      >
        <input
          type="file"
          accept={catalog.document_formats.join(",")}
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files);
            e.target.value = "";
            upload(files);
          }}
        />
      </Field>
      {!form.documents.length && (
        <div className="inline-empty">
          <Icon name="book" size={28} />
          <strong>Chưa có tài liệu</strong>
          <p>Thêm tài liệu của phòng ban để chatbot có nguồn tham khảo.</p>
        </div>
      )}
      {form.documents.map((doc, i) => (
        <article className="route" key={doc.id}>
          <strong>{doc.name}</strong>
          <small>{doc.content.length.toLocaleString()} ký tự</small>
          <Field label="Phạm vi tài liệu">
            <select
              value={doc.route_id || ""}
              onChange={(e) =>
                patch(
                  "documents",
                  form.documents.map((d, j) =>
                    j === i ? { ...d, route_id: e.target.value || null } : d,
                  ),
                )
              }
            >
              <option value="">Dùng chung trong bot này</option>
              {form.routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <details>
            <summary>Xem nội dung</summary>
            <pre className="document-content">{doc.content}</pre>
          </details>
          <button
            className="secondary"
            onClick={() =>
              patch(
                "documents",
                form.documents.filter((_, j) => i !== j),
              )
            }
          >
            Xóa tài liệu khỏi bản nháp
          </button>
        </article>
      ))}
      <RetrievalSettings form={form} nested={nested} />
      <details>
        <summary>Cấu hình truy xuất nâng cao</summary>
        <p className="muted">
          Kích thước và chồng lấp tính bằng ký tự; ngưỡng là điểm theo chiến
          lược đã chọn, không phải độ tin cậy AI.
        </p>
        <div className="two">
          {[
            ["chunk_size", "Kích thước đoạn", 200, 8000, 1],
            ["overlap", "Phần chồng lấp", 0, 2000, 1],
            ["top_k", "Số đoạn tối đa", 1, 12, 1],
            ["min_score", "Ngưỡng khớp từ khóa", 0.01, 1, 0.01],
          ].map(([key, label, min, max, step]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={form.retrieval[key]}
                onChange={(e) =>
                  nested("retrieval", key, Number(e.target.value))
                }
              />
            </Field>
          ))}
        </div>
      </details>
    </>
  );
}
