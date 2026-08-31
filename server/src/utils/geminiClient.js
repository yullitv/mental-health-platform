const { GoogleGenAI } = require("@google/genai");

let client;

// Лінива ініціалізація — щоб сервер не падав на старті, якщо ключ ще не
// доданий у .env (а падав лише в момент реального запиту до фічі).
function getGeminiClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY не задано в .env");
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

module.exports = { getGeminiClient };
