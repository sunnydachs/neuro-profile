// app/scoring.js — pure scoring engine (no DOM, no I/O).
// Implements the math defined in docs/step5-scoring.md.
//
// Public API (used by app.js and by tests/scoring.test.mjs):
//   computeScore({ answers, questions, axesMeta }) -> {
//     axisScores: { 1..5: number 0..100 },
//     polarities: { 1..4: 'HIGH'|'LOW'|'MID' },
//     typeCode: 'EINS' (nearest),
//     typeDistances: { EINS: distance, ... } sorted asc,
//     secondCode: 'XXXX' or null,
//     neuroScores: { reward:number, ... } 0..100 sorted desc,
//     reliability: { overall:'high'|'mid'|'low', flags: { ... }, ... },
//     diagnostics: { answered, missing, allSame, ... }
//   }
//
// inputs:
//   answers: { [questionId]: number 1..5 }    // 0/null for unanswered
//   questions: questions.json shape (array of {id, axis, polarity, reversed, kind, text})
//   axesMeta: axis_meta.json shape ({ axes, neuro_systems })

const PRIMARY_AXES = [1, 2, 3, 4];
const ALL_AXES = [1, 2, 3, 4, 5];
const TYPE_CODES = (function () {
  const codes = [];
  for (const a of ["E", "V"]) for (const b of ["I", "A"]) for (const c of ["N", "X"]) for (const d of ["S", "D"]) codes.push(a + b + c + d);
  return codes;
})();

function reverseIfNeeded(r, q) {
  if (r == null) return null;
  return q.reversed ? 6 - r : r;
}

// 2.2 missing-answer handling (mean imputation per axis, capped at 2 missing/axis).
function axisMeanAndMissing(items, answers) {
  const present = [];
  const missing = [];
  for (const q of items) {
    const r = answers[q.id];
    if (r == null || r === 0) missing.push(q.id);
    else present.push(reverseIfNeeded(r, q));
  }
  const mean = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
  return { present, missing, mean, total: items.length };
}

function axisScore100(items, answers) {
  const { present, missing, mean } = axisMeanAndMissing(items, answers);
  if (present.length === 0) return { p: null, presentCount: 0, missingCount: missing.length, axisMean: null };
  // step5 §2.2: ≤2 missing -> impute; ≥3 missing -> axis unscored.
  if (missing.length >= 3) return { p: null, presentCount: present.length, missingCount: missing.length, axisMean: null };
  const imputed = present.slice();
  if (missing.length > 0 && mean != null) {
    for (let i = 0; i < missing.length; i++) imputed.push(mean);
  }
  const axisMean = imputed.reduce((a, b) => a + b, 0) / imputed.length;
  // P_d = (axisMean - 1) / 4 * 100
  const p = ((axisMean - 1) / 4) * 100;
  return { p, presentCount: present.length, missingCount: missing.length, axisMean };
}

// 4.1 polarity binarization
function polarity(p) {
  if (p >= 55) return "HIGH";
  if (p <= 45) return "LOW";
  return "MID";
}

// 4.3 nearest-type (over primary 4 axes)
function typeCentroid(code, axesMeta) {
  const map = {};
  for (const axis of axesMeta.axes.filter(a => a.type_role === "primary")) {
    const bit = code[axis.id - 1];
    map[axis.id] = bit === axis.high_code ? 100 : 0;
  }
  return map;
}

function distanceToType(profileScores, centroid) {
  let d = 0;
  for (const axisId of PRIMARY_AXES) {
    const diff = (profileScores[axisId] ?? 50) - centroid[axisId];
    d += diff * diff;
  }
  return d;
}

function nearestTypeCode(profileScores, axesMeta) {
  const scored = TYPE_CODES.map(code => ({ code, d: distanceToType(profileScores, typeCentroid(code, axesMeta)) }));
  scored.sort((a, b) => a.d - b.d);
  return scored;
}

// 5. neuro system scores from P_d
function neuroScores(profileScores, axesMeta) {
  const out = {};
  for (const ns of axesMeta.neuro_systems) {
    let s = 50;
    for (const axis of axesMeta.axes) {
      const w = ns.weights[String(axis.id)] || 0;
      s += w * ((profileScores[axis.id] ?? 50) - 50);
    }
    out[ns.key] = clamp(s, 0, 100);
  }
  return out;
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// 6. reliability
function reliability(answers, questions, axisScores) {
  const flags = {};
  // answered counts (regular only)
  const regular = questions.filter(q => q.kind === "regular");
  const answered = regular.filter(q => answers[q.id] != null && answers[q.id] !== 0).length;
  flags.answered = answered;
  flags.missing = regular.length - answered;
  flags.missingRatio = flags.missing / regular.length;

  // consistency: same-polarity pairs within axis (use first/last 2 items of each axis as a coarse proxy)
  let totalPair = 0, sumAbs = 0;
  for (const axis of [1, 2, 3, 4, 5]) {
    const items = regular.filter(q => q.axis === axis);
    // all pairs in the axis, comparing on the same-polarity-direction scale after reversal
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = answers[items[i].id], b = answers[items[j].id];
        if (a == null || b == null) continue;
        const sa = reverseIfNeeded(a, items[i]);
        const sb = reverseIfNeeded(b, items[j]);
        // Only count same-direction pairs (both reversed vs both not, or both same).
        const sameDirection = items[i].reversed === items[j].reversed;
        if (!sameDirection) continue;
        totalPair++;
        sumAbs += Math.abs(sa - sb);
      }
    }
  }
  flags.consistencyPairs = totalPair;
  flags.consistencyAvgAbsDiff = totalPair ? sumAbs / totalPair : null;
  flags.consistencyScore = totalPair ? 1 - flags.consistencyAvgAbsDiff / 4 : 0.5;

  // social desirability: count high answers (4 or 5) on Q41-45 kind=social; improbable = kind=attention with 4 or 5
  let socialHigh = 0, attentionHigh = 0;
  for (const q of questions) {
    const r = answers[q.id];
    if (r == null) continue;
    if (q.kind === "social" && r >= 4) socialHigh++;
    if (q.kind === "attention" && r >= 4) attentionHigh++;
  }
  flags.socialDesirability = socialHigh;
  flags.attentionExtreme = attentionHigh;

  // central / extreme
  const all = regular.map(q => answers[q.id]).filter(r => r != null);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of all) counts[r] = (counts[r] || 0) + 1;
  const total = all.length;
  flags.centerRatio = total ? counts[3] / total : 0;
  flags.extremeRatio = total ? (counts[1] + counts[5]) / total : 0;
  flags.allSameValue = total > 0 && Object.values(counts).filter(c => c > 0).length === 1;

  // overall reliability grade
  let score = 0;
  // missing
  if (flags.missing === 0) score += 0;
  else if (flags.missing <= 3) score += 1;
  else if (flags.missing <= 9) score += 2;
  else score += 4; // 10+ missing -> unable

  // consistency
  if (flags.consistencyAvgAbsDiff == null) score += 1;
  else if (flags.consistencyAvgAbsDiff < 1.2) score += 0;
  else if (flags.consistencyAvgAbsDiff < 2.0) score += 1;
  else score += 2;

  // social
  score += flags.socialDesirability >= 2 ? 2 : (flags.socialDesirability === 1 ? 1 : 0);
  // attention
  score += flags.attentionExtreme >= 2 ? 2 : (flags.attentionExtreme === 1 ? 1 : 0);

  // central / extreme
  if (flags.centerRatio > 0.6) score += 2;
  if (flags.extremeRatio > 0.7) score += 1;
  if (flags.allSameValue) score += 2;

  let grade;
  if (score <= 1) grade = "high";
  else if (score <= 4) grade = "mid";
  else grade = "low";

  return { grade, score, flags };
}

// main entry
function computeScore(input) {
  const { answers, questions, axesMeta } = input;
  const regular = questions.filter(q => q.kind === "regular");
  // compute axis scores
  const axisScores = {};
  const diagnostics = { perAxis: {} };
  for (const axisId of ALL_AXES) {
    const items = regular.filter(q => q.axis === axisId);
    const r = axisScore100(items, answers);
    axisScores[axisId] = r.p;
    diagnostics.perAxis[axisId] = { present: r.presentCount, missing: r.missingCount, axisMean: r.axisMean };
  }

  // polarity per primary axis
  const polarities = {};
  for (const axisId of PRIMARY_AXES) {
    const p = axisScores[axisId];
    polarities[axisId] = p == null ? "MID" : polarity(p);
  }

  // nearest type
  const scored = nearestTypeCode(axisScores, axesMeta);
  const typeCode = scored[0].code;
  const secondCode = scored[1].code;
  const secondDelta = scored[1].d - scored[0].d;
  const typeDistances = Object.fromEntries(scored.map(s => [s.code, s.d]));

  // also an "exact" type from polarities when all primary are HIGH or LOW
  let exactCode = null;
  if (PRIMARY_AXES.every(a => polarities[a] !== "MID")) {
    exactCode = PRIMARY_AXES.map(a => {
      const axis = axesMeta.axes.find(x => x.id === a);
      return polarities[a] === "HIGH" ? axis.high_code : axis.low_code;
    }).join("");
  }

  // neuro scores
  const nsRaw = neuroScores(axisScores, axesMeta);
  const neuroScoresOrdered = axesMeta.neuro_systems
    .map(ns => ({ key: ns.key, label: ns.label, score: nsRaw[ns.key] }))
    .sort((a, b) => b.score - a.score);

  // reliability
  const rel = reliability(answers, questions, axisScores);
  const unable = rel.flags.missing >= 10; // step5 §7.1

  // explicit-code vs nearest-code handling: use exactCode if available, else nearest
  const finalCode = exactCode || typeCode;

  return {
    axisScores,
    polarities,
    typeCode: finalCode,
    exactCode,
    nearestCode: typeCode,
    secondCode,
    secondDelta,
    typeDistances,
    neuroScores: neuroScoresOrdered,
    reliability: rel,
    diagnostics: Object.assign(diagnostics, { answered: rel.flags.answered, missing: rel.flags.missing, unable }),
  };
}

export {
  computeScore,
  reverseIfNeeded,
  axisScore100,
  polarity,
  distanceToType,
  typeCentroid,
  nearestTypeCode,
  neuroScores,
  reliability,
  TYPE_CODES,
  PRIMARY_AXES,
};
