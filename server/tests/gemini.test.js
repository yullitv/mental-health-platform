// Ланцюжок резервних моделей Gemini з fake-реалізацією SDK замість мережі.
const test = require("node:test"); const assert = require("node:assert/strict");
const { mock } = test;
const calls = [];
let script = {};
class FakeGoogleGenAI {
  constructor() {
    this.models = {
      generateContent: async ({ model }) => {
        calls.push(model);
        const next = (script[model] || []).shift();
        if (next instanceof Error) throw next;
        return { text: next };
      },
    };
  }
}
const err = (status, message) => Object.assign(new Error(message), { status });
require.cache[require.resolve("@google/genai")] = {
  id: "fake", filename: "fake", loaded: true, exports: { GoogleGenAI: FakeGoogleGenAI },
};
process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MODEL = "model-a";
process.env.GEMINI_FALLBACK_MODEL = "model-b, model-c";
const { getGeminiClient, modelChain, isRetryable } = require("../src/utils/geminiClient.js");
test.beforeEach(() => { calls.length = 0; mock.method(console, "warn", () => {}); });
test.afterEach(() => mock.restoreAll());

test("Gemini: модель із 429 пропускається, відповідає наступна", async () => {
  script = { "model-a": [err(429, "RESOURCE_EXHAUSTED")], "model-b": ['{"ok":true}'] };
  const r = await getGeminiClient().interactions.create({ model: "x", input: "привіт" });
  assert.equal(r.model, "model-b");
  assert.deepEqual(calls, ["model-a", "model-b"]);
});
test("Gemini: після 503 одна повторна спроба тієї ж моделі", async () => {
  script = { "model-a": [err(503, "high demand"), "відповідь"] };
  const r = await getGeminiClient().interactions.create({ model: "x", input: "привіт" });
  assert.equal(r.output_text, "відповідь");
  assert.deepEqual(calls, ["model-a", "model-a"]);
});
test("Gemini: помилка 400 не повторюється і повертається одразу", async () => {
  script = { "model-a": [err(400, "INVALID_ARGUMENT")] };
  await assert.rejects(getGeminiClient().interactions.create({ model: "x", input: "привіт" }), /INVALID_ARGUMENT/);
  assert.deepEqual(calls, ["model-a"]);
});
test("Gemini: ланцюжок моделей без дублікатів і класифікація помилок", () => {
  assert.deepEqual(modelChain("ignored"), ["model-a", "model-b", "model-c"]);
  assert.equal(isRetryable(err(503, "x")), true);
  assert.equal(isRetryable(err(401, "unauthorized")), false);
});
