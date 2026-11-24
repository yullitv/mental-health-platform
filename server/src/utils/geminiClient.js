const { GoogleGenAI } = require("@google/genai");

let client;

function modelChain(requestedModel) {
  const primary = process.env.GEMINI_MODEL || requestedModel;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODEL || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);
const RETRYABLE_TEXT =
  /\b(404|429|500|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|high demand|rate limit|no longer available/i;
const SAME_MODEL_RETRY_DELAY_MS = 1500;
const ATTEMPT_TIMEOUT_MS = 25000;
const TOTAL_BUDGET_MS = 55000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Gemini не відповів за ${Math.round(ms / 1000)} с`);
      error.status = 503;
      error.isTimeout = true;
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isRetryable(error) {
  const status = Number(error?.status ?? error?.code);
  return RETRYABLE_STATUS.has(status) || RETRYABLE_TEXT.test(String(error?.message || ""));
}

// Перетворення формату interactions.create -> generateContent.
function toContents(input) {
  if (typeof input === "string") return input;
  const parts = input.map((part) => {
    if (part.type === "text") return { text: part.text };
    // image / document: base64 + MIME-тип
    return { inlineData: { data: part.data, mimeType: part.mime_type } };
  });
  return [{ role: "user", parts }];
}

function toConfig(params) {
  const config = {};
  if (params.system_instruction) config.systemInstruction = params.system_instruction;
  const format = params.response_format;
  if (format?.mime_type === "application/json") {
    config.responseMimeType = "application/json";
    if (format.schema) config.responseJsonSchema = format.schema;
  }
  return config;
}

async function generate(rawClient, params) {
  const models = modelChain(params.model);
  const contents = toContents(params.input);
  const config = toConfig(params);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw lastError || new Error("Gemini: вичерпано час очікування");
      try {
        const response = await withTimeout(
          rawClient.models.generateContent({ model, contents, config }),
          Math.min(ATTEMPT_TIMEOUT_MS, remaining),
        );
        const text = response.text;
        if (!text) throw Object.assign(new Error("Порожня відповідь моделі"), { status: 500 });
        return { output_text: text, model };
      } catch (error) {
        lastError = error;
        if (!isRetryable(error)) throw error;
        console.warn(`⚠️ Gemini (${model}) спроба ${attempt + 1}: ${String(error.message).slice(0, 160)}`);
        const status = Number(error.status);
        if (error.isTimeout || status === 404 || status === 429 || attempt === 1) break;
        await sleep(SAME_MODEL_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

function getGeminiClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY не задано в .env");
    }
    const rawClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    client = {
      interactions: {
        create: (params) => generate(rawClient, params),
      },
    };
  }
  return client;
}

module.exports = { getGeminiClient, isRetryable, modelChain, toContents, toConfig };
