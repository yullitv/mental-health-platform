const test = require("node:test"); const assert = require("node:assert/strict");
const express = require("express");
const { apiLimiter, aiLimiter } = require("../src/middlewares/rateLimiters.js");
function start(mw, pre) { const app = express(); if (pre) app.use(pre); app.get("/x", mw, (q, r) => r.json({ ok: 1 })); return new Promise((res) => { const s = app.listen(0, () => res(s)); }); }
test("aiLimiter: 16-й AI-запит за 15 хв отримує 429", async () => {
  const s = await start(aiLimiter, (q, r, n) => { q.dbUser = { id: "user-A" }; n(); });
  const url = "http://127.0.0.1:" + s.address().port + "/x"; const codes = [];
  for (let i = 0; i < 16; i++) codes.push((await fetch(url)).status);
  s.close();
  assert.equal(codes.slice(0, 15).every((c) => c === 200), true); assert.equal(codes[15], 429);
});
test("aiLimiter: ліміт рахується окремо для кожного користувача", async () => {
  let uid = "user-B"; const s = await start(aiLimiter, (q, r, n) => { q.dbUser = { id: uid }; n(); });
  const url = "http://127.0.0.1:" + s.address().port + "/x";
  for (let i = 0; i < 15; i++) await fetch(url);
  uid = "user-C"; const st = (await fetch(url)).status; s.close();
  assert.equal(st, 200);
});
test("apiLimiter: 301-й запит отримує 429 і JSON-повідомлення", async () => {
  const s = await start(apiLimiter); const url = "http://127.0.0.1:" + s.address().port + "/x"; let last;
  for (let i = 0; i < 301; i++) last = await fetch(url);
  const body = await last.json(); s.close();
  assert.equal(last.status, 429); assert.match(body.message, /Забагато запитів/);
});
test("CORS: CLIENT_ORIGIN розбирається у список дозволених origin", () => {
  process.env.CLIENT_ORIGIN = "http://localhost:5173, https://opora.example.com";
  delete require.cache[require.resolve("../src/corsConfig.js")];
  const { allowedOrigins } = require("../src/corsConfig.js");
  assert.deepEqual(allowedOrigins, ["http://localhost:5173", "https://opora.example.com"]);
});
