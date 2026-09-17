// functions/api/track.js — privacy-first event beacon endpoint.
// Receives POST /api/track with { events: [{ name, props... }] } and writes each
// event to the Workers Analytics Engine dataset bound as NEURO_METRICS.
//
// Privacy: no cookies, no IPs stored, no fingerprinting. The client sends an
// ephemeral random session id (in-memory only, per page load) so funnel steps
// within a single visit can be ordered. Nothing persists on the client.
//
// Schema (stable — do not reorder; AE blobs are positional):
//   blobs[0]  event name        e.g. quiz_start | quiz_complete | share_click
//   blobs[1]  language          ja | en
//   blobs[2]  session id        random per page load (not persisted client-side)
//   blobs[3]  type code         4-letter code when known (quiz_complete, share_*)
//   blobs[4]  share target      x | line | text | url | card (share_click only)
//   blobs[5]  reliability grade high | mid | low (quiz_complete only)
//   doubles[0] duration seconds quiz time (quiz_complete only)
//   doubles[1] answered count  regular items answered (quiz_complete only)
//   indexes[0] date (YYYY-MM-DD, UTC) — sampling/retention key

export async function onRequestPost(context) {
  const { request, env } = context;
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

  for (const ev of events) {
    if (!ev || typeof ev.name !== "string" || ev.name.length > 40) continue;
    // Allow only our known event names — keeps the dataset cardinality tight.
    if (!["quiz_start", "quiz_complete", "share_click"].includes(ev.name)) continue;
    env.NEURO_METRICS.writeDataPoint({
      blobs: [
        ev.name,
        str(ev.lang, 8),
        str(ev.sid, 32),
        str(ev.typeCode, 4),
        str(ev.target, 8),
        str(ev.grade, 8),
      ],
      doubles: [num(ev.durationSec, 0, 6 * 3600), num(ev.answered, 0, 50)],
      indexes: [date],
    });
  }

  return json({ ok: true }, 202);
}

export async function onRequestGet() {
  // Health check for the beacon (also lets us verify the deployment quickly).
  return json({ ok: true, beacon: "neuro-metrics" }, 200);
}

function str(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
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
