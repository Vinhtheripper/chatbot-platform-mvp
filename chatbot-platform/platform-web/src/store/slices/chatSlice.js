import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api.js";

export const emptyChat = {
  messages: [],
  input: "",
  mode: "auto",
  status: "idle",
  error: "",
  requestId: null,
};
export const fetchPublicBot = createAsyncThunk(
  "chat/publicConfig",
  (botId, { signal }) => api(`/bots/${botId}`, { signal }),
);
export const sendMessage = createAsyncThunk(
  "chat/send",
  async ({ key, botId, preview }, { getState, signal }) => {
    const state = getState(),
      chat = state.chat.sessions[key];
    const message = chat.input.trim();
    const out = await api(
      preview ? `/admin/bots/${botId}/preview` : `/bots/${botId}/chat`,
      {
        token: preview ? state.session.token : undefined,
        method: "POST",
        signal,
        body: {
          message,
          mode: chat.mode,
          history: chat.messages
            .slice(-30)
            .map(({ role, content }) => ({ role, content })),
        },
      },
    );
    return { message, out };
  },
  {
    condition: ({ key }, { getState }) => {
      const session = getState().chat.sessions[key];
      return !!session?.input.trim() && session.status !== "pending";
    },
  },
);
const slice = createSlice({
  name: "chat",
  initialState: { sessions: {}, publicBots: {} },
  reducers: {
    initializeChat(state, { payload: key }) {
      state.sessions[key] ??= { ...emptyChat, messages: [] };
    },
    removeChat(state, { payload: key }) {
      delete state.sessions[key];
    },
    setChatInput(state, { payload: { key, value } }) {
      if (state.sessions[key]) state.sessions[key].input = value;
    },
    setChatMode(state, { payload: { key, value } }) {
      if (state.sessions[key]) state.sessions[key].mode = value;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchPublicBot.pending, (state, action) => {
        state.publicBots[action.meta.arg] = {
          status: "pending",
          config: null,
          error: "",
          requestId: action.meta.requestId,
        };
      })
      .addCase(fetchPublicBot.fulfilled, (state, action) => {
        const entry = state.publicBots[action.meta.arg];
        if (entry?.requestId !== action.meta.requestId) return;
        entry.config = action.payload;
        entry.status = "succeeded";
      })
      .addCase(fetchPublicBot.rejected, (state, action) => {
        const entry = state.publicBots[action.meta.arg];
        if (entry?.requestId !== action.meta.requestId) return;
        entry.status = "failed";
        entry.error = action.meta.aborted ? "" : action.error.message;
      })
      .addCase(sendMessage.pending, (state, action) => {
        const entry = state.sessions[action.meta.arg.key];
        entry.status = "pending";
        entry.error = "";
        entry.requestId = action.meta.requestId;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const entry = state.sessions[action.meta.arg.key];
        if (entry?.requestId !== action.meta.requestId) return;
        const { message, out } = action.payload;
        entry.messages.push(
          { role: "user", content: message },
          {
            role: "assistant",
            content: out.response,
            route: out.resolved_route,
            reason: out.reason,
            actions: out.actions || [],
            citations: out.citations || [],
          },
        );
        entry.input = "";
        entry.status = "succeeded";
        entry.requestId = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const entry = state.sessions[action.meta.arg.key];
        if (entry?.requestId !== action.meta.requestId) return;
        entry.status = "failed";
        entry.error = action.meta.aborted ? "" : action.error.message;
        entry.requestId = null;
      }),
});
export const { initializeChat, removeChat, setChatInput, setChatMode } =
  slice.actions;
export default slice.reducer;
