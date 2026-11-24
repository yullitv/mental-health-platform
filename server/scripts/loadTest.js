// Навантажувальний тест публічних ендпоінтів сервера.
// Запуск: node scripts/loadTest.js <адреса-сервера> [користувачів] [секунд] [пауза, мс]
// Кожен віртуальний користувач циклічно відкриває каталог, картку спеціаліста
// та його вільні слоти, як це робить гість у браузері. Кожен користувач
// надсилає власну адресу в X-Forwarded-For: на локальному стенді це імітує
// різних клієнтів для обмежувача частоти запитів (на Render заголовок
// перезаписує проксі платформи).
const base = (process.argv[2] || "").replace(/\/$/, "");
const users = Number(process.argv[3] || 50);
const seconds = Number(process.argv[4] || 60);
const think = Number(process.argv[5] ?? 1000); // пауза між діями користувача
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!base) { console.error("Вкажіть адресу сервера"); process.exit(1); }

const times = []; let errors = 0; let limited = 0;
async function hit(path, ip) {
  const t0 = performance.now();
  try {
    const r = await fetch(base + path, { headers: { "X-Forwarded-For": ip } });
    const body = await r.text();
    times.push(performance.now() - t0);
    if (r.status === 429) limited++; else if (!r.ok) errors++;
    return r.ok ? JSON.parse(body) : null;
  } catch { errors++; times.push(performance.now() - t0); return null; }
}
async function user(n, deadline) {
  const ip = `10.0.${Math.floor(n / 250)}.${(n % 250) + 1}`;
  while (Date.now() < deadline) {
    const list = await hit("/api/specialists", ip);
    const id = Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)].id : null;
    await sleep(think);
    if (id) { await hit(`/api/specialists/${id}`, ip); await sleep(think); await hit(`/api/availability/${id}`, ip); await sleep(think); }
  }
}
(async () => {
  await fetch(base + "/health").catch(() => {});
  const start = Date.now(); const deadline = start + seconds * 1000;
  await Promise.all(Array.from({ length: users }, (_, n) => user(n, deadline)));
  const dur = (Date.now() - start) / 1000;
  times.sort((a, b) => a - b);
  const p = (q) => Math.round(times[Math.min(times.length - 1, Math.floor(q * times.length))]);
  console.log(JSON.stringify({
    users, think_ms: think, seconds: Math.round(dur), requests: times.length, rps: +(times.length / dur).toFixed(1),
    p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99), max_ms: Math.round(times.at(-1)),
    over_2s: times.filter((t) => t > 2000).length, errors, rate_limited_429: limited,
  }));
})();
