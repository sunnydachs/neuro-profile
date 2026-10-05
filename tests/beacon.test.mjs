// Beacon endpoint: validates the /api/track contract — event allowlist, the
// per-dimension allowlists (incl. the new page_view / quiz_exit events), the
// same-origin + rate-limit guards, and the positional AE schema.
import assert from "node:assert/strict";
import { onRequestPost, onRequestGet } from "../functions/api/track.js";

const HOST = "neuro-profile.pages.dev";
const URL_ = `https://${HOST}/api/track`;

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log("✓", name); }
  catch (e) { fail++; console.log("✗", name, "\n   ", e.message); }
}

// Capture what the function handed to Analytics Engine.
function mockEnv({ rateOk = true } = {}) {
  const points = [];
  return {
    points,
    env: {
      NEURO_METRICS: { writeDataPoint: (p) => points.push(p) },
      TRACK_LIMITER: { limit: async () => ({ success: rateOk }) },
    },
  };
}

function post(body, { origin = `https://${HOST}`, ip = "203.0.113.9" } = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (origin !== null) headers.origin = origin;
  return new Request(URL_, { method: "POST", headers, body: JSON.stringify(body) });
}

async function call(body, opts) {
  const { env, points } = mockEnv(opts && opts.envOpts);
  const res = await onRequestPost({ request: post(body, opts), env });
  const json = await res.json();
  return { status: res.status, json, points };
}

await test("page_view writes the page kind into blobs[6]", async () => {
  const { status, json, points } = await call({ events: [{ name: "page_view", lang: "ja", sid: "abcd1234", page: "home" }] });
  assert.equal(status, 202);
  assert.equal(json.written, 1);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "page_view");
  assert.equal(points[0].blobs[6], "home");
  assert.equal(points[0].blobs.length, 7);
});

await test("page_view with a disallowed page kind is dropped to empty (no PII/injection)", async () => {
  const { points } = await call({ events: [{ name: "page_view", lang: "ja", sid: "abcd1234", page: "<script>x</script>" }] });
  assert.equal(points[0].blobs[6], "");
});

await test("page kind is only stored for page_view (not for other events)", async () => {
  const { points } = await call({ events: [{ name: "quiz_start", lang: "ja", sid: "abcd1234", page: "home" }] });
  assert.equal(points[0].blobs[6], "");
});

await test("quiz_exit records the answered count in doubles[1]", async () => {
  const { status, points } = await call({ events: [{ name: "quiz_exit", lang: "en", sid: "abcd1234", answered: 12 }] });
  assert.equal(status, 202);
  assert.equal(points[0].blobs[0], "quiz_exit");
  assert.equal(points[0].doubles[1], 12);
});

await test("quiz_exit clamps answered to 0..50", async () => {
  const { points } = await call({ events: [
    { name: "quiz_exit", lang: "ja", sid: "abcd1234", answered: 9999 },
    { name: "quiz_exit", lang: "ja", sid: "abcd1234", answered: -5 },
  ] });
  assert.equal(points[0].doubles[1], 50);
  assert.equal(points[1].doubles[1], 0);
});

await test("unknown event names are skipped", async () => {
  const { json, points } = await call({ events: [{ name: "evil_event", lang: "ja", sid: "abcd1234" }] });
  assert.equal(json.written, 0);
  assert.equal(points.length, 0);
});

await test("missing/malformed sid is skipped", async () => {
  const { json } = await call({ events: [{ name: "page_view", lang: "ja", page: "home" }] });
  assert.equal(json.written, 0);
});

await test("cross-origin POST is rejected (403)", async () => {
  const { status, json, points } = await call(
    { events: [{ name: "page_view", lang: "ja", sid: "abcd1234", page: "home" }] },
    { origin: "https://evil.example" });
  assert.equal(status, 403);
  assert.equal(json.error, "forbidden");
  assert.equal(points.length, 0);
});

await test("no Origin header is rejected (403)", async () => {
  const { status } = await call({ events: [{ name: "page_view", lang: "ja", sid: "abcd1234", page: "home" }] }, { origin: null });
  assert.equal(status, 403);
});

await test("more than 10 events is rejected (400)", async () => {
  const events = Array.from({ length: 11 }, () => ({ name: "page_view", lang: "ja", sid: "abcd1234", page: "home" }));
  const { status, json } = await call({ events });
  assert.equal(status, 400);
  assert.match(json.error, /1\.\.10/);
});

await test("empty events array is rejected (400)", async () => {
  const { status } = await call({ events: [] });
  assert.equal(status, 400);
});

await test("rate limiter rejection returns 429", async () => {
  const { status, json } = await call(
    { events: [{ name: "page_view", lang: "ja", sid: "abcd1234", page: "home" }] },
    { envOpts: { rateOk: false } });
  assert.equal(status, 429);
  assert.equal(json.error, "rate_limited");
});

await test("onRequestGet health check responds ok", async () => {
  const res = await onRequestGet();
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
