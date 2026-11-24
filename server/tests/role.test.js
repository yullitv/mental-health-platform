const test = require("node:test"); const assert = require("node:assert/strict");
const { mock } = test;
const { inject, load } = require("./helpers.js");
let authUserId = null;
const users = { ck_admin: { id: "u1", role: "ADMIN" }, ck_client: { id: "u2", role: "CLIENT" } };
require.cache[require.resolve("@clerk/express")] = {
  id: "clerk", filename: "clerk", loaded: true, exports: { getAuth: () => ({ userId: authUserId }) },
};
inject("prisma.js", { user: { findUnique: async ({ where }) => users[where.clerkId] || null } });
const requireRole = load("middlewares/roleMiddleware.js");
function response() {
  const res = {}; res.status = mock.fn(() => res); res.json = mock.fn(() => res); return res;
}
async function run(userId, ...roles) {
  authUserId = userId; const req = {}; const res = response(); const next = mock.fn();
  await requireRole(...roles)(req, res, next);
  return { req, res, next, status: res.status.mock.calls[0]?.arguments[0] };
}
test("Роль: без токена — 401, обробник не викликається", async () => {
  const r = await run(null, "ADMIN");
  assert.equal(r.status, 401); assert.equal(r.next.mock.callCount(), 0);
});
test("Роль: користувача немає в базі — 401", async () => {
  assert.equal((await run("ck_unknown", "ADMIN")).status, 401);
});
test("Роль: клієнт на маршруті адміністратора — 403", async () => {
  assert.equal((await run("ck_client", "ADMIN")).status, 403);
});
test("Роль: дозволена роль передає користувача далі", async () => {
  const r = await run("ck_admin", "SPECIALIST", "ADMIN");
  assert.equal(r.next.mock.callCount(), 1); assert.equal(r.req.dbUser.id, "u1");
});
