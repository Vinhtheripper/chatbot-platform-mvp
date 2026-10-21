import React from "react";
import { useSelector } from "react-redux";
import LoginPage from "./pages/LoginPage";
import StudioPage from "./pages/StudioPage";
import PublicChatPage from "./pages/PublicChatPage";
export default function App() {
  const connected = useSelector((state) => state.session.connected);
  const match = window.location.pathname.match(/^\/chat\/([a-f0-9]+)\/?$/);
  if (match) return <PublicChatPage botId={match[1]} />;
  return connected ? <StudioPage /> : <LoginPage />;
}
