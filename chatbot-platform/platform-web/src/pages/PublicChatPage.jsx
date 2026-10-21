import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Chat from "../components/chat/Chat";
import { fetchPublicBot } from "../store/slices/chatSlice.js";
export default function PublicChatPage({ botId }) {
  const dispatch = useDispatch();
  const entry = useSelector((state) => state.chat.publicBots[botId]);
  const config = entry?.config,
    error = entry?.error;
  useEffect(() => {
    const request = dispatch(fetchPublicBot(botId));
    return () => request.abort();
  }, [dispatch, botId]);
  return (
    <main className="public">
      <a href="/">← Chatbot Studio</a>
      {error ? (
        <p className="error">{error}</p>
      ) : config ? (
        <>
          <h1>{config.name}</h1>
          <p>{config.description}</p>
          <Chat botId={botId} config={config} revision={config.revision} />
        </>
      ) : (
        <p>Đang tải…</p>
      )}
    </main>
  );
}
