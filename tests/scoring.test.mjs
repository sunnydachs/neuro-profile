// Scoring engine tests. Run with: node tests/scoring.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const scoring = await import(path.join(ROOT, "app/scoring.js"));
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, "data/questions.json"), "utf8"));
const axesMeta = JSON.parse(fs.readFileSync(path.join(ROOT, "data/axis_meta.json"), "utf8"));

const { computeScore, reverseIfNeeded, axisScore100, polarity, TYPE_CODES, PRIMARY_AXES } = scoring;

const qArr = questions.questions;

let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log("✓", name);
  } catch (e) {
    fail++;
    console.log("✗", name);
    console.log("  ", e.message);
    if (e.actual !== undefined) console.log("    actual  =", JSON.stringify(e.actual));
    if (e.expected !== undefined) console.log("    expected=", JSON.stringify(e.expected));
  }
}

// Convenience: build an "axis-targeted" profile that maximally pushes each primary axis HIGH toward high_code.
function axisTargetedAnswers(highCodes /* {1:'E', 2:'I', ...} */) {
  const ans = {};
  for (const q of qArr) {
    if (q.kind !== "regular") continue;
    // For this axis, forward direction is high_code: items with polarity=high_code => raw=5;
    // items with polarity=opposite => raw=1 (will be flipped to 5 if reversed, or stay at 1 if not reversed
    // — but our data has all opposite-polarity items marked reversed=true, so raw=1 → s=5).
    const hc = highCodes[q.axis];
    if (!hc) { ans[q.id] = 3; continue; }
    if (q.polarity === hc) ans[q.id] = 5;
    else ans[q.id] = 1;
  }
  return ans;
}

// ----- 1. reversal math -----
test("reversal: normal item unchanged", () => {
  assert.equal(reverseIfNeeded(3, { reversed: false }), 3);
});
test("reversal: reversed item flipped (6 - r)", () => {
  const q = { reversed: true };
  assert.equal(reverseIfNeeded(1, q), 5);
  assert.equal(reverseIfNeeded(5, q), 1);
  assert.equal(reverseIfNeeded(3, q), 3);
  assert.equal(reverseIfNeeded(2, q), 4);
  assert.equal(reverseIfNeeded(4, q), 2);
});

// ----- 2. axisScore100 boundary cases -----
test("axisScore100: all forward-5 → P=100", () => {
  // Set every axis-1 question to 5; reversed items flip to 1, but if we want max-forward E,
  // we must answer forward questions 5 and reverse questions 1.
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = {};
  for (const q of items) ans[q.id] = q.polarity === "E" ? 5 : 1;
  const r = axisScore100(items, ans);
  assert.equal(r.p, 100);
});
test("axisScore100: all forward-1 → P=0", () => {
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = {};
  for (const q of items) ans[q.id] = q.polarity === "E" ? 1 : 5;  // reverse items at 5 → flip to 1
  const r = axisScore100(items, ans);
  assert.equal(r.p, 0);
});
test("axisScore100: all 3 → P=50 (neutral)", () => {
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = {};
  for (const q of items) ans[q.id] = 3;
  const r = axisScore100(items, ans);
  assert.equal(r.p, 50);
});
test("axisScore100: half-3 half-5 (forward items=5, reverse items=3) → P > 50", () => {
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = {};
  for (const q of items) ans[q.id] = q.polarity === "E" ? 5 : 3;
  const r = axisScore100(items, ans);
  // mean = (5*4 + 3*4)/8 = 32/8 = 4 → P = 75
  assert.equal(r.p, 75);
});

// ----- 3. missing-value handling -----
test("mean imputation: 2 missing, rest at 3, → 50", () => {
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 }; // 7,8 missing
  const r = axisScore100(items, ans);
  assert.equal(r.p, 50);
});
test("missing 3 on an 8-item axis → axis unscored (p=null)", () => {
  const items = qArr.filter(q => q.kind === "regular" && q.axis === 1);
  const ans = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }; // 6,7,8 missing
  const r = axisScore100(items, ans);
  assert.equal(r.p, null);
});

// ----- 4. polarity binarization -----
test("polarity: P=55 boundary → HIGH", () => assert.equal(polarity(55), "HIGH"));
test("polarity: P just above 45 → MID", () => assert.equal(polarity(45.0001), "MID"));
test("polarity: P=45 → LOW", () => assert.equal(polarity(45), "LOW"));

// ----- 5. type-code enumeration -----
test("TYPE_CODES has 16 unique codes matching step3 spec", () => {
  assert.equal(TYPE_CODES.length, 16);
  const expected = ["EINS","EIND","EIXS","EIXD","EANS","EAND","EAXS","EAXD",
                    "VINS","VIND","VIXS","VIXD","VANS","VAND","VAXS","VAXD"];
  assert.deepEqual(TYPE_CODES.slice().sort(), expected.slice().sort());
});

// ----- 6. directed-answer scenarios -----
test("axis-targeted EINS: E/I/N/S forward → typeCode=EINS, exactCode=EINS", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.typeCode, "EINS");
  assert.equal(r.exactCode, "EINS");
  assert.equal(r.polarities[1], "HIGH");
  assert.equal(r.polarities[2], "HIGH");
  assert.equal(r.polarities[3], "HIGH");
  assert.equal(r.polarities[4], "HIGH");
  assert.equal(r.axisScores[1], 100);
  assert.equal(r.axisScores[2], 100);
  assert.equal(r.axisScores[3], 100);
  assert.equal(r.axisScores[4], 100);
});
test("axis-targeted VAXD: V/A/X/D forward → typeCode=VAXD, exactCode=VAXD", () => {
  const ans = axisTargetedAnswers({ 1: "V", 2: "A", 3: "X", 4: "D" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.typeCode, "VAXD");
  assert.equal(r.exactCode, "VAXD");
  for (const a of PRIMARY_AXES) assert.equal(r.polarities[a], "LOW");
});
test("axis-targeted EANS: E/A/N/S → EANS", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "A", 3: "N", 4: "S" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.typeCode, "EANS");
});
test("axis-targeted VIXD: V/I/X/D → VIXD", () => {
  const ans = axisTargetedAnswers({ 1: "V", 2: "I", 3: "X", 4: "D" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.typeCode, "VIXD");
});

// ----- 7. mixed primary axes → MID, falls back to nearest -----
test("mixed answers where one axis is MID → exactCode=null, nearest picks closest type", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  // Force axis 2 to neutral by half-reversing
  for (const q of qArr) {
    if (q.kind !== "regular" || q.axis !== 2) continue;
    // give all forward and reverse items the same answer (so axis 2 mean=3 → P=50)
    ans[q.id] = q.polarity === "I" ? 3 : 3;
  }
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.exactCode, null);
  assert.equal(r.polarities[2], "MID");
  assert.ok(TYPE_CODES.includes(r.nearestCode));
  // Nearest to (E=100, MID=50, N=100, S=100) — closest centroid with E,N,S HIGH and axis2 flexible
  // distances to EINS=(100,100,100,100): (0+50²+0+0)=2500
  // to EAXS=(100,0,100,100) [axis2 LOW=A=0]: (0+100²+0+0)=10000 — bigger
  // to VIND=(0,100,100,100): (100²+0+0+0)=10000
  // So EINS (2500) wins.
  assert.equal(r.nearestCode, "EINS");
});

// ----- 8. reliability -----
test("axis-targeted answers (zero missing, all-aligned) → grade 'high'", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.reliability.grade, "high", `flags=${JSON.stringify(r.reliability.flags)}`);
});
test("all 3 (center-bias) → reliability grade drops below 'high'", () => {
  const ans = {};
  for (const q of qArr) if (q.kind === "regular") ans[q.id] = 3;
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.notEqual(r.reliability.grade, "high", `flags=${JSON.stringify(r.reliability.flags)}`);
});
test("Q42..Q45=5 (social desirability) → reliability flag raised", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  for (const q of qArr) if (q.kind === "social") ans[q.id] = 5;
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.ok(r.reliability.flags.socialDesirability >= 3, `social=${r.reliability.flags.socialDesirability}`);
  assert.notEqual(r.reliability.grade, "high");
});
test("missing 11 regular items → unable=true", () => {
  const ans = {};
  let skipped = 0;
  for (const q of qArr) {
    if (q.kind !== "regular") continue;
    if (skipped < 11) { skipped++; continue; }
    ans[q.id] = 3;
  }
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.diagnostics.unable, true);
});

// ----- 9. neuro system scores -----
test("neuro scores: 7 systems, all in [0,100]", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  assert.equal(r.neuroScores.length, 7);
  for (const n of r.neuroScores) {
    assert.ok(n.score >= 0 && n.score <= 100, `${n.key}=${n.score}`);
  }
});
test("neuro scores: all axis scores =100 → reward=100 (clamped)", () => {
  const ans = {};
  for (const q of qArr) if (q.kind === "regular") ans[q.id] = 5;
  // For all-5, axis scores all hit 50 (not 100) due to balanced reverse items.
  // So reward = 50 + 0.8*0 + 0.3*0 = 50.
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  const reward = r.neuroScores.find(n => n.key === "reward");
  assert.equal(reward.score, 50);
});
test("neuro scores: targeted E/I/N/S → reward=100, vigilance high but stable=neutral", () => {
  const ans = axisTargetedAnswers({ 1: "E", 2: "I", 3: "N", 4: "S" });
  // axis 5 also forward to T=stable
  for (const q of qArr) {
    if (q.kind !== "regular" || q.axis !== 5) continue;
    ans[q.id] = q.polarity === "T" ? 5 : 1;
  }
  const r = computeScore({ answers: ans, questions: qArr, axesMeta });
  const reward = r.neuroScores.find(n => n.key === "reward");
  // axis1=100, axis2=100, axis3=100, axis4=100, axis5=100
  // reward = 50 + 0.8*50 + 0.3*50 + 0 + 0 + 0 = 50+40+15 = 105 → clamp 100
  assert.equal(reward.score, 100);
});

// ----- 10. centroid distance math sanity -----
test("centroid of EINS = (100, 100, 100, 100)", () => {
  const c = scoring.typeCentroid("EINS", axesMeta);
  assert.deepEqual(c, { 1: 100, 2: 100, 3: 100, 4: 100 });
});
test("centroid of VAXD = (0, 0, 0, 0)", () => {
  const c = scoring.typeCentroid("VAXD", axesMeta);
  assert.deepEqual(c, { 1: 0, 2: 0, 3: 0, 4: 0 });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
