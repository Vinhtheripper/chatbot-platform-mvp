import React from "react";
import Field from "../common/Field";
import { PromptDetails } from "../ConfigurationSteps";

export default function ModelStep({
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
      <PromptDetails form={form} patch={patch} nested={nested} />
      <hr />
      <h2>Model & luật trả lời</h2>
      <Field label="Provider">
        <select
          value={form.model.provider}
          onChange={(e) => nested("model", "provider", e.target.value)}
        >
          {catalog.providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Model ID"
        hint="Nhập model đã có trên provider. API key được cấu hình trên backend."
      >
        <input
          value={form.model.name}
          onChange={(e) => nested("model", "name", e.target.value)}
        />
      </Field>
      <div className="two">
        <Field label="Temperature (0–1)">
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={form.model.temperature}
            onChange={(e) =>
              nested("model", "temperature", Number(e.target.value))
            }
          />
        </Field>
        <Field label="Max output tokens">
          <input
            type="number"
            min="64"
            max="8192"
            value={form.model.max_tokens}
            onChange={(e) =>
              nested("model", "max_tokens", Number(e.target.value))
            }
          />
        </Field>
      </div>
      <div className="two">
        <Field label="Số tin nhắn lịch sử gửi model (0–30)">
          <input
            type="number"
            min="0"
            max="30"
            value={form.history_limit}
            onChange={(e) => patch("history_limit", Number(e.target.value))}
          />
        </Field>
        <Field label="Timeout model (giây)">
          <input
            type="number"
            min="5"
            max="180"
            value={form.model.timeout_seconds}
            onChange={(e) =>
              nested("model", "timeout_seconds", Number(e.target.value))
            }
          />
        </Field>
      </div>
      <Field
        label="System prompt nền (nâng cao)"
        hint="Ghép trước vai trò/phạm vi → câu mẫu → luật bật → hướng dẫn chuyên đề → fallback và tài liệu. Xem bản ghép tại bước Kiểm thử."
      >
        <textarea
          className="prompt"
          value={form.system_prompt}
          onChange={(e) => patch("system_prompt", e.target.value)}
        />
      </Field>
      <Field label="Thông báo khi thiếu tài liệu">
        <textarea
          value={form.fallback_message}
          onChange={(e) => patch("fallback_message", e.target.value)}
        />
      </Field>
    </>
  );
}
