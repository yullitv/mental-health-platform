// Інтеграційні тести обмежень бази даних: атомарне бронювання слота під
// конкурентним навантаженням, унікальні обмеження донатів, відгуків і щоденника,
// каскадне видалення.
const test = require("node:test"); const assert = require("node:assert/strict");
const { Pool } = require("pg");

// Ці тести ОЧИЩАЮТЬ таблиці (TRUNCATE), тому працюють лише з окремою тестовою
// базою, до якої застосовано міграції проєкту (npx prisma migrate deploy).
// Адресу передають через TEST_DATABASE_URL; назва бази має містити "test",
// а сама адреса не може збігатися з робочою DATABASE_URL. Інакше тести пропускаються.
const url = process.env.TEST_DATABASE_URL || "";
let dbName = "";
try { dbName = new URL(url).pathname.slice(1); } catch { dbName = ""; }
const skip = !url || !/test/i.test(dbName) || url === process.env.DATABASE_URL
  ? "потрібна окрема тестова база в TEST_DATABASE_URL (назва з \"test\")"
  : false;
const pool = skip ? null : new Pool({ connectionString: url, max: 30 });
const q = (s, p) => pool.query(s, p);
async function seed() {
  await q(`TRUNCATE "User","Fundraiser" CASCADE`);
  await q(`INSERT INTO "User"(id,"clerkId",email,role,"updatedAt") VALUES ('u_c','ck_c','c@t.ua','CLIENT',now()),('u_s','ck_s','s@t.ua','SPECIALIST',now())`);
  await q(`INSERT INTO "SpecialistProfile"(id,"userId","verificationStatus") VALUES ('sp1','u_s','APPROVED')`);
  await q(`INSERT INTO "AvailabilitySlot"(id,"specialistId","startTime","endTime") VALUES ('slot1','sp1',now()+interval '1 day',now()+interval '1 day 1 hour')`);
  await q(`INSERT INTO "Fundraiser"(id,name,"bankJarUrl","updatedAt") VALUES ('f1','Фонд','https://send.monobank.ua/jar/x',now())`);
}
test.after(() => pool && pool.end());
test("Бронювання: 25 одночасних спроб забронювати слот - успішна рівно одна", { skip }, async () => {
  await seed();
  const attempt = async () => { const c = await pool.connect(); try { await c.query("BEGIN");
    const r = await c.query(`UPDATE "AvailabilitySlot" SET "isBooked"=true WHERE id='slot1' AND "isBooked"=false`);
    if (r.rowCount === 0) { await c.query("ROLLBACK"); return 0; }
    await c.query(`INSERT INTO "Session"(id,"clientId","specialistId","startTime","endTime","slotId","updatedAt") SELECT 'sess_'||md5(random()::text),'u_c','sp1',"startTime","endTime",id,now() FROM "AvailabilitySlot" WHERE id='slot1'`);
    await c.query("COMMIT"); return 1; } catch (e) { await c.query("ROLLBACK"); return 0; } finally { c.release(); } };
  const res = await Promise.all(Array.from({ length: 25 }, attempt));
  assert.equal(res.reduce((a, b) => a + b, 0), 1);
  assert.equal(Number((await q(`SELECT count(*) FROM "Session" WHERE "slotId"='slot1'`)).rows[0].count), 1);
});
test("Сесія: один слот не може належати двом сесіям (UNIQUE slotId)", { skip }, async () => {
  await assert.rejects(q(`INSERT INTO "Session"(id,"clientId","specialistId","startTime","endTime","slotId","updatedAt") VALUES ('dup','u_c','sp1',now(),now(),'slot1',now())`), /unique/i);
});
test("Донат: повторне використання того самого скріна (proofHash) відхиляється", { skip }, async () => {
  const sid = (await q(`SELECT id FROM "Session" LIMIT 1`)).rows[0].id;
  await q(`INSERT INTO "Donation"(id,"sessionId","fundraiserId",amount,"proofHash","updatedAt") VALUES ('d1',$1,'f1',500,'abc',now())`, [sid]);
  await assert.rejects(q(`INSERT INTO "Donation"(id,"sessionId","fundraiserId",amount,"proofHash","updatedAt") VALUES ('d2',$1,'f1',500,'abc',now())`, [sid]), /unique/i);
});
test("Донат: одна банківська транзакція не підтверджує два донати", { skip }, async () => {
  const sid = (await q(`SELECT id FROM "Session" LIMIT 1`)).rows[0].id;
  await q(`INSERT INTO "Donation"(id,"sessionId","fundraiserId",amount,"bankTransactionId","updatedAt") VALUES ('d3',$1,'f1',500,'tx1',now())`, [sid]);
  await assert.rejects(q(`INSERT INTO "Donation"(id,"sessionId","fundraiserId",amount,"bankTransactionId","updatedAt") VALUES ('d4',$1,'f1',500,'tx1',now())`, [sid]), /unique/i);
});
test("Відгук: не більше одного відгуку на сесію", { skip }, async () => {
  const sid = (await q(`SELECT id FROM "Session" LIMIT 1`)).rows[0].id;
  await q(`INSERT INTO "Review"(id,"sessionId","clientId","specialistId",rating) VALUES ('r1',$1,'u_c','sp1',5)`, [sid]);
  await assert.rejects(q(`INSERT INTO "Review"(id,"sessionId","clientId","specialistId",rating) VALUES ('r2',$1,'u_c','sp1',4)`, [sid]), /unique/i);
});
test("Щоденник: один запис на користувача за день (UNIQUE userId+date)", { skip }, async () => {
  await q(`INSERT INTO "DiaryEntry"(id,"userId",date,"cipherText") VALUES ('e1','u_c','2026-11-01','x')`);
  await assert.rejects(q(`INSERT INTO "DiaryEntry"(id,"userId",date,"cipherText") VALUES ('e2','u_c','2026-11-01','y')`), /unique/i);
});
test("Каскадне видалення: видалення користувача видаляє його записи щоденника", { skip }, async () => {
  await q(`INSERT INTO "User"(id,"clerkId",email,"updatedAt") VALUES ('u_x','ck_x','x@t.ua',now())`);
  await q(`INSERT INTO "DiaryEntry"(id,"userId",date,"cipherText") VALUES ('e9','u_x','2026-11-02','z')`);
  await q(`DELETE FROM "User" WHERE id='u_x'`);
  assert.equal(Number((await q(`SELECT count(*) FROM "DiaryEntry" WHERE "userId"='u_x'`)).rows[0].count), 0);
});
