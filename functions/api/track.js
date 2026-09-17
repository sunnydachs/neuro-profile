// functions/api/track.js — privacy-first event beacon endpoint.
// Receives POST /api/track with { events: [{ name, props... }] } and writes each
// event to the Workers Analytics Engine dataset bound as NEURO_METRICS.
//
// Privacy: no cookies, no IPs stored, no fingerprinting. The client sends an
// ephemeral random session id (in-memory only, per page load) so funnel steps
// within a single visit can be ordered. Nothing persists on the client.
//
// Abuse controls (proportionate for a free static site):
// - Same-origin POST only (Origin header must match the deployment host) —
//   blocks trivial cross-site replay/inflation from curl or other hosts.
// - Strict allowlists for every dimension (event name, lang, sid format,
//   4-letter type code, share target, reliability grade) so arbitrary strings
//   (e.g. PII) can never enter the dataset and cardinality stays bounded.
// - Max 10 events per request.
//
// Schema (stable — do not reorder; AE blobs are positional):
//   blobs[0]  event name        quiz_start | quiz_complete | share_click
//   blobs[1]  language          ja | en
//   blobs[2]  session id        [a-z0-9]{4,32} — random per page load
//   blobs[3]  type code         [A-Z]{4} when known (quiz_complete, share_*)
//   blobs[4]  share target      x | line | text | url | card (share_click only)
//   blobs[5]  reliability grade high | mid | low (quiz_complete only)
//   doubles[0] duration seconds quiz time (quiz_complete only)
//   doubles[1] answered count  regular items answered (quiz_complete only)
//   indexes[0] date (YYYY-MM-DD, UTC) — sampling/retention key

const EVENTS = ["quiz_start", "quiz_complete", "share_click"];
const LANGS = ["ja", "en"];
const TARGETS = ["x", "line", "text", "url", "card"];
const GRADES = ["high", "mid", "low"];
const SID_RE = /^[a-z0-9]{4,32}$/;
const CODE_RE = /^[A-Z]{4}$/;

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false; // curl / no-origin POSTs are not our beacon
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function clean(value, allow) {
  return typeof value === "string" && allow.includes(value) ? value : "";
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Only accept beacons from our own pages (blocks trivial off-site inflation).
  if (!sameOrigin(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const events = Array.isArray(body && body.events) ? body.events : [];
  if (events.length === 0 || events.length > 10) {
    return json({ ok: false, error: "events must be 1..10" }, 400);
  }

  const date = new Date().toISOString().slice(0, 10);
  let written = 0;

  for (const ev of events) {
    if (!ev || typeof ev.name !== "string" || !EVENTS.includes(ev.name)) continue;
    // sid must match the exact format our client generates — anything else is
    // dropped, so arbitrary strings (incl. PII) can never reach the dataset.
    const sid = typeof ev.sid === "string" && SID_RE.test(ev.sid) ? ev.sid : "";
    if (!sid) continue;
    // Enum-validated dimensions; empty string when absent/not applicable.
    const lang = clean(ev.lang, LANGS);
    const typeCode = typeof ev.typeCode === "string" && CODE_RE.test(ev.typeCode) ? ev.typeCode : "";
    const target = ev.name === "share_click" ? clean(ev.target, TARGETS) : "";
    const grade = ev.name === "quiz_complete" ? clean(ev.grade, GRADES) : "";
    env.NEURO_METRICS.writeDataPoint({
      blobs: [ev.name, lang, sid, typeCode, target, grade],
      doubles: [num(ev.durationSec, 0, 6 * 3600), num(ev.answered, 0, 50)],
      indexes: [date],
    });
    written++;
  }

  return json({ ok: true, written }, 202);
}

export async function onRequestGet() {
  // Health check for the beacon (also lets us verify the deployment quickly).
  return json({ ok: true, beacon: "neuro-metrics" }, 200);
}

function num(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
