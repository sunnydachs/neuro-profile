// app.js — UI state machine, rendering, share. No external deps.
// Source of truth: data/*.json (fetched at startup). Language resolution via app/i18n.js.
import { computeScore } from "./app/scoring.js";
import { applyLang, currentLang, fmt, onChange, pickL10n, t, withLang } from "./app/i18n.js";
import { trackQuizStart, trackQuizComplete, trackShareClick } from "./app/metrics.js";

// Data containers — populated by loadData() on startup, rebuilt when language changes.
// Shapes (after i18n resolution) match what the scoring engine and the renderers expect:
//   QUESTIONS:    { version, scale: { "5": label, ... }, questions: [ { id, axis, polarity, reversed, kind, text }, ... ] }
//   AXIS_META:    { axes: [ { id, name, positive, negative, positive_short, negative_short, high_code, low_code, type_role } ],
//                   neuro_systems: [ { key, label, region, description, weights } ] }
//   PROFILES:     { [code]: { code, name, catch, color, axis_labels, axis_focus, features_short,
//                              features_long, strengths, warnings, stress, learning, work,
//                              relationships, growth, scientific_background, scientific_note,
//                              neuro_top3, share: { title, bullets, medals, disclaimer }, neural_name } }
let QUESTIONS = null;
let AXIS_META = null;
let PROFILES = null;
let TOTAL_QUESTIONS = 0;

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// Build the localized QUESTIONS shape from the raw "plan C" data.
function buildQuestions(raw, lang) {
  const textMap = (raw.text && raw.text[lang]) || raw.text.ja || {};
  const scaleMap = (raw.scale && raw.scale[lang]) || raw.scale.ja || {};
  return {
    version: raw.version || 1,
    scale: scaleMap,
    questions: (raw.structure || []).map((s) => ({
      id: s.id, axis: s.axis, polarity: s.polarity,
      reversed: s.reversed, kind: s.kind,
      text: textMap[String(s.id)] || "",
    })),
  };
}

// Resolve the localized AXIS_META (axes[] + neuro_systems[]) for the active language.
function buildAxisMeta(raw, lang) {
  return {
    axes: (raw.axes || []).map((a) => ({
      id: a.id, high_code: a.high_code, low_code: a.low_code, type_role: a.type_role,
      name: pickL10n(a.name, lang),
      positive: pickL10n(a.positive, lang),
      negative: pickL10n(a.negative, lang),
      positive_short: pickL10n(a.positive_short, lang),
      negative_short: pickL10n(a.negative_short, lang),
    })),
    neuro_systems: (raw.neuro_systems || []).map((n) => ({
      key: n.key, weights: n.weights,
      label: pickL10n(n.label, lang),
      region: pickL10n(n.region, lang),
      description: pickL10n(n.description, lang),
    })),
  };
}

async function loadData() {
  const [rawQuestions, rawAxes, rawProfiles] = await Promise.all([
    loadJSON("data/questions.json"),
    loadJSON("data/axis_meta.json"),
    loadJSON("data/profiles.json"),
  ]);
  applyData(rawQuestions, rawAxes, rawProfiles);
}

// Re-bind the module-level locals. Called on startup and after language change.
function applyData(rawQuestions, rawAxes, rawProfiles) {
  const lang = currentLang();
  QUESTIONS = buildQuestions(rawQuestions, lang);
  AXIS_META = buildAxisMeta(rawAxes, lang);
  PROFILES = {};
  for (const [code, prof] of Object.entries(rawProfiles || {})) {
    PROFILES[code] = withLang(prof);
  }
  TOTAL_QUESTIONS = QUESTIONS.questions.length;
}

// ----------------- tiny helpers -----------------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs={}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else if (v === true) e.setAttribute(k, "");
    else if (v === false || v == null) { /* skip */ }
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
};
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

// ----------------- screens -----------------
const screens = {
  intro: $("#screen-intro"),
  quiz: $("#screen-quiz"),
  result: $("#screen-result"),
};
function show(name) {
  for (const [k, node] of Object.entries(screens)) node.hidden = (k !== name);
  // In quiz/result, hide top-page chrome (header, hero, how-it-works) so the user
  // focuses on the diagnostic. Restore them when returning to intro.
  const chrome = ["#site-header", "#hero-banner", "#how-section"];
  const focusing = (name === "quiz" || name === "result");
  for (const sel of chrome) {
    const node = $(sel);
    if (node) node.hidden = focusing;
  }
  document.body.classList.toggle("quiz-active", focusing);
  window.scrollTo({ top: 0, behavior: "instant" });
}

// ----------------- quiz state -----------------
const state = {
  index: 0,
  answers: {}, // { [qid]: number }
  startedAt: 0,
};

function startQuiz() {
  state.index = 0;
  state.answers = {};
  state.startedAt = Date.now();
  // Funnel: user has started the quiz (privacy-first beacon; see app/metrics.js)
  trackQuizStart();
  show("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = QUESTIONS.questions[state.index];
  const kindKey = q.kind === "regular" ? "quiz.kind.regular"
    : q.kind === "social" ? "quiz.kind.social"
    : q.kind === "attention" ? "quiz.kind.attention"
    : q.kind === "consistency" ? "quiz.kind.consistency"
    : q.kind === "central" ? "quiz.kind.central"
    : q.kind === "meta" ? "quiz.kind.meta"
    : "quiz.kind.question";
  $("#q-kind").textContent = `Q${q.id} / ${TOTAL_QUESTIONS} — ${t(kindKey)}`;
  $("#q-text").textContent = q.text;

  // Pre-select if user is going back
  const prior = state.answers[q.id];
  $$("input[name=answer]").forEach(r => r.checked = (Number(r.value) === Number(prior)));

  // Progress
  const pct = ((state.index + 1) / TOTAL_QUESTIONS) * 100;
  $("#progress-fill").style.width = pct + "%";
  $("#progress-current").textContent = String(state.index + 1);
  $("#progress-total").textContent = String(TOTAL_QUESTIONS);

  // Buttons
  $("#btn-prev").disabled = state.index === 0;
  $("#btn-next").textContent = (state.index === TOTAL_QUESTIONS - 1) ? t("btn.seeResults") : t("btn.next");
}

function goPrev() {
  if (state.index > 0) {
    state.index--;
    renderQuestion();
  }
}
function goNext() {
  const checked = $("input[name=answer]:checked");
  if (!checked) {
    alert(t("alert.needAnswer"));
    return;
  }
  const q = QUESTIONS.questions[state.index];
  state.answers[q.id] = Number(checked.value);
  if (state.index === TOTAL_QUESTIONS - 1) {
    finishQuiz();
  } else {
    state.index++;
    renderQuestion();
  }
}

// ----------------- result rendering -----------------
// Highlights the primary brain region associated with the user's top-matched
// neuro system, phrased as a reference (not a measurement). Kept visually subtle.
function renderRegionHighlight(medals, neuroByLabel) {
  if (!medals || !medals.length) return "";
  const top = medals[0];
  const meta = neuroByLabel[top.label];
  if (!meta || !meta.region) return "";
  return `
    <p class="hero-region">
      <span class="hero-region-dot" aria-hidden="true"></span>
      ${escapeHTML(t("result.regionLabel"))} <strong>${escapeHTML(meta.region)}</strong>
      <span class="hero-region-hint">${escapeHTML(t("result.regionHint"))}</span>
    </p>
  `;
}

function starsFor(score) {
  // 0..19: 1; 20..39: 2; 40..59: 3; 60..79: 4; 80..100: 5
  const filled = Math.min(5, Math.max(1, Math.floor((score / 100) * 5) + (score >= 80 ? 0 : 1)));
  // Use exact tier mapping per step6:
  let n;
  if (score >= 80) n = 5;
  else if (score >= 60) n = 4;
  else if (score >= 40) n = 3;
  else if (score >= 20) n = 2;
  else n = 1;
  return "★".repeat(n) + "☆".repeat(5 - n);
}
function tierLabel(score) {
  if (score >= 80) return t("tier.veryHigh");
  if (score >= 60) return t("tier.high");
  if (score >= 40) return t("tier.mid");
  if (score >= 20) return t("tier.low");
  return t("tier.other");
}

function axisBarHTML(axisId, p, modifier) {
  const a = AXIS_META.axes.find(x => x.id === axisId);
  const cls = modifier ? "axis-bar modifier" : (p >= 55 || p <= 45) ? "axis-bar high" : "axis-bar";
  const fill = Math.max(0, Math.min(100, p == null ? 0 : p));
  // For high-polarity code, fill width is the score; for low-polarity we show left side as 'low'.
  // We'll show a single bar with the score as width and label ends.
  return `
    <div class="axis-bar-row">
      <div class="axis-bar-labels">
        <span>${escapeHTML(a.positive_short)}</span>
        <span>${escapeHTML(a.negative_short)}</span>
      </div>
      <div class="${cls}">
        <span class="axis-bar-fill" style="width:${fill}%;"></span>
        <span class="axis-bar-marker"></span>
      </div>
      <div class="axis-bar-note">${escapeHTML(a.name)}：${p == null ? escapeHTML(t("result.cannotDetermine")) : Math.round(p) + " / 100"}</div>
    </div>
  `;
}

function renderResult(result) {
  const profile = PROFILES[result.typeCode];
  if (!profile) {
    $("#result-root").innerHTML = `<div class="section"><h2>${escapeHTML(t("result.errorTitle"))}</h2><p>${escapeHTML(t("result.errorBody"))}</p></div>`;
    return;
  }
  const color = profile.color || "#FFB454";
  document.documentElement.style.setProperty("--type-color", color);

  const neuroByLabel = Object.fromEntries(AXIS_META.neuro_systems.map(n => [n.label, n]));
  const medals = result.neuroScores.slice(0, 3);
  const others = result.neuroScores.slice(3);

  const axisRows = AXIS_META.axes.map(a => axisBarHTML(a.id, result.axisScores[a.id], a.type_role === "modifier"));

  // judgment phrasing — MID axes fall back to nearest
  const midAxes = AXIS_META.axes.filter(a => a.type_role === "primary" && result.polarities[a.id] === "MID").map(a => a.name);
  let judgmentSentence;
  if (midAxes.length === 0) {
    judgmentSentence = fmt(t("judgment.match"), { name: profile.name, code: profile.code });
  } else {
    // Locale-aware separator for listing multiple MID axis names.
    judgmentSentence = fmt(t("judgment.close"), { name: profile.name, code: profile.code, axes: midAxes.join(t("list.separator")) });
  }

  const flags = result.reliability.flags;
  const gradeLabel = ({high:"grade.high", mid:"grade.mid", low:"grade.low"})[result.reliability.grade];
  const flagBits = [];
  if (flags.missing > 0) flagBits.push(fmt(t("flags.missing"), { n: flags.missing }));
  if (flags.socialDesirability >= 1) flagBits.push(fmt(t("flags.social"), { n: flags.socialDesirability }));
  if (flags.attentionExtreme >= 1) flagBits.push(fmt(t("flags.attention"), { n: flags.attentionExtreme }));
  if (flags.centerRatio > 0.6) flagBits.push(t("flags.center"));
  if (flags.extremeRatio > 0.7) flagBits.push(t("flags.extreme"));
  if (flags.allSameValue) flagBits.push(t("flags.same"));
  const flagLine = flagBits.length ? `${t("flags.linePrefix")}${flagBits.join("、")}${t("flags.lineSuffix")}` : "";

  const unableNote = result.diagnostics.unable
    ? `<p class="disclaimer" style="border-left-color:var(--danger);"><strong>${escapeHTML(t("result.unable"))}</strong></p>`
    : "";

  const html = `
    ${unableNote}
    <section class="hero" aria-label="${escapeHTML(t("result.heroLabel"))}">
      <img class="hero-img" src="assets/brain/${profile.code}.png" alt="${escapeHTML(fmt(t("img.typeAlt"), { name: profile.name }))}" />
      <div class="hero-meta">
        <span class="hero-code">${escapeHTML(profile.code)}</span>
        <div class="hero-name">${escapeHTML(profile.name)}</div>
        <p class="hero-catch">${escapeHTML(profile.catch)}</p>
        <p class="hero-judgment">${escapeHTML(judgmentSentence)}</p>
        ${renderRegionHighlight(medals, neuroByLabel)}
      </div>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.traits"))}">
      <h2><span class="icon">🧠</span>${escapeHTML(t("result.section.traits"))}</h2>
      <p>${escapeHTML(profile.features_short)}</p>
      <p>${escapeHTML(profile.features_long)}</p>
      <p class="disclaimer">${t("disclaimer.feature")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.neuro"))}">
      <h2><span class="icon">🔥</span>${escapeHTML(t("result.section.neuro"))}</h2>
      <div class="medal-list">
        ${medals.map((m, i) => {
          const meta = neuroByLabel[m.label];
          return `
            <div class="medal">
              <div class="medal-emoji">${["🥇","🥈","🥉"][i]}</div>
              <div>
                <div class="medal-label">${escapeHTML(m.label)}${meta ? `（${escapeHTML(meta.region)}）` : ""}</div>
                <div class="medal-stars">${starsFor(m.score)} <span style="color:var(--ink-muted);font-size:12px;">${escapeHTML(tierLabel(m.score))}</span></div>
                <div class="medal-desc">${meta ? escapeHTML(meta.description) : ""}</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="others-list">
        ${others.map(m => `
          <div class="others-row">
            <span>${escapeHTML(m.label)}</span>
            <span class="others-stars">${starsFor(m.score)}</span>
          </div>
        `).join("")}
      </div>
      <p class="disclaimer" style="margin-top:14px;">${t("disclaimer.neuro")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.profile"))}">
      <h2><span class="icon">🧩</span>${escapeHTML(t("result.section.profile"))}</h2>
      <div class="axis-bars">
        ${axisRows.join("")}
      </div>
      <p class="disclaimer">${escapeHTML(t("axis.fourAxesHint"))}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.strengths"))}">
      <h2><span class="icon">💡</span>${escapeHTML(t("result.section.strengths"))}</h2>
      <ul>${profile.strengths.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.warnings"))}">
      <h2><span class="icon">⚠️</span>${escapeHTML(t("result.section.warnings"))}</h2>
      <ul>${profile.warnings.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.stress"))}">
      <h2><span class="icon">🌀</span>${escapeHTML(t("result.section.stress"))}</h2>
      <p>${escapeHTML(profile.stress).replace(/\n/g, "<br>")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.learning"))}">
      <h2><span class="icon">📚</span>${escapeHTML(t("result.section.learning"))}</h2>
      <p>${escapeHTML(profile.learning).replace(/\n/g, "<br>")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.work"))}">
      <h2><span class="icon">💼</span>${escapeHTML(t("result.section.work"))}</h2>
      <p>${escapeHTML(profile.work).replace(/\n/g, "<br>")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.relationships"))}">
      <h2><span class="icon">👥</span>${escapeHTML(t("result.section.relationships"))}</h2>
      <p>${escapeHTML(profile.relationships).replace(/\n/g, "<br>")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.growth"))}">
      <h2><span class="icon">🚀</span>${escapeHTML(t("result.section.growth"))}</h2>
      <ul>${profile.growth.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.science"))}">
      <h2><span class="icon">🔬</span>${escapeHTML(t("result.section.science"))}</h2>
      <p>${escapeHTML(profile.scientific_background).replace(/\n/g, "<br>")}</p>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.share"))}">
      <h2><span class="icon">📤</span>${escapeHTML(t("result.section.share"))}</h2>
      <div class="share-card" id="share-card">
        <img class="share-card-img" src="assets/brain/${profile.code}.png" alt="${escapeHTML(fmt(t("img.typeAlt"), { name: profile.name }))}" />
        <div>
          <p class="share-card-title">${escapeHTML(profile.name)}</p>
          <p class="share-card-code">${escapeHTML(profile.code)}</p>
          <p class="share-card-catch">${escapeHTML(profile.catch)}</p>
          <ul>
            ${profile.share.bullets.map(b => `<li>${escapeHTML(b)}</li>`).join("")}
          </ul>
          <p class="share-medals">${medals.map((m, i) => `${["🥇","🥈","🥉"][i]} ${escapeHTML(m.label)}`).join("　")}</p>
          <p class="share-note">${escapeHTML(profile.share.disclaimer)}</p>
        </div>
      </div>
      <div class="share-actions">
        <button class="btn-secondary" id="btn-copy-share" type="button">${escapeHTML(t("share.copyText"))}</button>
        <button class="btn-secondary" id="btn-copy-share-url" type="button">${escapeHTML(t("share.copyUrl"))}</button>
        <button class="btn-primary" id="btn-download-card" type="button">${escapeHTML(t("share.saveCard"))}</button>
        <a class="btn-secondary" id="btn-share-x" target="_blank" rel="noopener" href="#" role="button">${escapeHTML(t("share.shareX"))}</a>
        <a class="btn-secondary" id="btn-share-line" target="_blank" rel="noopener" href="#" role="button">${escapeHTML(t("share.shareLine"))}</a>
        <button class="btn-secondary" id="btn-restart" type="button">${escapeHTML(t("share.restart"))}</button>
      </div>
    </section>

    <section class="section" aria-label="${escapeHTML(t("result.section.reliability"))}">
      <h2><span class="icon">🛡️</span>${escapeHTML(t("result.section.reliability"))}</h2>
      <p><strong>${escapeHTML(t(gradeLabel))}</strong> ${escapeHTML(flagLine)}</p>
      <p class="disclaimer">${t("disclaimer.reliability")}</p>
    </section>

    <p class="disclaimer" style="margin-top:20px;">
      ${escapeHTML(profile.scientific_note).replace(/\n/g, "<br>")}
    </p>
  `;
  $("#result-root").innerHTML = html;

  // share copy handler
  $("#btn-copy-share").addEventListener("click", async () => {
    // Funnel: share-related action (text copy)
    trackShareClick("text", profile.code);
    const text = buildShareText(profile, result);
    try {
      await navigator.clipboard.writeText(text);
      flashCopy($("#btn-copy-share"), t("share.copied"));
    } catch {
      // Fallback: select + execCommand
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); flashCopy($("#btn-copy-share"), t("share.copied")); }
      catch { alert(fmt(t("share.copyFailed"), { text })); }
      document.body.removeChild(ta);
    }
  });
  // Copy result URL
  const _shareUrlCopy = shareUrlFor(profile.code);
  $("#btn-copy-share-url").addEventListener("click", async () => {
    // Funnel: share-related action (url copy)
    trackShareClick("url", profile.code);
    try {
      await navigator.clipboard.writeText(_shareUrlCopy);
      flashCopy($("#btn-copy-share-url"), t("share.copied"));
    } catch {
      /* non-fatal */
    }
  });
  // Social share buttons — point to the type detail page (server-renderable, crawler-friendly).
  const shareUrl = shareUrlFor(profile.code);
  $("#btn-share-x").href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(buildShareText(profile, result)) + "&url=" + encodeURIComponent(shareUrl);
  $("#btn-share-line").href = "https://line.me/R/msg/text/?" + encodeURIComponent(buildShareText(profile, result) + "\n" + shareUrl);
  // Funnel: outbound share intents (actual SNS post happens on the SNS side)
  $("#btn-share-x").addEventListener("click", () => trackShareClick("x", profile.code));
  $("#btn-share-line").addEventListener("click", () => trackShareClick("line", profile.code));
  $("#btn-download-card").addEventListener("click", () => {
    // Funnel: share-card generation (image saved for social posting)
    trackShareClick("card", profile.code);
    generateShareCard(profile, result);
  });
  $("#btn-restart").addEventListener("click", () => {
    if (confirm(t("restart.confirm"))) {
      startQuiz();
    }
  });
}

function shareUrlFor(code) {
  // Cloudflare Pages clean-URL: .html is redirected away, so share the extension-less
  // form to avoid a 308 hop (both forms work; getTypeCode matches either).
  return new URL("og/type-" + encodeURIComponent(code), location.href).href;
}

// Generates a shareable PNG card (brain character + type name + catch + top3 neuro).
// Uses an offscreen canvas; loads the type image from assets/brain/{code}.png.
async function generateShareCard(profile, result) {
  const btn = $("#btn-download-card");
  const orig = btn.textContent;
  btn.textContent = t("share.generating");
  btn.disabled = true;
  try {
    const W = 1080, H = 1350; // vertical card, mobile/SNS friendly
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background (type color gradient)
    const color = profile.color || "#5C7CA8";
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shadeColor(color, -40));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle top accent
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 0, W, 200);

    // Load & draw the brain character image
    const img = await loadImage(`assets/brain/${profile.code}.png`);
    const imgSize = 520;
    const imgX = (W - imgSize) / 2;
    const imgY = 260;
    // soft white circle behind the character
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2 + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

    // Code (top)
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 56px system-ui, sans-serif";
    ctx.fillText(profile.code, W / 2, 120);

    // Name
    const nameY = imgY + imgSize + 90;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 92px system-ui, sans-serif";
    ctx.fillText(profile.name, W / 2, nameY);

    // Catch phrase (wrapped)
    ctx.font = "42px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const catchLines = wrapText(ctx, profile.catch || "", W - 120);
    let cy = nameY + 60;
    for (const line of catchLines) {
      ctx.fillText(line, W / 2, cy);
      cy += 58;
    }

    // Top3 neuro systems
    const top3 = result.neuroScores.slice(0, 3);
    cy += 30;
    ctx.font = "40px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < top3.length; i++) {
      ctx.fillText(`${medals[i]} ${top3[i].label}`, W / 2, cy);
      cy += 60;
    }

    // QR / URL hint (footer)
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "30px system-ui, sans-serif";
    ctx.fillText(shareUrlFor(profile.code).replace(/^https?:\/\//, ""), W / 2, H - 60);
    ctx.fillText(t("share.cardDisclaimer"), W / 2, H - 24);

    // Download
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("canvas toBlob failed");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neuro-type-${profile.code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    flashCopy(btn, t("share.saved"));
  } catch (err) {
    console.error(err);
    btn.textContent = orig;
    btn.disabled = false;
    alert(t("share.cardFailed"));
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed: " + src));
    img.src = src;
  });
}

function shadeColor(hex, percent) {
  const n = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split("");
  const lines = [];
  let line = "";
  for (const ch of words) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3); // cap at 3 lines
}

function buildShareText(profile, result) {
  const lines = [];
  lines.push(profile.share.title);
  lines.push("");
  lines.push(...profile.share.bullets.map(b => "・" + b));
  lines.push("");
  // Use computed neuro medals (sorted desc) for the share text — consistent with the on-page medals.
  result.neuroScores.slice(0,3).forEach((m, i) => lines.push(`${["🥇","🥈","🥉"][i]} ${m.label}`));
  lines.push("");
  lines.push(profile.share.disclaimer);
  lines.push(fmt(t("share.reliability"), { grade: t("gradeShort." + result.reliability.grade) }));
  return lines.join("\n");
}

function flashCopy(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1800);
}

// ----------------- finish -----------------
function finishQuiz() {
  const result = computeScore({ answers: state.answers, questions: QUESTIONS.questions, axesMeta: AXIS_META });
  // Funnel: quiz completed — type code, reliability grade, duration, answered count
  const answered = Object.keys(state.answers).length;
  const durationSec = state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0;
  trackQuizComplete(result, durationSec, answered);
  renderResult(result);
  show("result");
}

// Cache the raw fetched JSON so language switches can re-localize without a re-fetch.
let rawData = null;

// Called whenever the active language changes. Re-resolves text from the cached
// raw data and re-renders the current screen.
function rerenderForLang() {
  if (!rawData) return;
  applyData(rawData.q, rawData.a, rawData.p);
  applyLang();
  // Re-render whichever screen is visible.
  if (!screens.quiz.hidden) renderQuestion();
  else if (!screens.result.hidden) {
    // Recompute and re-render the result so language change reflects in profile text.
    const result = computeScore({ answers: state.answers, questions: QUESTIONS.questions, axesMeta: AXIS_META });
    renderResult(result);
  }
}

// ----------------- bootstrap -----------------
async function boot() {
  applyLang();
  try {
    const [q, a, p] = await Promise.all([
      loadJSON("data/questions.json"),
      loadJSON("data/axis_meta.json"),
      loadJSON("data/profiles.json"),
    ]);
    rawData = { q, a, p };
    applyData(q, a, p);
  } catch (err) {
    console.error(err);
    const intro = document.getElementById("screen-intro");
    if (intro) {
      intro.innerHTML = `<div class="card"><h2>${escapeHTML(t("types.loadError"))}</h2><p>${escapeHTML(t("types.localServerHint").replace(/<[^>]+>/g, ""))}</p><pre style="white-space:pre-wrap;color:var(--danger);">${escapeHTML(String(err && err.message || err))}</pre></div>`;
    }
    return;
  }

  $("#btn-start").addEventListener("click", startQuiz);
  $("#btn-prev").addEventListener("click", goPrev);
  $("#btn-next").addEventListener("click", goNext);

  // Re-render when the user toggles language.
  onChange(() => rerenderForLang());
}

// keyboard nav
document.addEventListener("keydown", (ev) => {
  if (!screens || screens.quiz.hidden) return;
  if (ev.key === "ArrowLeft") goPrev();
  else if (ev.key === "Enter" || ev.key === "ArrowRight") goNext();
});

// expose for tests in case
window.__quiz = { state, computeScore: () => computeScore({ answers: state.answers, questions: QUESTIONS.questions, axesMeta: AXIS_META }), getQuestions: () => QUESTIONS.questions, getAxisMeta: () => AXIS_META };

boot();
