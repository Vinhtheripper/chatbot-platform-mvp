import React from "react";
import Field from "../common/Field";
import { RuleLibrary } from "../AdvancedSettings";

export default function RulesStep({
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
      <RuleLibrary
        catalog={catalog}
        form={form}
        patch={patch}
        nested={nested}
      />
      <h2>Luật trả lời theo chatbot</h2>
      <p className="muted">
        Luật prompt hướng dẫn mô hình. Luật phản hồi trực tiếp chạy bằng mã
        trước khi tìm tài liệu hoặc gọi mô hình; luật khớp đầu tiên được chọn.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={form.enforce_defer_only}
          onChange={(e) => patch("enforce_defer_only", e.target.checked)}
        />{" "}
        Khi có câu từ chối chuẩn, chỉ giữ đúng câu đó
      </label>
      <h2>Luật trong prompt</h2>
      {form.prompt_rules.map((rule, i) => (
        <article className="route" key={rule.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) =>
                patch(
                  "prompt_rules",
                  form.prompt_rules.map((r, j) =>
                    j === i ? { ...r, enabled: e.target.checked } : r,
                  ),
                )
              }
            />{" "}
            Bật luật
          </label>
          <Field label="Tên luật">
            <input
              value={rule.label}
              onChange={(e) =>
                patch(
                  "prompt_rules",
                  form.prompt_rules.map((r, j) =>
                    j === i ? { ...r, label: e.target.value } : r,
                  ),
                )
              }
            />
          </Field>
          <Field label="Nội dung">
            <textarea
              className="prompt"
              value={rule.instruction}
              onChange={(e) =>
                patch(
                  "prompt_rules",
                  form.prompt_rules.map((r, j) =>
                    j === i ? { ...r, instruction: e.target.value } : r,
                  ),
                )
              }
            />
          </Field>
          <button
            className="secondary"
            onClick={() =>
              patch(
                "prompt_rules",
                form.prompt_rules.filter((_, j) => i !== j),
              )
            }
          >
            Xóa luật
          </button>
        </article>
      ))}
      <button
        className="secondary"
        onClick={() =>
          patch("prompt_rules", [
            ...form.prompt_rules,
            {
              id: crypto.randomUUID(),
              label: "Luật mới",
              instruction: "Chỉ trả lời theo tài liệu được cung cấp.",
              enabled: true,
            },
          ])
        }
      >
        ＋ Thêm luật prompt
      </button>
      <h2 className="rule-section">Phản hồi trực tiếp</h2>
      {form.response_rules.map((rule, i) => (
        <article className="route" key={rule.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) =>
                patch(
                  "response_rules",
                  form.response_rules.map((r, j) =>
                    j === i ? { ...r, enabled: e.target.checked } : r,
                  ),
                )
              }
            />{" "}
            Bật luật
          </label>
          <Field label="Cách nhận diện">
            <select
              value={rule.matcher || "keywords"}
              onChange={(e) =>
                patch(
                  "response_rules",
                  form.response_rules.map((r, j) =>
                    j === i ? { ...r, matcher: e.target.value } : r,
                  ),
                )
              }
            >
              <option value="keywords">Từ khóa cấu hình</option>
              <option value="tvts_score">
                Bộ nhận diện điểm xét tuyển TVTS (gồm regex)
              </option>
            </select>
          </Field>
          <Field label="Không áp dụng ở chuyên đề (giữ Ctrl/Cmd để chọn nhiều)">
            <select
              multiple
              value={rule.excluded_routes || []}
              onChange={(e) =>
                patch(
                  "response_rules",
                  form.response_rules.map((r, j) =>
                    j === i
                      ? {
                          ...r,
                          excluded_routes: Array.from(
                            e.target.selectedOptions,
                            (o) => o.value,
                          ),
                        }
                      : r,
                  ),
                )
              }
            >
              {form.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.label}
                </option>
              ))}
            </select>
          </Field>
          {[
            ["keywords", "Từ khóa kích hoạt"],
            ["exclude_keywords", "Từ khóa loại trừ"],
          ].map(([key, label]) => (
            <Field key={key} label={label + " (phân tách dấu phẩy)"}>
              <input
                value={rule[key].join(",")}
                onChange={(e) =>
                  patch(
                    "response_rules",
                    form.response_rules.map((r, j) =>
                      j === i ? { ...r, [key]: e.target.value.split(",") } : r,
                    ),
                  )
                }
              />
            </Field>
          ))}
          <Field label="Câu trả lời cố định">
            <textarea
              value={rule.response}
              onChange={(e) =>
                patch(
                  "response_rules",
                  form.response_rules.map((r, j) =>
                    j === i ? { ...r, response: e.target.value } : r,
                  ),
                )
              }
            />
          </Field>
          <button
            className="secondary"
            onClick={() =>
              patch(
                "response_rules",
                form.response_rules.filter((_, j) => i !== j),
              )
            }
          >
            Xóa luật
          </button>
        </article>
      ))}
      <button
        className="secondary"
        onClick={() =>
          patch("response_rules", [
            ...form.response_rules,
            {
              id: crypto.randomUUID(),
              keywords: [],
              exclude_keywords: [],
              response: form.fallback_message,
              enabled: true,
            },
          ])
        }
      >
        ＋ Thêm phản hồi trực tiếp
      </button>
    </>
  );
}
