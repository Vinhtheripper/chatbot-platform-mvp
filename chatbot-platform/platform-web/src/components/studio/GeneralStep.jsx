import React from "react";
import Field from "../common/Field";

export default function GeneralStep({
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
      <h2>Danh tính của trợ lý</h2>
      <p className="muted">
        Mỗi chatbot có cấu hình và phiên bản publish độc lập.
      </p>
      <Field label="Tên chatbot">
        <input
          value={form.name}
          onChange={(e) => patch("name", e.target.value)}
        />
      </Field>
      <Field label="Mô tả">
        <textarea
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
        />
      </Field>
      <Field label="Bot ID">
        <input readOnly value={selected.id} />
      </Field>
      {selected.published && (
        <a
          className="public-link"
          href={`/chat/${selected.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Mở chatbot đã publish ↗
        </a>
      )}
      <p className="muted">
        Bản nháp không làm thay đổi chatbot public cho đến khi bấm Publish.
      </p>
    </>
  );
}
