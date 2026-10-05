// Client helper: pageKind() must classify Cloudflare Pages clean URLs (no .html).
// Regression guard — the first cut matched on ".html" and mislabelled /type as home.
import assert from "node:assert/strict";

globalThis.location = { pathname: "/" };
const { pageKind } = await import("../app/metrics.js");

let pass = 0, fail = 0;
function check(pathname, expected) {
  globalThis.location.pathname = pathname;
  try {
    assert.equal(pageKind(), expected);
    pass++; console.log("✓", pathname, "→", expected);
  } catch (e) {
    fail++; console.log("✗", pathname, "expected", expected, "got", pageKind());
  }
}

for (const p of ["/", "/index.html", "/en/", "/en", "/en/index.html"]) check(p, "home");
for (const p of ["/types", "/types.html", "/en/types", "/en/types.html"]) check(p, "types");
for (const p of ["/type", "/type.html", "/en/type", "/en/type.html", "/type-EINS", "/og/type-eins"]) check(p, "type");
// Note: the ?type=EINS query lives in location.search, so pathname stays "/type".

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
