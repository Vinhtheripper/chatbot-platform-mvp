import { combineReducers, configureStore } from "@reduxjs/toolkit";
import session, { logout } from "./slices/sessionSlice.js";
import bots from "./slices/botsSlice.js";
import chat from "./slices/chatSlice.js";
import diagnostics from "./slices/diagnosticsSlice.js";

const combined = combineReducers({ session, bots, chat, diagnostics });
export function rootReducer(state, action) {
  // Drop secrets, private config, diagnostics and chat history on logout.
  return combined(logout.match(action) ? undefined : state, action);
}
export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    // Tokens and source documents must not be recorded by Redux DevTools.
    devTools: false,
  });
}
export const store = createAppStore();
