const test = require("node:test"); const assert = require("node:assert/strict");
const { mock } = test;
const { inject, load } = require("./helpers.js");
let statement = []; const usedIds = [];
const fetchJarStatement = mock.fn(async () => statement);
inject("utils/monobankClient.js", { fetchJarStatement });
inject("prisma.js", { donation: { findMany: async () => usedIds.map((id) => ({ bankTransactionId: id })) } });
inject("utils/notificationHelper.js", { createNotification: () => { throw new Error("dummy"); } });
inject("utils/geminiClient.js", { getGeminiClient: () => { throw new Error("dummy"); } });
inject("utils/r2Client.js", { uploadBuffer: () => {}, getPresignedUrl: () => {} });
const { checkBankConfirmation } = load("controllers/donationController.js");
const jar = { monobankJarId: "jar1" };
const session = { createdAt: new Date() };
const SID = "cmsession00abc123";
test.beforeEach(() => { statement = []; usedIds.length = 0; fetchJarStatement.mock.resetCalls(); });

test("Донат: переказ із кодом сесії в коментарі підтверджується", async () => {
  statement = [{ id: "t1", amount: 50000, comment: "сесія abc123" }, { id: "t2", amount: 50000, comment: "" }];
  assert.deepEqual(await checkBankConfirmation(jar, session, SID, 500), { bankConfirmed: true, bankTransactionId: "t1" });
});
test("Донат: два перекази однакової суми без коду лишаються на ручну перевірку", async () => {
  statement = [{ id: "t1", amount: 50000 }, { id: "t2", amount: 50050 }];
  assert.equal((await checkBankConfirmation(jar, session, SID, 500)).bankConfirmed, false);
});
test("Донат: уже використана транзакція не підтверджує новий донат", async () => {
  statement = [{ id: "t1", amount: 50000, comment: "ABC123" }]; usedIds.push("t1");
  assert.equal((await checkBankConfirmation(jar, session, SID, 500)).bankConfirmed, false);
});
test("Донат: без банки збору виписка не запитується", async () => {
  await checkBankConfirmation({ monobankJarId: null }, session, SID, 500);
  assert.equal(fetchJarStatement.mock.callCount(), 0);
});
test("Донат: збій банківського API не ламає подання донату", async () => {
  mock.method(console, "error", () => {});
  fetchJarStatement.mock.mockImplementationOnce(async () => { throw new Error("429"); });
  assert.deepEqual(await checkBankConfirmation(jar, session, SID, 500), { bankConfirmed: false, bankTransactionId: null });
  mock.restoreAll();
});
