import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { Provider } from "react-redux";
import { createServer } from "vite";
import { createServer as createHttpServer } from "node:http";

const form = {
  name: "Test bot",
  description: "",
  model: {
    provider: "demo",
    name: "demo",
    temperature: 0.2,
    max_tokens: 1024,
    timeout_seconds: 60,
  },
  theme: { primary_color: "#2563eb", welcome: "Hello", placeholder: "Ask" },
  system_prompt: "Prompt",
  fallback_message: "Fallback",
  prompt_profile: { role: "", audience: "", scope: "", tone: "", format: "" },
  answer_examples: [],
  prompt_rules: [],
  response_rules: [],
  enforce_defer_only: true,
  documents: [],
  knowledge_enabled: true,
  routes: [],
  links: [],
  handlers: [],
  history_limit: 10,
  features: {
    show_sources: true,
    allow_mode_selection: true,
    starter_questions: [],
  },
  routing: { unmatched: "general" },
  postprocessing: {
    remove_artifacts: false,
    remove_suggestions: false,
    strip_topic_metadata: false,
    normalize_tables: true,
  },
  retrieval: {
    strategy: "lexical",
    chunk_size: 1600,
    overlap: 200,
    top_k: 4,
    min_score: 0.3,
    embedding_model: "nomic-embed-text",
    embedding_revision: "1",
    chunk_strategy: "characters",
    semantic_weight: 0.5,
    context_max_chars: 16000,
  },
};

test("Studio and all eight configuration steps render using Redux state", async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    appType: "custom",
    logLevel: "error",
  });
  const originalFetch = globalThis.fetch,
    originalWindow = globalThis.window;
  try {
    const { createAppStore } = await server.ssrLoadModule(
      "/src/store/store.js",
    );
    const { connectWorkspace } = await server.ssrLoadModule(
      "/src/store/slices/sessionSlice.js",
    );
    const { default: Editor } = await server.ssrLoadModule(
      "/src/components/studio/ConfigEditor.jsx",
    );
    const { default: Studio } = await server.ssrLoadModule(
      "/src/pages/StudioPage.jsx",
    );
    const catalog = {
      templates: [{ id: "blank", label: "Blank", config: form }],
      providers: [{ id: "demo", label: "Demo" }],
      document_formats: [".md"],
      rule_packs: [],
      handler_types: [],
    };
    const bot = { id: "abc", revision: 1, draft: form };
    globalThis.fetch = async (url) => ({
      ok: true,
      json: async () => (url.endsWith("/configuration") ? catalog : [bot]),
    });
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    const store = createAppStore();
    await store.dispatch(connectWorkspace("token")).unwrap();
    const props = {
      form,
      selected: bot,
      catalog,
      dirty: false,
      busy: false,
      patch: () => {},
      nested: () => {},
      routeChange: () => {},
      deleteRoute: () => {},
      upload: () => {},
      publish: () => {},
    };
    for (const tab of [
      "general",
      "knowledge",
      "model",
      "rules",
      "routes",
      "features",
      "design",
      "review",
    ]) {
      const html = renderToString(
        React.createElement(
          Provider,
          { store },
          React.createElement(Editor, { ...props, tab }),
        ),
      );
      assert.ok(html.length > 100, tab);
    }
    const html = renderToString(
      React.createElement(Provider, { store }, React.createElement(Studio)),
    );
    assert.ok(html.includes("Test bot"));
    assert.ok(html.includes("Kiểm tra xuất bản"));
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    await server.close();
  }
});
