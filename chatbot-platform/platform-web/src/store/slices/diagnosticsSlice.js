import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api.js";

export const fetchIndex = createAsyncThunk(
  "diagnostics/index",
  ({ botId }, { getState, signal }) =>
    api(`/admin/bots/${botId}/index`, {
      token: getState().session.token,
      signal,
    }),
  {
    condition: ({ botId }, { getState }) =>
      getState().session.connected &&
      !getState().diagnostics.indexes[botId]?.rebuilding,
  },
);
export const rebuildIndex = createAsyncThunk(
  "diagnostics/rebuild",
  ({ botId, revision }, { getState, signal }) =>
    api(`/admin/bots/${botId}/index/rebuild`, {
      token: getState().session.token,
      method: "POST",
      signal,
      body: { expected_revision: revision },
    }),
  {
    condition: ({ botId }, { getState }) =>
      getState().session.connected &&
      !getState().diagnostics.indexes[botId]?.rebuilding,
  },
);
export const inspectBot = createAsyncThunk(
  "diagnostics/inspect",
  ({ botId, query, mode }, { getState, signal }) =>
    api(`/admin/bots/${botId}/inspect`, {
      token: getState().session.token,
      method: "POST",
      signal,
      body: { message: query, mode },
    }),
  { condition: (_, { getState }) => getState().session.connected },
);

const slice = createSlice({
  name: "diagnostics",
  initialState: { indexes: {}, inspections: {} },
  reducers: {},
  extraReducers: (builder) => {
    for (const thunk of [fetchIndex, rebuildIndex, inspectBot]) {
      const field = thunk === inspectBot ? "inspections" : "indexes";
      const keyOf = (action) =>
        field === "inspections"
          ? `${action.meta.arg.botId}:${action.meta.arg.revision}`
          : action.meta.arg.botId;
      builder.addCase(thunk.pending, (state, action) => {
        const key = keyOf(action);
        state[field][key] ??= { data: null };
        Object.assign(state[field][key], {
          status: "pending",
          error: "",
          requestId: action.meta.requestId,
        });
        if (field === "inspections") state[field][key].data = null;
        if (thunk === rebuildIndex) state[field][key].rebuilding = true;
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        const entry = state[field][keyOf(action)];
        if (entry?.requestId !== action.meta.requestId) return;
        Object.assign(entry, {
          data: action.payload,
          status: "succeeded",
          requestId: null,
          rebuilding: false,
        });
      });
      builder.addCase(thunk.rejected, (state, action) => {
        const entry = state[field][keyOf(action)];
        if (entry?.requestId !== action.meta.requestId) return;
        Object.assign(entry, {
          status: "failed",
          requestId: null,
          rebuilding: false,
          error: action.meta.aborted ? "" : action.error.message,
        });
      });
    }
  },
});
export default slice.reducer;
