import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../store/slices/sessionSlice.js";
import { useStudio } from "../hooks/useStudio";
import Icon from "../components/common/Icon";
import Chat from "../components/chat/Chat";
import StudioSidebar from "../components/studio/StudioSidebar";
import StudioToolbar from "../components/studio/StudioToolbar";
import ConfigEditor from "../components/studio/ConfigEditor";
const tabs = [
  ["general", "grid", "Thông tin"],
  ["knowledge", "book", "Tài liệu"],
  ["model", "model", "Prompt & câu mẫu"],
  ["rules", "check", "Luật trả lời"],
  ["routes", "routes", "Điều hướng"],
  ["features", "send", "Tính năng & link"],
  ["design", "design", "Giao diện"],
  ["review", "check", "Kiểm thử & xuất bản"],
];
export default function StudioPage() {
  const dispatch = useDispatch(),
    studio = useStudio();
  const {
    bots,
    catalog,
    selected,
    form,
    dirty,
    busy,
    error,
    notice,
    choose,
    save,
    reload,
  } = studio;
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 701px)").matches,
  );
  const [search, setSearch] = useState(""),
    [template, setTemplate] = useState("blank"),
    [tab, setTab] = useState("general");
  const step = tabs.findIndex(([id]) => id === tab);
  const create = () => studio.create(template);
  useEffect(() => {
    function escape(event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        document.getElementById("sidebar-toggle")?.focus();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <div
      className={`studio ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      <StudioSidebar
        {...{
          sidebarOpen,
          template,
          setTemplate,
          catalog,
          create,
          busy,
          bots,
          search,
          setSearch,
          selected,
          choose,
        }}
        onLogout={() => dispatch(logout())}
      />
      <main className="workspace">
        <StudioToolbar
          {...{
            sidebarOpen,
            setSidebarOpen,
            selected,
            dirty,
            busy,
            reload,
            save,
            setTab,
          }}
        />
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {!selected ? (
          <div className="empty">
            <div className="empty-icon">
              <Icon size={32} />
            </div>
            <span className="eyebrow">BẮT ĐẦU TẠI ĐÂY</span>
            <h2>Tạo trợ lý cho phòng ban của bạn</h2>
            <p>
              Bắt đầu bằng model demo, sau đó kết nối model thật khi sẵn sàng.
            </p>
            <button onClick={create} disabled={busy}>
              Tạo chatbot đầu tiên
            </button>
          </div>
        ) : (
          <>
            <section className="overview-strip" aria-label="Tóm tắt cấu hình">
              <div>
                <span className="metric-icon">
                  <Icon name="model" />
                </span>
                <div>
                  <small>MODEL HIỆN TẠI</small>
                  <strong>{form.model.name || "Chưa chọn"}</strong>
                </div>
              </div>
              <div>
                <span className="metric-icon">
                  <Icon name="routes" />
                </span>
                <div>
                  <small>CHUYÊN ĐỀ</small>
                  <strong>{form.routes.length} chuyên đề</strong>
                </div>
              </div>
              <div>
                <span className="metric-icon">
                  <Icon name="check" />
                </span>
                <div>
                  <small>PHIÊN BẢN CÔNG KHAI</small>
                  <strong>
                    {selected.published_revision
                      ? `Đã xuất bản · v${selected.published_revision}`
                      : "Chưa xuất bản"}
                  </strong>
                </div>
              </div>
            </section>
            <div className="section-heading">
              <div>
                <h2>Thiết kế trợ lý của bạn</h2>
                <p>
                  Tinh chỉnh từng chi tiết để chatbot hoạt động theo cách bạn
                  muốn.
                </p>
              </div>
              <span className="pill subtle">BẢN NHÁP</span>
            </div>
            <nav className="tabs wizard-steps" aria-label="Các bước cấu hình">
              {tabs.map(([id, no, label], index) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  className={tab === id ? "selected" : ""}
                  onClick={() => setTab(id)}
                >
                  <span className="step-number">{index + 1}</span> {label}
                </button>
              ))}
            </nav>
            <div className="step-caption">
              Bước {step + 1} / {tabs.length} — {tabs[step][2]}
              <span>
                Có thể quay lại sửa bất kỳ bước nào. Bấm Lưu nháp để lưu thay
                đổi.
              </span>
            </div>
            <div className="editor-grid">
              <section className="panel">
                <fieldset disabled={busy}>
                  <ConfigEditor tab={tab} {...studio} />
                  <div className="wizard-footer">
                    <button
                      className="secondary"
                      disabled={step === 0}
                      onClick={() => setTab(tabs[step - 1][0])}
                    >
                      ← Bước trước
                    </button>
                    <span>
                      {step + 1} / {tabs.length}
                    </span>
                    {step < tabs.length - 1 && (
                      <button onClick={() => setTab(tabs[step + 1][0])}>
                        Tiếp tục →
                      </button>
                    )}
                  </div>
                </fieldset>
              </section>
              <aside className="preview">
                <div className="preview-label">
                  <strong>
                    <span className="status-dot" /> Xem trước trực tiếp
                  </strong>
                  <span>{dirty ? "Lưu nháp để thử" : "Bản nháp đã lưu"}</span>
                </div>
                <Chat
                  key={`${selected.id}:${selected.revision}`}
                  botId={selected.id}
                  revision={selected.revision}
                  config={form}
                  preview
                  disabled={dirty || busy}
                />
                <p className="muted">
                  Giao diện cập nhật tức thì. Câu trả lời dùng bản nháp đã lưu.
                  Demo không thực thi prompt.
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
