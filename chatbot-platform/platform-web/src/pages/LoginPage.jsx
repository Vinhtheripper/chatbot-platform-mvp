import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../components/common/Icon";
import Field from "../components/common/Field";
import { connectWorkspace } from "../store/slices/sessionSlice.js";
export default function LoginPage() {
  const dispatch = useDispatch(),
    [token, setToken] = useState("");
  const { status, error } = useSelector((state) => state.session);
  const busy = status === "pending";
  function connect(event) {
    event.preventDefault();
    dispatch(connectWorkspace(token));
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Icon />
          </span>{" "}
          Chatbot Studio
        </div>
        <div className="story-copy">
          <span className="pill">KHÔNG GIAN CHO NHỮNG TRỢ LÝ CỦA BẠN</span>
          <h1>
            Từ tri thức.
            <br />
            Đến những cuộc
            <br />
            <em>trò chuyện tốt hơn.</em>
          </h1>
          <p>
            Một nơi để thiết kế, tinh chỉnh và đưa chatbot của từng phòng ban
            đến với người dùng.
          </p>
          <div className="story-flow">
            <span>
              <Icon name="book" />
              Tri thức
            </span>
            <i>→</i>
            <span>
              <Icon name="model" />
              Trợ lý
            </span>
            <i>→</i>
            <span>
              <Icon name="send" />
              Kết nối
            </span>
          </div>
        </div>
        <div className="story-footer">YOUR KNOWLEDGE. YOUR ASSISTANTS.</div>
      </section>
      <section className="login">
        <span className="eyebrow">CHÀO MỪNG TRỞ LẠI</span>
        <h2>Mở không gian làm việc</h2>
        <p>
          Quản lý các trợ lý của bạn, từ ý tưởng đầu tiên đến phiên bản sẵn sàng
          sử dụng.
        </p>
        <form onSubmit={connect}>
          <Field
            label="Admin token"
            hint="Sử dụng token đã cấu hình cho hệ thống của bạn."
          >
            <input
              placeholder="Nhập token truy cập"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </Field>
          <button disabled={busy}>
            {busy ? "Đang kết nối…" : "Vào Chatbot Studio"}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="login-note">
          <Icon name="check" size={16} /> Token chỉ được giữ trong phiên làm
          việc này.
        </div>
      </section>
    </main>
  );
}
