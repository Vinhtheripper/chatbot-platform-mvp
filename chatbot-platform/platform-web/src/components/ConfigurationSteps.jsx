import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { inspectBot } from "../store/slices/diagnosticsSlice.js";
const Field = ({ label, children, hint }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export function PromptDetails({ form, patch, nested }) {
  return (
    <>
      <h2>Thiết kế cách trả lời</h2>
      <p className="muted">
        Các trường này được ghép cùng system prompt, luật đang bật và hướng dẫn
        chuyên đề. Câu mẫu chỉ hướng dẫn cách trình bày, không thay tài liệu.
      </p>
      {[
        [
          "role",
          "Vai trò của trợ lý",
          "Ví dụ: Trợ lý của phòng Đảm bảo chất lượng",
        ],
        ["audience", "Đối tượng phục vụ", "Giảng viên, cán bộ, sinh viên…"],
        [
          "scope",
          "Phạm vi và giới hạn",
          "Được trả lời vấn đề gì? Khi nào cần chuyển chuyên viên?",
        ],
        ["tone", "Giọng điệu", "Ngắn gọn, trang trọng, dễ hiểu…"],
        [
          "format",
          "Cấu trúc câu trả lời",
          "Ví dụ: kết luận → các bước thực hiện → lưu ý",
        ],
      ].map(([key, label, hint]) => (
        <Field key={key} label={label} hint={hint}>
          <textarea
            value={form.prompt_profile[key]}
            onChange={(e) => nested("prompt_profile", key, e.target.value)}
          />
        </Field>
      ))}
      <h2>Câu hỏi – câu trả lời mẫu</h2>
      {form.answer_examples.map((item, i) => (
        <article className="route" key={i}>
          {[
            ["question", "Câu hỏi mẫu"],
            ["answer", "Cách trả lời mong muốn"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <textarea
                value={item[key]}
                onChange={(e) =>
                  patch(
                    "answer_examples",
                    form.answer_examples.map((x, j) =>
                      j === i ? { ...x, [key]: e.target.value } : x,
                    ),
                  )
                }
              />
            </Field>
          ))}
          <button
            className="secondary"
            onClick={() =>
              patch(
                "answer_examples",
                form.answer_examples.filter((_, j) => j !== i),
              )
            }
          >
            Xóa câu mẫu
          </button>
        </article>
      ))}
      <button
        className="secondary"
        disabled={form.answer_examples.length >= 10}
        onClick={() =>
          patch("answer_examples", [
            ...form.answer_examples,
            {
              question: "Câu hỏi ví dụ",
              answer: "Cách trả lời dựa trên tài liệu.",
            },
          ])
        }
      >
        ＋ Thêm câu mẫu
      </button>
    </>
  );
}

export function FeatureSettings({ form, patch, nested }) {
  const update = (i, key, value) =>
    patch(
      "links",
      form.links.map((link, j) => (j === i ? { ...link, [key]: value } : link)),
    );
  return (
    <>
      <h2>Tính năng trong khung chat</h2>
      {[
        ["show_sources", "Hiển thị tên nguồn tài liệu đã dùng"],
        ["allow_mode_selection", "Cho người dùng tự chọn chuyên đề"],
      ].map(([key, label]) => (
        <label className="check" key={key}>
          <input
            type="checkbox"
            checked={form.features[key]}
            onChange={(e) => nested("features", key, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <Field
        label="Câu hỏi gợi ý khi bắt đầu"
        hint="Mỗi dòng một câu, tối đa 6 câu. Người dùng bấm để điền vào ô chat."
      >
        <textarea
          value={form.features.starter_questions.join("\n")}
          onChange={(e) =>
            nested("features", "starter_questions", e.target.value.split("\n"))
          }
        />
      </Field>
      <h2>Nút liên kết trong câu trả lời</h2>
      <p className="muted">
        Hệ thống chèn nút theo cấu hình, không nhờ model tự tạo URL. Nút chỉ mở
        trang đích, không gọi API hoặc tự gửi thông tin người dùng.
      </p>
      {form.links.map((link, i) => (
        <article className="route" key={link.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={link.enabled}
              onChange={(e) => update(i, "enabled", e.target.checked)}
            />{" "}
            Bật liên kết
          </label>
          <Field label="Tên nút">
            <input
              value={link.label}
              onChange={(e) => update(i, "label", e.target.value)}
            />
          </Field>
          <Field label="Địa chỉ đích đầy đủ (https://…)">
            <input
              type="url"
              value={link.url}
              onChange={(e) => update(i, "url", e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Khi nào hiển thị?">
            <select
              value={link.when}
              onChange={(e) => update(i, "when", e.target.value)}
            >
              <option value="fallback">
                Khi thiếu thông tin / từ chối chuẩn
              </option>
              <option value="always">Sau mọi câu trả lời</option>
              <option value="route">Theo chuyên đề</option>
            </select>
          </Field>
          {link.when === "route" && (
            <Field label="Chuyên đề">
              <select
                value={link.route_id || ""}
                onChange={(e) => update(i, "route_id", e.target.value || null)}
              >
                <option value="">Chọn chuyên đề</option>
                {form.routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button
            className="secondary"
            onClick={() =>
              patch(
                "links",
                form.links.filter((_, j) => j !== i),
              )
            }
          >
            Xóa liên kết
          </button>
        </article>
      ))}
      <button
        className="secondary"
        disabled={form.links.length >= 20}
        onClick={() =>
          patch("links", [
            ...form.links,
            {
              id: crypto.randomUUID(),
              label: "Liên hệ chuyên viên",
              url: "",
              when: "fallback",
              route_id: null,
              enabled: true,
            },
          ])
        }
      >
        ＋ Thêm liên kết
      </button>
      <div className="notice">
        Công cụ tính điểm, bài trắc nghiệm và gửi email chưa được tích hợp. Bạn
        có thể dẫn tới trang công cụ đã có bằng liên kết ở trên.
      </div>
    </>
  );
}

export function Inspection({ bot, form, dirty, onPublish, busy }) {
  const [query, setQuery] = useState(""),
    [mode, setMode] = useState("auto");
  const dispatch = useDispatch(),
    request = useRef(null);
  const entry = useSelector(
    (state) => state.diagnostics.inspections[`${bot.id}:${bot.revision}`],
  );
  const result = entry?.data,
    error = entry?.error,
    loading = entry?.status === "pending";
  useEffect(() => () => request.current?.abort(), []);
  function inspect() {
    request.current = dispatch(
      inspectBot({ botId: bot.id, revision: bot.revision, query, mode }),
    );
  }
  return (
    <>
      <h2>Kiểm tra trước khi xuất bản</h2>
      <p className="muted">
        Kiểm tra này không gọi model sinh câu trả lời; semantic/hybrid có thể
        gọi embedding. Bạn sẽ thấy nhánh xử lý, tài liệu tìm được và prompt thực
        tế của bản nháp đã lưu. Dùng khung chat để thử câu trả lời.
      </p>
      <div className="notice">
        {form.documents.length} tài liệu · {form.routes.length} chuyên đề ·{" "}
        {form.prompt_rules.filter((r) => r.enabled).length} luật prompt ·{" "}
        {form.answer_examples.length} câu mẫu ·{" "}
        {form.links.filter((l) => l.enabled).length} liên kết
      </div>
      <Field label="Câu hỏi kiểm tra">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập một câu hỏi thực tế…"
        />
      </Field>
      <Field label="Chế độ">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="auto">Tự động</option>
          {form.routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <button
        disabled={dirty || loading || busy || !query.trim()}
        onClick={inspect}
      >
        {loading ? "Đang kiểm tra…" : "Kiểm tra điều hướng & nguồn"}
      </button>
      {dirty && (
        <p className="muted">Lưu nháp trước khi kiểm tra hoặc xuất bản.</p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && (
        <div className="inspection">
          <p>
            <strong>Nhánh xử lý:</strong> {result.branch} · Chuyên đề:{" "}
            {result.route || "Chung"} · Rule: {result.rule || "Không có"} ·
            Handler: {result.handler || "Mặc định"} · Model:{" "}
            {result.effective_model?.name}
          </p>
          {result.warnings.map((warning, i) => (
            <p className="notice" key={i}>
              {warning}
            </p>
          ))}
          <h2>{result.documents.length} đoạn tài liệu khớp</h2>
          {result.documents.map((doc, i) => (
            <details key={i}>
              <summary>
                {doc.name} · vị trí {doc.offset} · khớp{" "}
                {Math.round(doc.score * 100)}% từ khóa
              </summary>
              <pre className="document-content">{doc.content}</pre>
            </details>
          ))}
          <details>
            <summary>Xem prompt ghép đầy đủ (chỉ admin)</summary>
            <pre className="document-content">{result.prompt}</pre>
          </details>
          <small>
            Đây là các nguồn ứng viên. Nhánh phản hồi trực tiếp/từ chối không
            gọi model dù có nguồn khớp.
          </small>
        </div>
      )}
      <hr />
      <p className="muted">
        Xuất bản sẽ đưa cấu hình và tài liệu đã lưu ra chatbot công khai. Kết
        quả kiểm tra nguồn không đánh giá độ đúng của câu trả lời LLM.
      </p>
      <button disabled={dirty || busy} onClick={onPublish}>
        Xuất bản bản nháp v{bot.revision}
      </button>
    </>
  );
}
