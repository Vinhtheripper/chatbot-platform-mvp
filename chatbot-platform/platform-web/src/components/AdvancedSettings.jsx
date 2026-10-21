import React, { useState } from "react";
const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

export function RetrievalSettings({ form, nested }) {
  return (
    <>
      <h2>Pipeline tìm tài liệu</h2>
      <Field label="Chiến lược tìm kiếm">
        <select
          value={form.retrieval.strategy}
          onChange={(e) => nested("retrieval", "strategy", e.target.value)}
        >
          <option value="lexical">Khớp tỷ lệ từ khóa (local)</option>
          <option value="bm25">BM25 — xếp hạng từ khóa (local)</option>
          <option value="semantic">Semantic — embedding Ollama</option>
          <option value="hybrid">Hybrid — BM25 + embedding Ollama</option>
        </select>
      </Field>
      {["semantic", "hybrid"].includes(form.retrieval.strategy) && (
        <>
          <Field label="Embedding model đã cài trên Ollama">
            <input
              value={form.retrieval.embedding_model}
              onChange={(e) =>
                nested("retrieval", "embedding_model", e.target.value)
              }
            />
          </Field>
          <Field label="Phiên bản embedding">
            <input
              value={form.retrieval.embedding_revision}
              onChange={(e) =>
                nested("retrieval", "embedding_revision", e.target.value)
              }
            />
          </Field>
          <p className="muted">
            Đổi phiên bản khi thay trọng số model nhưng giữ nguyên tên. Nên dùng
            tên model cố định cho mỗi bộ trọng số. Tài liệu và câu hỏi sẽ được
            gửi tới Ollama do server cấu hình. Lần đầu có thể chậm; lỗi
            embedding sẽ được báo, không âm thầm đổi chiến lược.
          </p>
        </>
      )}
      {form.retrieval.strategy === "hybrid" && (
        <Field label="Trọng số semantic (0–1)">
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={form.retrieval.semantic_weight}
            onChange={(e) =>
              nested("retrieval", "semantic_weight", Number(e.target.value))
            }
          />
        </Field>
      )}
      <Field label="Cách chia đoạn">
        <select
          value={form.retrieval.chunk_strategy}
          onChange={(e) =>
            nested("retrieval", "chunk_strategy", e.target.value)
          }
        >
          <option value="characters">Theo số ký tự</option>
          <option value="paragraphs">Ưu tiên ranh giới đoạn văn</option>
        </select>
      </Field>
      <Field label="Ngân sách ngữ cảnh (ký tự)">
        <input
          type="number"
          min="1000"
          max="60000"
          value={form.retrieval.context_max_chars}
          onChange={(e) =>
            nested("retrieval", "context_max_chars", Number(e.target.value))
          }
        />
      </Field>
      <p className="muted">
        Điểm lọc phụ thuộc chiến lược, không phải xác suất đúng của câu trả lời.
        Kiểm tra nguồn ở bước 8 sau khi thay đổi.
      </p>
    </>
  );
}

export function RuleLibrary({ catalog, form, patch, nested }) {
  const [chosen, setChosen] = useState("");
  const blocks = catalog.rule_packs.flatMap((pack) => pack.blocks);
  const block = blocks.find((b) => b.id === chosen);
  return (
    <>
      <h2>Thư viện rule TVTS từ mã gốc</h2>
      <p className="muted">
        Các khối career_block là những nhánh thay thế nhau. Không bật tất cả
        cùng lúc. Kiểm tra tên trường, năm, liên hệ và chỉ dẫn panel trong nội
        dung trước khi dùng.
      </p>
      <Field label="Chọn khối để xem và thêm">
        <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">Chọn khối luật…</option>
          {blocks.map((b) => (
            <option value={b.id} key={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      {block && (
        <>
          <pre className="document-content">{block.instruction}</pre>
          <button
            className="secondary"
            disabled={
              form.prompt_rules.some((r) => r.id === block.id) ||
              form.prompt_rules.length >= 30
            }
            onClick={() =>
              patch("prompt_rules", [
                ...form.prompt_rules,
                {
                  id: block.id,
                  label: block.label,
                  instruction: block.instruction,
                  enabled: false,
                },
              ])
            }
          >
            Thêm vào bot (đang tắt, cần rà soát)
          </button>
        </>
      )}
      <h2 className="rule-section">Hậu xử lý câu trả lời</h2>
      {[
        ["remove_artifacts", "Bỏ chỉ dẫn hình/tờ rơi còn sót"],
        ["remove_suggestions", "Bỏ khối gợi ý theo logic TVTS"],
        ["strip_topic_metadata", "Bỏ nhãn Topic/Section"],
        ["normalize_tables", "Tách đoạn văn khỏi bảng Markdown"],
      ].map(([key, label]) => (
        <label className="check" key={key}>
          <input
            type="checkbox"
            checked={form.postprocessing[key]}
            onChange={(e) => nested("postprocessing", key, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <p className="muted">
        Cấu hình này thay đổi đầu ra bằng mã; nên thử với bảng và câu trả lời
        mẫu. Bản trích tài liệu của handler giữ nguyên văn.
      </p>
      <hr />
    </>
  );
}

export function HandlerSettings({ catalog, form, patch }) {
  const update = (i, key, value) =>
    patch(
      "handlers",
      form.handlers.map((h, j) => (j === i ? { ...h, [key]: value } : h)),
    );
  return (
    <>
      <h2>Handler/tool của bot</h2>
      <p className="muted">
        Tạo handler tại đây, sau đó gán cho chuyên đề ở bước Điều hướng. Rule
        phản hồi trực tiếp vẫn được ưu tiên trước handler. Hai handler hiện có
        không gọi LLM.
      </p>
      {form.handlers.map((h, i) => (
        <article className="route" key={h.id}>
          <Field label="Tên handler">
            <input
              value={h.label}
              onChange={(e) => update(i, "label", e.target.value)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => update(i, "enabled", e.target.checked)}
            />{" "}
            Bật handler
          </label>
          <Field label="Loại xử lý">
            <select
              value={h.kind}
              onChange={(e) => update(i, "kind", e.target.value)}
            >
              {catalog.handler_types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          {h.kind === "static_response" && (
            <Field label="Câu trả lời">
              <textarea
                value={h.response}
                onChange={(e) => update(i, "response", e.target.value)}
              />
            </Field>
          )}
          <button
            className="secondary"
            disabled={form.routes.some((r) => r.handler_id === h.id)}
            onClick={() =>
              patch(
                "handlers",
                form.handlers.filter((_, j) => i !== j),
              )
            }
          >
            Xóa handler
          </button>
          {form.routes.some((r) => r.handler_id === h.id) && (
            <small>Bỏ gán handler ở chuyên đề trước khi xóa.</small>
          )}
        </article>
      ))}
      <button
        className="secondary"
        disabled={form.handlers.length >= 20}
        onClick={() =>
          patch("handlers", [
            ...form.handlers,
            {
              id: crypto.randomUUID(),
              label: "Handler mới",
              kind: "document_lookup",
              enabled: true,
              response: "",
            },
          ])
        }
      >
        ＋ Tạo handler
      </button>
      <hr />
    </>
  );
}

export function RouteExecution({ route, index, form, routeChange, catalog }) {
  return (
    <>
      <Field label="Handler cho chuyên đề">
        <select
          value={route.handler_id || ""}
          onChange={(e) =>
            routeChange(index, "handler_id", e.target.value || null)
          }
        >
          <option value="">Pipeline RAG/model mặc định</option>
          {form.handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
              {h.enabled ? "" : " (đang tắt)"}
            </option>
          ))}
        </select>
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={!!route.model_override}
          onChange={(e) =>
            routeChange(
              index,
              "model_override",
              e.target.checked ? { ...form.model } : null,
            )
          }
        />{" "}
        Dùng model riêng khi chuyên đề gọi LLM
      </label>
      {route.model_override && (
        <>
          <Field label="Provider">
            <select
              value={route.model_override.provider}
              onChange={(e) =>
                routeChange(index, "model_override", {
                  ...route.model_override,
                  provider: e.target.value,
                })
              }
            >
              {catalog.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Model riêng">
            <input
              value={route.model_override.name}
              onChange={(e) =>
                routeChange(index, "model_override", {
                  ...route.model_override,
                  name: e.target.value,
                })
              }
            />
          </Field>
          {[
            ["temperature", "Temperature", 0, 1, 0.1],
            ["max_tokens", "Max tokens", 64, 8192, 1],
            ["timeout_seconds", "Timeout (giây)", 5, 180, 1],
          ].map(([key, label, min, max, step]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={route.model_override[key]}
                onChange={(e) =>
                  routeChange(index, "model_override", {
                    ...route.model_override,
                    [key]: Number(e.target.value),
                  })
                }
              />
            </Field>
          ))}
        </>
      )}
    </>
  );
}
