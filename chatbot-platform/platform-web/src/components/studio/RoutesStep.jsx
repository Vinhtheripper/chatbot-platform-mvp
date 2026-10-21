import React from "react";
import Icon from "../common/Icon";
import Field from "../common/Field";
import { RouteExecution } from "../AdvancedSettings";

export default function RoutesStep({
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
      <Field label="Khi không có chuyên đề khớp">
        <select
          value={form.routing.unmatched}
          onChange={(e) => nested("routing", "unmatched", e.target.value)}
        >
          <option value="general">
            Dùng prompt chung và tài liệu dùng chung
          </option>
          <option value="fallback">
            Trả câu thiếu thông tin, không gọi model
          </option>
        </select>
      </Field>
      <h2>Chuyên đề & điều hướng</h2>
      <p className="muted">
        Auto chọn chuyên đề đầu tiên có từ khóa khớp, không phân biệt hoa
        thường. Không khớp thì áp dụng lựa chọn phía trên. Thứ tự danh sách là
        thứ tự ưu tiên.
      </p>
      {!form.routes.length && (
        <div className="inline-empty">
          <Icon name="routes" size={28} />
          <strong>Chưa có chuyên đề</strong>
          <p>Thêm chuyên đề để trợ lý chọn đúng hướng trả lời.</p>
        </div>
      )}
      {form.routes.map((r, i) => (
        <article className="route" key={i}>
          <div className="two">
            <Field
              label="ID kỹ thuật"
              hint="Dùng chữ thường, số và dấu gạch dưới; tên hiển thị bên cạnh dành cho người dùng."
            >
              <input
                value={r.id}
                onChange={(e) => routeChange(i, "id", e.target.value)}
              />
            </Field>
            <Field label="Tên hiển thị">
              <input
                value={r.label}
                onChange={(e) => routeChange(i, "label", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Từ khóa (phân tách bằng dấu phẩy)">
            <input
              value={r.keywords.join(",")}
              onChange={(e) =>
                routeChange(i, "keywords", e.target.value.split(","))
              }
            />
          </Field>
          <div className="actions">
            <button
              className="secondary"
              disabled={i === 0}
              onClick={() => {
                const rows = [...form.routes];
                [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                patch("routes", rows);
              }}
            >
              ↑ Ưu tiên cao hơn
            </button>
            <button
              className="secondary"
              disabled={i === form.routes.length - 1}
              onClick={() => {
                const rows = [...form.routes];
                [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
                patch("routes", rows);
              }}
            >
              ↓ Ưu tiên thấp hơn
            </button>
          </div>
          <RouteExecution
            route={r}
            index={i}
            form={form}
            routeChange={routeChange}
            catalog={catalog}
          />
          <Field label="Hướng dẫn bổ sung">
            <textarea
              value={r.instruction}
              onChange={(e) => routeChange(i, "instruction", e.target.value)}
            />
          </Field>
          <button className="secondary" onClick={() => deleteRoute(i)}>
            Xóa chuyên đề
          </button>
        </article>
      ))}
      <button
        className="secondary"
        onClick={() =>
          patch("routes", [
            ...form.routes,
            {
              id: `topic_${Date.now()}`,
              label: "Chuyên đề mới",
              keywords: [],
              instruction: "",
            },
          ])
        }
      >
        ＋ Thêm chuyên đề
      </button>
    </>
  );
}
