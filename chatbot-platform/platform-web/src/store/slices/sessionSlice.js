import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../services/api.js";

export const connectWorkspace = createAsyncThunk(
  "session/connect",
  async (token, { signal }) => {
    const [bots, catalog] = await Promise.all([
      api("/admin/bots", { token, signal }),
      api("/admin/configuration", { token, signal }),
    ]);
    return { token, bots, catalog };
  },
  { condition: (_, { getState }) => getState().session.status !== "pending" },
);

const slice = createSlice({
  name: "session",
  initialState: {
    token: "",
    connected: false,
    status: "idle",
    error: "",
    requestId: null,
  },
  reducers: {
    logout: () => ({
      token: "",
      connected: false,
      status: "idle",
      error: "",
      requestId: null,
    }),
  },
  extraReducers: (builder) =>
    builder
      .addCase(connectWorkspace.pending, (state, action) => {
        state.status = "pending";
        state.error = "";
        state.requestId = action.meta.requestId;
      })
      .addCase(connectWorkspace.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.token = action.payload.token;
        state.connected = true;
        state.status = "succeeded";
        state.requestId = null;
      })
      .addCase(connectWorkspace.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = "failed";
        state.error = action.error.message;
        state.requestId = null;
      }),
});
export const { logout } = slice.actions;
export default slice.reducer;
