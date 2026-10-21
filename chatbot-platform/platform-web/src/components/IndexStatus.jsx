import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchIndex, rebuildIndex } from "../store/slices/diagnosticsSlice.js";
const labels = {
  missing: "Chưa có index",
  queued: "Đang chờ",
  building: "Đang lập chỉ mục",
  ready: "Sẵn sàng",
  error: "Lỗi xử lý",
  interrupted: "Xử lý bị gián đoạn",
};
export default function IndexStatus({ botId, revision, dirty, busy }) {
  const dispatch = useDispatch();
  const entry = useSelector((state) => state.diagnostics.indexes[botId]);
  const state = entry?.data,
    error = entry?.error,
    working = !!entry?.rebuilding;
  useEffect(() => {
    if (working) return;
    let active = true,
      timer,
      request;
    async function poll() {
      request = dispatch(fetchIndex({ botId }));
      await request;
      if (active) timer = setTimeout(poll, 3000);
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
      request?.abort();
    };
  }, [dispatch, botId, revision, working]);
  const rebuild = () => dispatch(rebuildIndex({ botId, revision }));
  const pending = state && ["queued", "building"].includes(state.draft.state);
  return (
    <section className="index-status" aria-label="Trạng thái chỉ mục">
      <h2>Chỉ mục tài liệu</h2>
      <p className="muted">
        Tự xây sau khi lưu nháp. Đoạn tài liệu và vector được lưu trong
        database; bản đã xuất bản dùng đúng index của phiên bản đó.
      </p>
      {state ? (
        <div className="two">
          {[
            ["draft", "Bản nháp"],
            ["published", "Đã xuất bản"],
          ].map(([key, label]) => (
            <article className="index-card" key={key}>
              <strong>{label}</strong>
              {state[key] ? (
                <>
                  <p role="status">
                    {labels[state[key].state]} · v{state[key].revision}
                  </p>
                  <small>
                    {state[key].chunk_count} đoạn sẵn sàng
                    {state[key].dimension
                      ? ` · ${state[key].dimension} chiều vector`
                      : ""}
                  </small>
                  {state[key].state === "building" && (
                    <small>Đã xử lý {state[key].progress} đoạn</small>
                  )}
                  {state[key].serving_ready && state[key].state !== "ready" && (
                    <small>
                      Tiếp tục phục vụ index đã sẵn sàng trong lúc xây lại.
                    </small>
                  )}
                  {state[key].error && (
                    <p className="error">{state[key].error}</p>
                  )}
                  {state[key].state === "interrupted" && (
                    <p className="muted">Tác vụ quá hạn, có thể bấm thử lại.</p>
                  )}
                </>
              ) : (
                <p className="muted">Chưa xuất bản</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Đang đọc trạng thái…</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        className="secondary"
        disabled={dirty || busy || working || pending}
        onClick={rebuild}
      >
        {working
          ? "Đang gửi…"
          : state?.draft.state === "error" ||
              state?.draft.state === "interrupted"
            ? "Thử lập chỉ mục lại"
            : "Xây lại index bản nháp"}
      </button>
      {dirty && (
        <p className="muted">
          Lưu nháp trước để index dùng đúng tài liệu và cấu hình mới.
        </p>
      )}
      <hr />
    </section>
  );
}
