// Integration: simulates a full quiz with a known-good answer pattern and
// checks the result page payload is well-formed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const scoring = await import(path.join(ROOT, "app/scoring.js"));
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, "data/questions.json"), "utf8"));
const rawAxesMeta = JSON.parse(fs.readFileSync(path.join(ROOT, "data/axis_meta.json"), "utf8"));
const axesMeta = {
  axes: (rawAxesMeta.axes || []).map((a) => ({
    id: a.id, name: a.name.ja, positive: a.positive.ja, negative: a.negative.ja,
    positive_short: a.positive_short.ja, negative_short: a.negative_short.ja,
    high_code: a.high_code, low_code: a.low_code, type_role: a.type_role,
  })),
  neuro_systems: (rawAxesMeta.neuro_systems || []).map((n) => ({
    key: n.key, label: n.label.ja, region: n.region.ja, description: n.description.ja,
    weights: n.weights,
  })),
};
const rawProfiles = JSON.parse(fs.readFileSync(path.join(ROOT, "data/profiles.json"), "utf8"));
// Recursively unwrap { ja, en } wrappers so the rest of the suite (which was written
// before i18n) sees flat strings/arrays again. Picks 'ja' as the primary locale for tests.
function flattenL10n(obj) {
  if (obj == null) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(flattenL10n);
  if ("ja" in obj) return flattenL10n(obj.ja);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = flattenL10n(v);
  return out;
}
const profiles = {};
for (const [code, p] of Object.entries(rawProfiles)) profiles[code] = flattenL10n(p);

// Plan C data shape: questions live under .structure with text in .text.ja
const qArr = (questions.structure || questions.questions || []);

let pass=0, fail=0;
function test(name, fn) {
  try { fn(); pass++; console.log("✓", name); }
  catch(e){ fail++; console.log("✗", name, "\n   ", e.message); }
}

// Targeted answer sets for each of the 16 types.
function ansFor(code) {
  // axis 1 letter 0, axis 2 letter 1, axis 3 letter 2, axis 4 letter 3
  const high = { 1: code[0], 2: code[1], 3: code[2], 4: code[3] };
  const ans = {};
  for (const q of qArr) {
    if (q.kind !== "regular") { ans[q.id] = 3; continue; }
    const h = high[q.axis];
    ans[q.id] = q.polarity === h ? 5 : 1;
  }
  // axis 5: forward=T
  for (const q of qArr) {
    if (q.kind !== "regular" || q.axis !== 5) continue;
    ans[q.id] = q.polarity === "T" ? 5 : 1;
  }
  return ans;
}

const allCodes = ["EINS","EIND","EIXS","EIXD","EANS","EAND","EAXS","EAXD",
                  "VINS","VIND","VIXS","VIXD","VANS","VAND","VAXS","VAXD"];

test("every type code produces a matching result and a populated profile", () => {
  for (const code of allCodes) {
    const ans = ansFor(code);
    const r = scoring.computeScore({ answers: ans, questions: qArr, axesMeta });
    assert.equal(r.typeCode, code, `${code} produced ${r.typeCode}`);
    assert.equal(r.exactCode, code);
    // Profile lookup must succeed
    const p = profiles[code];
    assert.ok(p, `profile for ${code} exists`);
    assert.ok(p.features_short && p.features_long);
    assert.ok(p.strengths.length >= 3);
    assert.ok(p.warnings.length >= 3);
    assert.ok(p.growth.length >= 2);
    assert.ok(p.scientific_background);
    assert.ok(p.scientific_note);
    // Curated medals are kept for documentation/transparency. Share text uses computed medals.
    assert.ok(p.share.title && p.share.bullets.length === 3);
  }
});

test("type ordering: TYPE_CODES iteration order is the centroid-tiebreak order", () => {
  // For a perfectly neutral user (all 3s), every type has equal distance 4*50^2=10000.
  // typeCode should be TYPE_CODES[0].
  const ans = {};
  for (const q of qArr) if (q.kind === "regular") ans[q.id] = 3;
  const r = scoring.computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.nearestCode, scoring.TYPE_CODES[0]);
});

test("MID axis fallback: when one axis is mid, typeCode resolves to nearest", () => {
  const ans = ansFor("EINS");
  // Force axis 2 to neutral
  for (const q of qArr) {
    if (q.kind === "regular" && q.axis === 2) ans[q.id] = 3;
  }
  const r = scoring.computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.polarities[2], "MID");
  assert.equal(r.exactCode, null);
  assert.equal(r.nearestCode, "EINS"); // closest centroid (axis2 flex, others 100)
});

test("neuro top3 is sorted descending and has correct length", () => {
  const ans = ansFor("EINS");
  const r = scoring.computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.neuroScores.length, 7);
  for (let i=1; i<r.neuroScores.length; i++) {
    assert.ok(r.neuroScores[i-1].score >= r.neuroScores[i].score);
  }
});

test("every type's neuro_top3 is non-empty", () => {
  for (const code of allCodes) {
    const p = profiles[code];
    assert.equal(p.neuro_top3.length, 3, `${code}`);
  }
});

test("share cards include required disclaimer line", () => {
  for (const code of allCodes) {
    const p = profiles[code];
    assert.ok(p.share.disclaimer.includes("脳の測定"), `${code} disclaimer missing`);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
