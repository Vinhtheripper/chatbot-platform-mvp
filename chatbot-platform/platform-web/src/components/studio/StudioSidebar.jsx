import React from "react";
import Icon from "../common/Icon";
export default function StudioSidebar({
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
  onLogout,
}) {
  return (
    <aside id="studio-sidebar" className="sidebar" hidden={!sidebarOpen}>
      <div className="brand">
        <span className="brand-mark">
          <Icon />
        </span>
        <span>
          Chatbot<span className="brand-sub">STUDIO</span>
        </span>
      </div>
      <div className="workspace-switch">
        <span className="workspace-avatar">W</span>
        <div>
          Không gian làm việc<small>Quản lý trợ lý của bạn</small>
        </div>
      </div>
      <label className="template-picker">
        Mẫu chatbot
        <select
          aria-label="Mẫu chatbot"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        >
          {catalog.templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <small>
          {catalog.templates.find((item) => item.id === template)?.notes}
        </small>
      </label>
      <button className="create-bot" onClick={create} disabled={busy}>
        <Icon name="plus" size={17} /> Tạo chatbot mới
      </button>
      <div className="nav-heading">
        CHATBOT CỦA BẠN <span>{bots.length}</span>
      </div>
      <label className="bot-search">
        <Icon name="search" size={16} />
        <input
          aria-label="Tìm chatbot"
          placeholder="Tìm chatbot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <nav aria-label="Danh sách chatbot">
        {bots
          .filter((bot) =>
            bot.draft.name
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()),
          )
          .map((bot) => (
            <button
              className={`bot-link ${selected?.id === bot.id ? "active" : ""}`}
              key={bot.id}
              onClick={() => choose(bot)}
              disabled={busy}
            >
              <span className="nav-bot-icon">
                <Icon size={18} />
              </span>
              <span className="nav-bot-text">
                <strong>{bot.draft.name}</strong>
                <small>
                  {bot.published ? "Đã publish" : "Bản nháp"} · v{bot.revision}
                </small>
              </span>
            </button>
          ))}
      </nav>
      {search &&
        !bots.some((bot) =>
          bot.draft.name
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase()),
        ) && <p className="search-empty">Không tìm thấy chatbot.</p>}
      <div className="sidebar-foot">
        <div className="sidebar-tip">
          <Icon name="book" />
          <strong>Mỗi phòng ban, một trợ lý.</strong>
          <p>Tùy chỉnh nội dung và cách trả lời cho từng nhu cầu.</p>
        </div>
        <div className="account">
          <span className="workspace-avatar">A</span>
          <div>
            Quản trị viên<small>Phiên làm việc hiện tại</small>
          </div>
        </div>
        <button className="secondary" onClick={onLogout}>
          <Icon name="logout" size={16} /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}
