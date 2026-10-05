// app/metrics.js — privacy-first funnel beacon client.
// Sends funnel events to /api/track (Pages Function → Analytics Engine):
//   page_view | quiz_start | quiz_complete | quiz_exit | share_click
// No cookies, no localStorage, no fingerprinting: the session id is a random
// value generated per page load and kept only in JS memory. Best-effort by
// design — failures are swallowed and never affect the UX.

const ENDPOINT = "/api/track";

// Per-page-load ephemeral session id (not persisted anywhere client-side).
const sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function lang() {
  return (location.pathname || "").startsWith("/en/") ? "en" : "ja";
}

// Coarse page classifier for the funnel denominator (folder/extension both handled).
function pageKind() {
  const path = (location.pathname || "").toLowerCase();
  if (path.includes("type.html")) return "type";
  if (path.includes("types")) return "types";
  return "home";
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

// A page was rendered. Fires once per page load (see app.js / types.js / type.js).
export function trackPageView() {
  send([{ name: "page_view", lang: lang(), sid, page: pageKind() }]);
}

// The user left in the middle of the quiz. `answered` is how far they got
// (number of questions answered) — this is the drop-off signal.
export function trackQuizExit(answered) {
  send([{ name: "quiz_exit", lang: lang(), sid, answered: Math.max(0, Math.round(Number(answered) || 0)) }]);
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
