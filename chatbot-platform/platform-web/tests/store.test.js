import test from "node:test";
import assert from "node:assert/strict";
import { createAppStore } from "../src/store/store.js";
import { connectWorkspace, logout } from "../src/store/slices/sessionSlice.js";
import {
  patchDraft,
  saveDraft,
  chooseBot,
  uploadDocuments,
  changeRoute,
  selectDirty,
} from "../src/store/slices/botsSlice.js";
import {
  initializeChat,
  setChatInput,
  sendMessage,
} from "../src/store/slices/chatSlice.js";
import { fetchIndex } from "../src/store/slices/diagnosticsSlice.js";

const response = (value, ok = true) => ({ ok, json: async () => value });
const bot = (id) => ({
  id,
  revision: 1,
  draft: { name: id, documents: [], routes: [], response_rules: [], links: [] },
});
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function login(store, bots = [bot("a"), bot("b")]) {
  globalThis.fetch = async (url) =>
    response(
      url.endsWith("/configuration")
        ? {
            templates: [],
            document_formats: [".txt"],
            document_max_bytes: 1000,
          }
        : bots,
    );
  await store.dispatch(connectWorkspace("private-token")).unwrap();
}
const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("login populates shared data; logout discards secrets and ignores late login", async () => {
  const store = createAppStore();
  await login(store);
  assert.equal(store.getState().session.connected, true);
  const pending = deferred();
  globalThis.fetch = () => pending.promise;
  const request = store.dispatch(connectWorkspace("old-token"));
  store.dispatch(logout());
  pending.resolve(response([]));
  await request;
  assert.equal(store.getState().session.connected, false);
  assert.equal(store.getState().session.token, "");
  assert.equal(store.getState().bots.catalog, null);
});

test("save carries expected revision and failures retain unsaved draft", async () => {
  const store = createAppStore();
  await login(store);
  store.dispatch(patchDraft({ key: "name", value: "Edited" }));
  assert.equal(selectDirty(store.getState()), true);
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.expected_revision, 1);
    assert.equal(body.config.name, "Edited");
    return response({ detail: "Revision conflict" }, false);
  };
  await store.dispatch(saveDraft());
  assert.equal(store.getState().bots.draft.name, "Edited");
  assert.equal(store.getState().bots.error, "Revision conflict");
  globalThis.fetch = async () =>
    response({
      ...bot("a"),
      revision: 2,
      draft: { ...store.getState().bots.draft },
    });
  await store.dispatch(saveDraft()).unwrap();
  assert.equal(selectDirty(store.getState()), false);
  assert.equal(store.getState().bots.items[0].revision, 2);
});

test("bot switch is blocked while saving; response after logout cannot restore bot", async () => {
  const store = createAppStore();
  await login(store);
  const pending = deferred();
  globalThis.fetch = () => pending.promise;
  const request = store.dispatch(saveDraft());
  store.dispatch(chooseBot("b"));
  assert.equal(store.getState().bots.selectedId, "a");
  store.dispatch(logout());
  pending.resolve(response(bot("a")));
  await request;
  assert.equal(store.getState().bots.selectedId, null);
});

test("upload is atomic on failure and files are never stored in state", async () => {
  const store = createAppStore();
  await login(store);
  let count = 0;
  globalThis.fetch = async () =>
    ++count === 1
      ? response({ document: { id: "one", content: "text" } })
      : response({ detail: "Bad document" }, false);
  await store.dispatch(
    uploadDocuments([
      { name: "a.txt", size: 3 },
      { name: "b.txt", size: 3 },
    ]),
  );
  assert.deepEqual(store.getState().bots.draft.documents, []);
  assert.equal(store.getState().bots.error, "Bad document");
});

test("route rename updates document, link and rule references", async () => {
  const store = createAppStore();
  await login(store);
  for (const [key, value] of Object.entries({
    routes: [{ id: "old" }],
    documents: [{ route_id: "old" }],
    links: [{ route_id: "old" }],
    response_rules: [{ excluded_routes: ["old"] }],
  }))
    store.dispatch(patchDraft({ key, value }));
  store.dispatch(changeRoute({ index: 0, key: "id", value: "new" }));
  const draft = store.getState().bots.draft;
  assert.equal(draft.documents[0].route_id, "new");
  assert.equal(draft.links[0].route_id, "new");
  assert.deepEqual(draft.response_rules[0].excluded_routes, ["new"]);
});

test("chat sessions isolate public/preview and preserve input on failure", async () => {
  const store = createAppStore();
  await login(store);
  const key = "preview:a:1",
    other = "public:a:1";
  store.dispatch(initializeChat(key));
  store.dispatch(initializeChat(other));
  store.dispatch(setChatInput({ key, value: "Question" }));
  globalThis.fetch = async () =>
    response({ detail: "Provider unavailable" }, false);
  await store.dispatch(sendMessage({ key, botId: "a", preview: true }));
  assert.equal(store.getState().chat.sessions[key].input, "Question");
  assert.equal(store.getState().chat.sessions[key].messages.length, 0);
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer private-token");
    return response({ response: "Answer", actions: [], citations: [] });
  };
  await store
    .dispatch(sendMessage({ key, botId: "a", preview: true }))
    .unwrap();
  assert.equal(store.getState().chat.sessions[key].messages.length, 2);
  assert.equal(store.getState().chat.sessions[other].messages.length, 0);
});

test("out of order index responses cannot overwrite newer status", async () => {
  const store = createAppStore();
  await login(store);
  const old = deferred(),
    latest = deferred();
  let count = 0;
  globalThis.fetch = () => (++count === 1 ? old.promise : latest.promise);
  const first = store.dispatch(fetchIndex({ botId: "a" })),
    second = store.dispatch(fetchIndex({ botId: "a" }));
  latest.resolve(response({ draft: { state: "ready" } }));
  await second;
  old.resolve(response({ draft: { state: "building" } }));
  await first;
  assert.equal(
    store.getState().diagnostics.indexes.a.data.draft.state,
    "ready",
  );
});
