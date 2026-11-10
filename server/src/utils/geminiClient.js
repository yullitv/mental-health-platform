const { GoogleGenAI } = require("@google/genai");

let client;

// Помилки, після яких має сенс повторити запит: 503 ("модель зараз
// перевантажена" - буває на Gemini регулярно і минає за секунди), 429
// (ліміт запитів на хвилину на безкоштовному тарифі) і 500 з боку Google.
// Решта (невалідний запит, невірний ключ) - повторювати безглуздо.
const RETRYABLE_STATUS = new Set([429, 500, 503]);
const RETRYABLE_TEXT = /\b(429|500|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|rate limit/i;
const RETRY_DELAYS_MS = [1500, 4000];
// Gemini під навантаженням інколи не повертає ні відповіді, ні помилки -
// без тайм-ауту запит висів хвилинами, а клієнт бачив вічне "Аналізую...".
const ATTEMPT_TIMEOUT_MS = 25000;
// Загальний бюджет на всі спроби разом - щоб повтори не розтягували
// очікування користувача понад розумну межу.
const TOTAL_BUDGET_MS = 50000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`Gemini не відповів за ${ms / 1000} с`);
      error.status = 503;
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isRetryable(error) {
  const status = error?.status ?? error?.code;
  return RETRYABLE_STATUS.has(Number(status)) || RETRYABLE_TEXT.test(String(error?.message || ""));
}

// Обгортка над interactions.create: кілька повторів з паузою для тимчасових
// збоїв, а якщо основна модель так і не відповіла - одна спроба з резервною
// моделлю (GEMINI_FALLBACK_MODEL у .env, необов'язково). Контролери
// викликають client.interactions.create як і раніше - нічого в них міняти
// не треба.
async function createWithRetry(rawClient, params) {
  const models = [params.model];
  const fallback = process.env.GEMINI_FALLBACK_MODEL;
  if (fallback && fallback !== params.model) models.push(fallback);

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw lastError || new Error("Gemini: вичерпано час очікування");
      try {
        return await withTimeout(
          rawClient.interactions.create({ ...params, model }),
          Math.min(ATTEMPT_TIMEOUT_MS, remaining),
        );
      } catch (error) {
        lastError = error;
        if (!isRetryable(error)) throw error;
        console.warn(
          `⚠️ Gemini (${model}) тимчасово недоступний, спроба ${attempt + 1}: ${error.message}`,
        );
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

// Лінива ініціалізація - щоб сервер не падав на старті, якщо ключ ще не
// доданий у .env (а падав лише в момент реального запиту до фічі).
function getGeminiClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY не задано в .env");
    }
    const rawClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    client = {
      interactions: {
        create: (params) => createWithRetry(rawClient, params),
      },
    };
  }
  return client;
}

module.exports = { getGeminiClient, isRetryable };
