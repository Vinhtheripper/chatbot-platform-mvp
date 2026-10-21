import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../common/Icon";
import {
  emptyChat,
  initializeChat,
  removeChat,
  setChatInput,
  setChatMode,
  sendMessage,
} from "../../store/slices/chatSlice.js";

export default function Chat({
  botId,
  config,
  preview = false,
  disabled = false,
  revision = 0,
}) {
  const dispatch = useDispatch(),
    activeRequest = useRef(null);
  const key = `${preview ? "preview" : "public"}:${botId}:${revision}`;
  const { messages, input, mode, status, error } = useSelector(
    (state) => state.chat.sessions[key] || emptyChat,
  );
  const busy = status === "pending";
  useEffect(() => {
    dispatch(initializeChat(key));
    return () => {
      activeRequest.current?.abort();
      dispatch(removeChat(key));
    };
  }, [dispatch, key]);
  const setInput = (value) => dispatch(setChatInput({ key, value }));
  const setMode = (value) => dispatch(setChatMode({ key, value }));
  function send(event) {
    event.preventDefault();
    if (disabled || busy) return;
    activeRequest.current = dispatch(sendMessage({ key, botId, preview }));
  }
  return (
    <section
      className="chat"
      style={{ "--accent": config.theme.primary_color }}
    >
      <header className="chat-header">
        <div className="bot-icon">
          <Icon />
        </div>
        <div>
          <strong>{config.name}</strong>
          <small>
            {preview ? "Phiên trò chuyện thử nghiệm" : "Sẵn sàng hỗ trợ bạn"}
          </small>
        </div>
      </header>
      <div className="chat-body" aria-live="polite">
        <div className="bubble assistant">{config.theme.welcome}</div>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
            {m.role === "assistant" && (
              <small>
                {preview ? `${m.route || "Chung"} · ${m.reason}` : ""}
              </small>
            )}
            {m.actions?.length > 0 && (
              <div className="answer-actions">
                {m.actions.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
            {m.citations?.length > 0 && (
              <details>
                <summary>Nguồn tham khảo</summary>
                {m.citations.map((source, j) => (
                  <small key={j}>{source.name}</small>
                ))}
              </details>
            )}
          </div>
        ))}
        {busy && <p>Đang xử lý…</p>}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send} className="chat-form">
        {messages.length === 0 && (
          <div className="starter-questions">
            {config.features?.starter_questions
              ?.filter((q) => q.trim())
              .map((question, i) => (
                <button
                  type="button"
                  className="secondary"
                  key={i}
                  disabled={disabled || busy}
                  onClick={() => setInput(question)}
                >
                  {question}
                </button>
              ))}
          </div>
        )}
        {config.features?.allow_mode_selection !== false && (
          <select
            aria-label="Chuyên đề chat"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="auto">Tự động chọn chuyên đề</option>
            {config.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        <div className="input-row">
          <input
            aria-label="Câu hỏi"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={config.theme.placeholder}
            disabled={disabled || busy}
          />
          <button
            aria-label="Gửi câu hỏi"
            disabled={disabled || busy || !input.trim()}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
