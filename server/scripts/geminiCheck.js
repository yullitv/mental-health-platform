// Діагностика Gemini: які моделі доступні ключу і що саме відповідає
// (або висить) для кожної моделі через обидва API SDK.
// Запуск: cd server && node scripts/geminiCheck.js
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const TIMEOUT_MS = 40000;
const MODELS = process.argv.slice(2).length ? process.argv.slice(2) : ["gemini-3.7-flash", "gemini-3.8-flash"];
const ONLY_GENERATE = true;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const withTimeout = (p) =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)),
  ]);

async function run(label, fn) {
  const t0 = Date.now();
  try {
    const out = await withTimeout(fn());
    console.log(`OK    ${label}  ${((Date.now() - t0) / 1000).toFixed(1)}s  -> ${String(out).slice(0, 60)}`);
  } catch (e) {
    console.log(`FAIL  ${label}  ${((Date.now() - t0) / 1000).toFixed(1)}s  -> ${e.status ?? ""} ${String(e.message).slice(0, 200)}`);
  }
}

(async () => {
  const key = process.env.GEMINI_API_KEY || "";
  console.log(`Ключ: ...${key.slice(-4)} (довжина ${key.length})\n`);

  await run("models.list", async () => {
    const names = [];
    const pager = await ai.models.list();
    for await (const m of pager) if (/flash/.test(m.name)) names.push(m.name.replace("models/", ""));
    console.log(names.join("\n")); return names.length + " моделей";
  });

  for (const model of MODELS) {
    await run(`generateContent   ${model}`, async () =>
      (await ai.models.generateContent({ model, contents: "Скажи одне слово: привіт" })).text);
    if (!ONLY_GENERATE) await run(`interactions      ${model}`, async () =>
      (await ai.interactions.create({ model, input: "Скажи одне слово: привіт" })).output_text);
  }
  process.exit(0);
})();
