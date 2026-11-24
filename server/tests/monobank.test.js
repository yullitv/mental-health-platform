// Клієнт Monobank Open API: мережевий виклик замінено mock-функцією fetch.
const test = require("node:test"); const assert = require("node:assert/strict");
const { mock } = test;
process.env.MONOBANK_JAR_TOKEN = "dummy-token";
const { fetchJarStatement } = require("../src/utils/monobankClient.js");

test("Monobank: правильна адреса, заголовок і кешування в межах ліміту 60 с", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => [{ id: "tx1", amount: 50000 }] }));
  const from = new Date("2026-11-01T00:00:00Z"); const to = new Date("2026-11-02T00:00:00Z");
  const first = await fetchJarStatement("jar42", from, to);
  const second = await fetchJarStatement("jar42", from, to);
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, `https://api.monobank.ua/personal/statement/jar42/${from / 1000}/${to / 1000}`);
  assert.equal(options.headers["X-Token"], "dummy-token");
  assert.deepEqual(first, second);
  mock.restoreAll();
});
