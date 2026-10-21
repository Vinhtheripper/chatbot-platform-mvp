import React from "react";
import Field from "../common/Field";

export default function DesignStep({
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
      <h2>Giao diện chatbot</h2>
      <p className="muted">
        Tạo dấu ấn riêng. Thay đổi sẽ hiển thị ngay trong khung xem trước.
      </p>
      <Field label="Màu chủ đạo">
        <input
          type="color"
          value={form.theme.primary_color}
          onChange={(e) => nested("theme", "primary_color", e.target.value)}
        />
      </Field>
      <Field label="Lời chào">
        <textarea
          value={form.theme.welcome}
          onChange={(e) => nested("theme", "welcome", e.target.value)}
        />
      </Field>
      <Field label="Gợi ý ô nhập">
        <input
          value={form.theme.placeholder}
          onChange={(e) => nested("theme", "placeholder", e.target.value)}
        />
      </Field>
    </>
  );
}
