// app/metrics.js — privacy-first funnel beacon client.
// Sends quiz/share funnel events to /api/track (Pages Function → Analytics Engine).
// No cookies, no localStorage, no fingerprinting: the session id is a random
// value generated per page load and kept only in JS memory. Best-effort by
// design — failures are swallowed and never affect the UX.

const ENDPOINT = "/api/track";

// Per-page-load ephemeral session id (not persisted anywhere client-side).
const sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function lang() {
  return (location.pathname || "").startsWith("/en/") ? "en" : "ja";
}

function send(events) {
  try {
    const body = JSON.stringify({ events });
    // sendBeacon keeps delivery reliable on mobile even if the tab closes;
    // it returns false when the payload was NOT queued — fall back to fetch.
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) {
      return;
    }
    fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } })
      .catch(() => {});
  } catch { /* never break the page for analytics */ }
}

export function trackQuizStart() {
  send([{ name: "quiz_start", lang: lang(), sid }]);
}

export function trackQuizComplete(result, durationSec, answered) {
  send([{
    name: "quiz_complete",
    lang: lang(),
    sid,
    typeCode: (result && result.typeCode) || "",
    grade: (result && result.reliability && result.reliability.grade) || "",
    durationSec: Math.round(durationSec),
    answered,
  }]);
}

export function trackShareClick(target, typeCode) {
  send([{
    name: "share_click",
    lang: lang(),
    sid,
    target,
    typeCode: typeCode || "",
  }]);
}
