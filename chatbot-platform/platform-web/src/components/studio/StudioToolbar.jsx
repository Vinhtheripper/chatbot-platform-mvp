import React from "react";
import Icon from "../common/Icon";
export default function StudioToolbar({
  sidebarOpen,
  setSidebarOpen,
  selected,
  dirty,
  busy,
  reload,
  save,
  setTab,
}) {
  return (
    <header className="toolbar">
      <button
        id="sidebar-toggle"
        className="secondary hamburger"
        aria-controls="studio-sidebar"
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Đóng menu chatbot" : "Mở menu chatbot"}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        <Icon name="menu" />
      </button>
      <div className="toolbar-title">
        <div className="breadcrumb">
          Không gian làm việc <span>/</span> Cấu hình chatbot
        </div>
        <h1>{selected?.draft.name || "Bắt đầu với chatbot đầu tiên"}</h1>
        {selected && (
          <p className="save-status">
            <span className={dirty ? "status-dot pending" : "status-dot"} />
            {dirty ? "Có thay đổi chưa lưu" : "Tất cả thay đổi đã được lưu"}
            <span className="version-tag">v{selected.revision}</span>
          </p>
        )}
      </div>
      {selected && (
        <div className="actions">
          <button className="secondary" disabled={busy} onClick={reload}>
            Tải lại
          </button>
          <button
            className="secondary"
            onClick={save}
            disabled={busy || !dirty}
          >
            Lưu nháp
          </button>
          <button onClick={() => setTab("review")} disabled={busy}>
            Kiểm tra xuất bản <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
