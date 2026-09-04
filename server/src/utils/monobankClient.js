// Клієнт для Monobank Open API — читання виписки власної банки (jar) для
// незалежної (не-AI) перевірки донатів. Працює лише якщо в .env заданий
// MONOBANK_JAR_TOKEN — особистий токен власника банки, отриманий на
// https://api.monobank.ua/. Токен НІКОЛИ не потрапляє в код чи git.

const STATEMENT_URL = "https://api.monobank.ua/personal/statement";

// Офіційний ліміт Monobank — не частіше ніж 1 запит на 60с на весь токен
// (не на окрему банку). Тримаємо трохи більший інтервал і кешуємо останню
// відповідь, щоб не впертись у 429 при кількох донатах поспіль.
const MIN_INTERVAL_MS = 61 * 1000;
const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000; // максимум за один запит — 31 доба

let lastCall = { at: 0, promise: null };

// GET /personal/statement/{account}/{from}/{to} — {from}/{to} у секундах Unix.
async function fetchJarStatement(jarId, fromDate, toDate) {
  const token = process.env.MONOBANK_JAR_TOKEN;
  if (!token) {
    throw new Error("MONOBANK_JAR_TOKEN не налаштований у .env");
  }

  let from = fromDate.getTime();
  const to = toDate.getTime();
  if (to - from > MAX_RANGE_MS) {
    from = to - MAX_RANGE_MS;
  }

  const now = Date.now();
  if (now - lastCall.at < MIN_INTERVAL_MS && lastCall.promise) {
    return lastCall.promise;
  }

  const url = `${STATEMENT_URL}/${jarId}/${Math.floor(from / 1000)}/${Math.floor(to / 1000)}`;
  const promise = fetch(url, { headers: { "X-Token": token } }).then(async (response) => {
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Monobank API помилка ${response.status}: ${body}`);
    }
    return response.json();
  });

  lastCall = { at: now, promise };
  return promise;
}

module.exports = { fetchJarStatement };
