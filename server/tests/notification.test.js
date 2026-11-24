// Сповіщення: база (fake), Socket.io і пошта (spy).
const test = require("node:test"); const assert = require("node:assert/strict");
const { mock } = test;
const { inject, load } = require("./helpers.js");
const stored = []; let failCreate = false;
inject("prisma.js", {
  notification: { create: async ({ data }) => { if (failCreate) throw new Error("db down"); const n = { id: "n" + stored.length, ...data }; stored.push(n); return n; } },
  user: { findUnique: async () => ({ email: "client@example.com" }) },
});
const emit = mock.fn(); const to = mock.fn(() => ({ emit }));
inject("socket.js", { getIo: () => ({ to }) });
const sendMail = mock.fn(async () => {});
inject("utils/mailer.js", { sendMail });
const { createNotification } = load("utils/notificationHelper.js");
const data = { userId: "u1", type: "DONATION_CONFIRMED", title: "Донат підтверджено", message: "Сесію підтверджено", link: "/sessions" };

test("Сповіщення: зберігається, надсилається в кімнату користувача і дублюється листом", async () => {
  await createNotification(data);
  await new Promise((r) => setImmediate(r));
  assert.equal(stored.length, 1);
  assert.deepEqual(to.mock.calls[0].arguments, ["user:u1"]);
  assert.equal(emit.mock.calls[0].arguments[0], "newNotification");
  assert.deepEqual(sendMail.mock.calls[0].arguments[0], { to: "client@example.com", subject: data.title, text: data.message });
});
test("Сповіщення: збій бази не перериває основну дію", async () => {
  failCreate = true; mock.method(console, "error", () => {});
  await assert.doesNotReject(createNotification(data));
  mock.restoreAll(); failCreate = false;
});
