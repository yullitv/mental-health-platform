// Модульні тести клієнтських утиліт: E2EE-шифрування, підрахунок скринінг-тестів,
// серія активності, код оплати (клієнт = сервер), облікові дані відеокімнати.
// Запуск: npm test (у папці client).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const crypto_ = await import("../src/utils/diaryCrypto.js");
const { PHQ9, GAD7, scoreTest } = await import("../src/constants/screeningTests.js");
const { computeStreakStats } = await import("../src/utils/streak.js");
const clientPay = await import("../src/utils/paymentCode.js");
const { getVideoRoomCredentials } = await import("../src/utils/videoRoom.js");
const serverPay = require("../../server/src/utils/paymentCode.js");

test("E2EE: шифрування і розшифрування повертає вихідні дані", async () => {
  const key = await crypto_.generateKey();
  const data = { mood: 4, sleepHours: 7.5, note: "Тестовий запис" };
  const ct = await crypto_.encryptEntry(key, data);
  assert.deepEqual(await crypto_.decryptEntry(key, ct), data);
});
test("E2EE: шифротекст не містить відкритого тексту", async () => {
  const key = await crypto_.generateKey();
  const ct = await crypto_.encryptEntry(key, { note: "секрет" });
  assert.ok(!Buffer.from(ct, "base64").toString("utf8").includes("секрет"));
});
test("E2EE: однакові дані дають різний шифротекст (випадковий IV)", async () => {
  const key = await crypto_.generateKey();
  const a = await crypto_.encryptEntry(key, { mood: 3 });
  const b = await crypto_.encryptEntry(key, { mood: 3 });
  assert.notEqual(a, b);
});
test("E2EE: чужий ключ не розшифровує запис", async () => {
  const k1 = await crypto_.generateKey(); const k2 = await crypto_.generateKey();
  const ct = await crypto_.encryptEntry(k1, { mood: 1 });
  assert.equal(await crypto_.tryDecrypt(k2, ct), false);
});
test("E2EE: зміна одного байта шифротексту виявляється (GCM-тег)", async () => {
  const key = await crypto_.generateKey();
  const buf = Buffer.from(await crypto_.encryptEntry(key, { mood: 5 }), "base64");
  buf[20] ^= 0x01;
  assert.equal(await crypto_.tryDecrypt(key, buf.toString("base64")), false);
});
test("E2EE: довжина ключа 256 біт", async () => {
  assert.equal(Buffer.from(await crypto_.generateKey(), "base64").length, 32);
});
test("PHQ-9: межі рівнів вираженості", () => {
  const ans = (t) => { const a = Array(9).fill(0); let r = t; for (let i = 0; i < 8 && r > 0; i++) { a[i] = Math.min(3, r); r -= a[i]; } return a; };
  const cases = [[0,"Мінімальний рівень"],[4,"Мінімальний рівень"],[5,"Легкий рівень"],[9,"Легкий рівень"],[10,"Помірний рівень"],[14,"Помірний рівень"],[15,"Помірно виражений рівень"],[19,"Помірно виражений рівень"],[20,"Виражений рівень"],[24,"Виражений рівень"]];
  for (const [t, label] of cases) { const r = scoreTest(PHQ9, ans(t)); assert.equal(r.total, t); assert.equal(r.band.label, label); }
});
test("PHQ-9: позитивна відповідь на 9-й пункт піднімає прапорець безпеки незалежно від суми", () => {
  const a = Array(9).fill(0); a[8] = 1;
  const r = scoreTest(PHQ9, a);
  assert.equal(r.total, 1); assert.equal(r.selfHarmFlag, true);
});
test("GAD-7: максимальний бал 21 і відсутність прапорця безпеки", () => {
  const r = scoreTest(GAD7, Array(7).fill(3));
  assert.equal(r.total, 21); assert.equal(r.band.label, "Виражений рівень"); assert.equal(r.selfHarmFlag, false);
});
test("Стрік: пропуск сьогоднішнього дня не обнуляє серію", () => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString(); };
  const s = computeStreakStats([d(1), d(2), d(3), d(10), d(11), d(12), d(13)]);
  assert.equal(s.currentStreak, 3); assert.equal(s.longestStreak, 4); assert.equal(s.isActiveToday, false);
});
test("Код оплати: клієнт і сервер обчислюють однаковий код", () => {
  for (const id of ["cmf1a2b3c4d5e6f7", "clx9zz8yy7xx6ww5", "abc123def456"]) {
    assert.equal(clientPay.getPaymentCode(id), serverPay.getPaymentCode(id));
    assert.equal(serverPay.getPaymentCode(id).length, 6);
  }
});
test("Відеокімната: детерміновані облікові дані для обох учасників", () => {
  const a = getVideoRoomCredentials("cmf1a2b3c4d5e6f7"), b = getVideoRoomCredentials("cmf1a2b3c4d5e6f7");
  assert.deepEqual(a, b); assert.equal(a.roomName, "opora-session-cmf1a2b3c4d5e6f7");
});
