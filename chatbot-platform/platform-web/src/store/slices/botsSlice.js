import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { api, parseDocument } from "../../services/api.js";
import { connectWorkspace } from "./sessionSlice.js";

const initialState = {
  items: [],
  catalog: null,
  selectedId: null,
  draft: null,
  status: "idle",
  error: "",
  notice: "",
  requestId: null,
  loginId: null,
};
const clone = (value) => JSON.parse(JSON.stringify(value));
function accept(state, bot) {
  state.items = [bot, ...state.items.filter((item) => item.id !== bot.id)];
  state.selectedId = bot.id;
  state.draft = clone(bot.draft);
}
const options = {
  condition: (_, { getState }) =>
    getState().session.connected && getState().bots.status !== "pending",
};
export const createBot = createAsyncThunk(
  "bots/create",
  async (templateId, { getState, signal }) => {
    const { session, bots } = getState();
    const template = bots.catalog.templates.find(
      (item) => item.id === templateId,
    );
    if (!template) throw new Error("Mẫu chatbot không tồn tại");
    return api("/admin/bots", {
      token: session.token,
      method: "POST",
      body: template.config,
      signal,
    });
  },
  options,
);
export const saveDraft = createAsyncThunk(
  "bots/save",
  async (_, { getState, signal }) => {
    const { session, bots } = getState();
    const bot = bots.items.find((item) => item.id === bots.selectedId);
    return api(`/admin/bots/${bot.id}/draft`, {
      token: session.token,
      method: "PUT",
      signal,
      body: { expected_revision: bot.revision, config: bots.draft },
    });
  },
  options,
);
export const publishBot = createAsyncThunk(
  "bots/publish",
  async (_, { getState, signal }) => {
    const { session, bots } = getState();
    const bot = bots.items.find((item) => item.id === bots.selectedId);
    if (JSON.stringify(bot.draft) !== JSON.stringify(bots.draft))
      throw new Error("Lưu nháp trước khi xuất bản");
    return api(`/admin/bots/${bot.id}/publish`, {
      token: session.token,
      method: "POST",
      signal,
      body: { expected_revision: bot.revision },
    });
  },
  options,
);
export const reloadBots = createAsyncThunk(
  "bots/reload",
  async (_, { getState, signal }) => {
    return api("/admin/bots", { token: getState().session.token, signal });
  },
  options,
);
export const uploadDocuments = createAsyncThunk(
  "bots/upload",
  async (files, { getState, signal }) => {
    const { session, bots } = getState();
    const docs = [];
    for (const file of files) {
      if (
        !bots.catalog.document_formats.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        )
      )
        throw new Error("Định dạng chưa hỗ trợ: " + file.name);
      if (file.size > bots.catalog.document_max_bytes)
        throw new Error("Tài liệu quá lớn: " + file.name);
      docs.push(
        (await parseDocument(file, { token: session.token, signal })).document,
      );
    }
    const documents = [...bots.draft.documents, ...docs];
    if (
      documents.length > 50 ||
      documents.reduce((sum, doc) => sum + doc.content.length, 0) > 1000000
    )
      throw new Error("Vượt giới hạn tài liệu của bot");
    return { botId: bots.selectedId, documents };
  },
  options,
);

const slice = createSlice({
  name: "bots",
  initialState,
  reducers: {
    chooseBot(state, { payload: id }) {
      if (state.status === "pending") return;
      const bot = state.items.find((item) => item.id === id);
      if (bot) {
        state.selectedId = id;
        state.draft = clone(bot.draft);
        state.error = "";
        state.notice = "";
      }
    },
    patchDraft(state, { payload: { key, value } }) {
      if (state.status !== "pending") state.draft[key] = value;
    },
    patchNested(state, { payload: { key, field, value } }) {
      if (state.status !== "pending") state.draft[key][field] = value;
    },
    changeRoute(state, { payload: { index, key, value } }) {
      if (state.status === "pending") return;
      const oldId = state.draft.routes[index].id;
      state.draft.routes[index][key] = value;
      if (key !== "id") return;
      for (const doc of state.draft.documents)
        if (doc.route_id === oldId) doc.route_id = value;
      for (const link of state.draft.links)
        if (link.route_id === oldId) link.route_id = value;
      for (const rule of state.draft.response_rules)
        rule.excluded_routes = (rule.excluded_routes || []).map((id) =>
          id === oldId ? value : id,
        );
    },
    deleteRoute(state, { payload: index }) {
      if (state.status === "pending") return;
      const id = state.draft.routes[index].id;
      if (
        state.draft.documents.some((doc) => doc.route_id === id) ||
        state.draft.links.some(
          (link) => link.when === "route" && link.route_id === id,
        )
      ) {
        state.error =
          "Chuyển hoặc xóa tài liệu và liên kết thuộc chuyên đề trước khi xóa chuyên đề.";
        return;
      }
      state.draft.routes.splice(index, 1);
      for (const rule of state.draft.response_rules)
        rule.excluded_routes = (rule.excluded_routes || []).filter(
          (value) => value !== id,
        );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectWorkspace.pending, (state, action) => {
        state.loginId = action.meta.requestId;
      })
      .addCase(connectWorkspace.fulfilled, (state, action) => {
        if (state.loginId !== action.meta.requestId) return;
        state.catalog = action.payload.catalog;
        state.items = action.payload.bots;
        state.loginId = null;
        if (state.items.length) accept(state, state.items[0]);
      });
    for (const thunk of [
      createBot,
      saveDraft,
      publishBot,
      reloadBots,
      uploadDocuments,
    ]) {
      builder.addCase(thunk.pending, (state, action) => {
        state.status = "pending";
        state.requestId = action.meta.requestId;
        state.error = "";
        state.notice = "";
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = "succeeded";
        state.requestId = null;
        if (thunk === reloadBots) {
          state.items = action.payload;
          const bot = state.items.find((item) => item.id === state.selectedId);
          if (bot) accept(state, bot);
          else {
            state.selectedId = null;
            state.draft = null;
          }
        } else if (thunk === uploadDocuments) {
          if (state.selectedId === action.payload.botId)
            state.draft.documents = action.payload.documents;
          state.notice =
            "Đã thêm tài liệu vào form. Bấm Lưu nháp để dùng trong preview.";
        } else {
          accept(state, action.payload);
          state.notice =
            thunk === publishBot
              ? "Đã xuất bản."
              : thunk === saveDraft
                ? "Đã lưu bản nháp."
                : "Đã tạo chatbot.";
        }
      });
      builder.addCase(thunk.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = "failed";
        state.requestId = null;
        state.error = action.error.message;
      });
    }
  },
});
export const { chooseBot, patchDraft, patchNested, changeRoute, deleteRoute } =
  slice.actions;
export const selectSelectedBot = createSelector(
  [(s) => s.bots.items, (s) => s.bots.selectedId],
  (items, id) => items.find((bot) => bot.id === id) || null,
);
export const selectDirty = createSelector(
  [selectSelectedBot, (s) => s.bots.draft],
  (bot, draft) => !!bot && JSON.stringify(bot.draft) !== JSON.stringify(draft),
);
export default slice.reducer;
