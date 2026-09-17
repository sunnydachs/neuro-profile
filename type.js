// type.js — Renders a single type's detail profile.
// Reads ?type=CODE from the URL, loads profiles.json + types.json, and renders
// the 14 spec sections. Falls back to types.html for missing/invalid codes.
// Language resolution via app/i18n.js.
import { applyLang, fmt, t, withLang } from "./app/i18n.js";

const FALLBACK_URL = "types.html";
function isEn() { return (location.pathname || "").startsWith("/en/"); }

const MEDALS = ["🥇", "🥈", "🥉"];

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function escAttr(s) { return esc(s); }

// types.js と同じ並び・同じ色定義（ナビ/グループ表示用）。types.html と順序を一致させる。
const GROUP_DEFS = [
  { id: "EI", titleKey: "group.EI.title", color: "#FFB454", shortKey: "group.EI.short" },
  { id: "EA", titleKey: "group.EA.title", color: "#E8843C", shortKey: "group.EA.short" },
  { id: "VI", titleKey: "group.VI.title", color: "#8FB6E0", shortKey: "group.VI.short" },
  { id: "VA", titleKey: "group.VA.title", color: "#5C7CA8", shortKey: "group.VA.short" },
];

function nl2br(s) {
  return esc(s).replace(/\n/g, "<br>");
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function getTypeCode() {
  const params = new URLSearchParams(location.search);
  const raw = params.get("type");
  if (raw) {
    if (/^[A-Z]{4}$/.test(raw)) return raw;
    return null;
  }
  // Fallback for static pages og/type-<CODE>(.html)? — Cloudflare Pages strips the
  // .html extension (clean-URL redirect), so match with or without it.
  const m = location.pathname.match(/type-([A-Z]{4})(?:\.html)?$/i);
  if (m) return m[1].toUpperCase();
  return null;
}

function setTitle(profile) {
  document.title = `${profile.code} — ${profile.name} | ${t("site.name.ja")}`;
  const h1 = document.getElementById("page-title");
  if (h1) h1.textContent = `${profile.name}（${profile.code}）`;
  const descText = fmt(t("page.descTemplate"), { name: profile.name, code: profile.code, catch: profile.catch, site: t("site.name.ja") });
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", escAttr(descText));

  // Dynamic OGP / Twitter — set for each type (crawlers that run JS will pick these up;
  // the static defaults in type.html cover non-JS crawlers with a generic preview).
  const ogTitle = `${profile.name}（${profile.code}）| ${t("site.name.ja")}`;
  // OGP image: dedicated 1200×624 social card per type (assets/og/), fallback not needed (all 16 present).
  const ogImage = `assets/og/${profile.code}.png`;
  const absOgImage = new URL(ogImage, location.href).href;
  updateMeta('meta[property="og:title"]', ogTitle);
  updateMeta('meta[property="og:description"]', descText);
  updateMeta('meta[property="og:url"]', location.href);
  updateMeta('meta[property="og:image"]', absOgImage);
  updateMeta('meta[property="og:type"]', "article");
  updateMeta('meta[name="twitter:title"]', ogTitle);
  updateMeta('meta[name="twitter:description"]', descText);
  updateMeta('meta[name="twitter:image"]', absOgImage);
}

function updateMeta(sel, value) {
  const el = document.querySelector(sel);
  if (el) el.setAttribute("content", value);
}

function axisRowsHTML(axisLabels) {
  // axis_meta の axes[0..3] の positive_short/negative_short を使わず、
  // profiles.json の axis_labels 4 つをそのまま「キー：ラベル」として可視化する。
  // key ラベルは決定的に固定（タイプ判定軸 1〜4）。
  const keys = t("type.axisKeys");
  const safe = Array.isArray(axisLabels) ? axisLabels.slice(0, 4) : [];
  const rows = [];
  for (let i = 0; i < keys.length; i++) {
    rows.push(`
      <li class="type-axis-row">
        <span class="type-axis-key">${esc(keys[i])}</span>
        <span class="type-axis-val">${esc(safe[i] || "—")}</span>
      </li>
    `);
  }
  return rows.join("");
}

// 5段階の「★」表現。neuro_top3 はラベル配列だけなので、
// 関連可能性の高低を ★4〜5 で示す（段階表現を統一するため全項目 ★5 相当、
// ただし「関連可能性のある神経システム」であることを明示する注記つき）。
function starsForTop(top3, idx) {
  // 🥇=5, 🥈=4, 🥉=3 を統一表現として採用
  const n = [5, 4, 3][idx] ?? 3;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function medalHTML(neuroByLabel, top3) {
  if (!Array.isArray(top3) || top3.length === 0) return "";
  return top3.slice(0, 3).map((label, i) => {
    const meta = neuroByLabel && neuroByLabel[label];
    return `
      <div class="medal">
        <div class="medal-emoji">${MEDALS[i]}</div>
        <div>
          <div class="medal-label">${esc(label)}${meta ? `（${esc(meta.region)}）` : ""}</div>
          <div class="medal-stars">${starsForTop(top3, i)} <span style="color:var(--ink-muted);font-size:12px;">${esc(t("type.neuroRelated"))}</span></div>
          <div class="medal-desc">${meta ? esc(meta.description) : ""}</div>
        </div>
      </div>
    `;
  }).join("");
}

function section(title, icon, body) {
  return `
    <section class="section" aria-label="${esc(title)}">
      <h2><span class="icon">${icon}</span>${esc(title)}</h2>
      ${body}
    </section>
  `;
}

function listSection(title, icon, items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return section(title, icon, `<ul>${items.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`);
}

function paragraphSection(title, icon, text) {
  return section(title, icon, `<p>${nl2br(text || "")}</p>`);
}

function buildShareText(profile) {
  const lines = [];
  const sh = profile.share || {};
  if (sh.title) lines.push(sh.title);
  if (Array.isArray(sh.bullets) && sh.bullets.length) {
    lines.push("");
    lines.push(...sh.bullets.map(b => "・" + b));
  }
  if (Array.isArray(profile.neuro_top3) && profile.neuro_top3.length) {
    lines.push("");
    profile.neuro_top3.slice(0, 3).forEach((label, i) => {
      lines.push(`${MEDALS[i]} ${label}`);
    });
  }
  if (sh.disclaimer) {
    lines.push("");
    lines.push(sh.disclaimer);
  }
  return lines.join("\n");
}

function flashCopy(btn, msg) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1800);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    flashCopy(btn, t("share.copied"));
    return;
  } catch {
    // Fallback for older browsers / non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(ta);
    if (ok) flashCopy(btn, t("share.copied"));
    else alert(fmt(t("share.copyFailed"), { text }));
  }
}

function renderProfile(profile, types, neuroByLabel) {
  const root = document.getElementById("type-root");
  if (!root) return;
  const color = profile.color || "#FFB454";
  document.documentElement.style.setProperty("--type-color", color);
  setTitle(profile);

  const sh = profile.share || {};
  const shareText = buildShareText(profile);

  const groupMeta = resolveGroupMeta(profile.code, types);
  const heroHTML = `
    <section class="type-hero" aria-label="${esc(t("result.heroLabel"))}">
      <img class="type-hero-img"
           src="assets/brain/${esc(profile.code)}.png"
           data-detail-src="assets/brain/${esc(profile.code)}.png"
           alt="${esc(fmt(t("img.typeAlt"), { name: profile.name }))}"
           loading="lazy"
           decoding="async"
           width="160" height="160" />
      <div class="type-hero-meta">
        <span class="type-hero-code">${esc(profile.code)}</span>
        <div class="type-hero-neural">${esc(profile.neural_name || "")}</div>
        <div class="type-hero-name">${esc(profile.name)}</div>
        <p class="type-hero-catch">${esc(profile.catch || "")}</p>
        ${groupMeta ? `<p class="type-hero-group" data-group-color="${esc(groupMeta.color)}"><span class="type-hero-group-dot" aria-hidden="true"></span>${esc(t(groupMeta.titleKey))}</p>` : ""}
      </div>
    </section>
    ${renderPrevNextNav(profile.code, types)}
  `;

  const featuresHTML = section(t("type.section.features"), "🧠", `
    <p>${esc(profile.features_short || "")}</p>
    <p>${esc(profile.features_long || "")}</p>
    <p class="disclaimer">${t("disclaimer.tendency")}</p>
  `);

  const neuroHTML = section(t("type.section.neuroTop3"), "🔥", `
    <div class="medal-list">
      ${medalHTML(neuroByLabel, profile.neuro_top3)}
    </div>
    <p class="disclaimer" style="margin-top:14px;">
      ${t("disclaimer.neuro")}
    </p>
  `);

  const axisHTML = section(t("type.section.profile"), "🧩", `
    <ul class="type-axis-list">
      ${axisRowsHTML(profile.axis_labels)}
    </ul>
    <p class="disclaimer">${t("type.scopeDisclaimer")}</p>
  `);

  const strengthsHTML = listSection(t("result.section.strengths"), "💡", profile.strengths);
  const warningsHTML = listSection(t("result.section.warnings"), "⚠️", profile.warnings);
  const stressHTML = paragraphSection(t("result.section.stressShort"), "🌀", profile.stress);
  const learningHTML = paragraphSection(t("result.section.learning"), "📚", profile.learning);
  const workHTML = paragraphSection(t("result.section.work"), "💼", profile.work);
  const relationshipsHTML = paragraphSection(t("result.section.relationships"), "👥", profile.relationships);
  const growthHTML = listSection(t("result.section.growth"), "🚀", profile.growth);
  const sciBgHTML = paragraphSection(t("result.section.science"), "🔬", profile.scientific_background);
  const sciNoteHTML = paragraphSection(t("type.section.sciNote"), "⚠️", profile.scientific_note);

  const shareHTML = `
    <section class="section" aria-label="${esc(t("type.section.share"))}">
      <h2><span class="icon">📤</span>${esc(t("type.section.share"))}</h2>
      <div class="share-card">
        <img class="share-card-img"
             src="assets/brain/${esc(profile.code)}.png"
             data-detail-src="assets/brain/${esc(profile.code)}.png"
             alt="${esc(fmt(t("img.typeAlt"), { name: profile.name }))}"
             loading="lazy" decoding="async"
             width="80" height="80" />
        <div>
          <p class="share-card-title">${esc(profile.name)}</p>
          <p class="share-card-code">${esc(profile.code)}</p>
          <p class="share-card-catch">${esc(profile.catch || "")}</p>
          ${Array.isArray(sh.bullets) ? `<ul>${sh.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
          ${Array.isArray(profile.neuro_top3) ? `<p class="share-medals">${profile.neuro_top3.slice(0,3).map((label, i) => `${MEDALS[i]} ${esc(label)}`).join("　")}</p>` : ""}
          ${sh.disclaimer ? `<p class="share-note">${esc(sh.disclaimer)}</p>` : ""}
        </div>
      </div>
      <div class="share-actions">
        <button class="btn-secondary" id="btn-copy-share" type="button">${esc(t("share.copyText"))}</button>
        <a class="btn-secondary" href="${FALLBACK_URL}" role="button">${esc(t("type.backToList"))}</a>
        <a class="btn-primary" href="index.html" role="button">${esc(t("types.takeCheck"))}</a>
      </div>
    </section>
  `;

  const relatedHTML = renderRelated(profile, types);

  root.innerHTML = `
    ${heroHTML}
    ${featuresHTML}
    ${neuroHTML}
    ${axisHTML}
    ${strengthsHTML}
    ${warningsHTML}
    ${stressHTML}
    ${learningHTML}
    ${workHTML}
    ${relationshipsHTML}
    ${growthHTML}
    ${sciBgHTML}
    ${sciNoteHTML}
    ${shareHTML}
    ${relatedHTML}
  `;

  // Wire share button
  const btn = document.getElementById("btn-copy-share");
  if (btn) btn.addEventListener("click", () => copyText(shareText, btn));

  // 詳細用画像（assets/types-detail/）があれば差し替える（無ければ何もしない）。
  swapToDetailImages(root);
}

function renderRelated(profile, types) {
  if (!types) return "";
  // 同じグループ（axis1×axis2）の他タイプを提案する
  const same = Object.values(types)
    .filter(t => t && t.code && t.code !== profile.code && t.code[0] === profile.code[0] && t.code[1] === profile.code[1])
    .sort((a, b) => a.code.localeCompare(b.code));
  if (same.length === 0) return "";
  return `
    <section class="section" aria-label="${esc(t("type.section.related"))}">
      <h2><span class="icon">🔗</span>${esc(t("type.section.related"))}</h2>
      <div class="type-related">
        ${same.map(x => `<a href="${isEn() ? "../og/type-" : "og/type-"}${encodeURIComponent(x.code)}">${esc(x.code)} ${esc(x.name)}</a>`).join("")}
      </div>
    </section>
  `;
}

function renderError(msg) {
  const root = document.getElementById("type-root");
  if (!root) return;
  root.removeAttribute("aria-busy");
  root.innerHTML = `
    <section class="card">
      <h2>${esc(t("type.loadErrorTitle"))}</h2>
      <p>${esc(msg)}</p>
      <p><a class="btn-primary" href="${FALLBACK_URL}">${esc(t("type.backToList"))}</a></p>
    </section>
  `;
}

async function main() {
  applyLang();
  const code = getTypeCode();
  if (!code) {
    location.replace(isEn() ? "../types.html" : FALLBACK_URL);
    return;
  }
  try {
    const [rawProfiles, rawTypes, rawAxisMeta] = await Promise.all([
      loadJSON("data/profiles.json"),
      loadJSON("data/types.json"),
      loadJSON("data/axis_meta.json"),
    ]);
    // Resolve i18n-wrapped fields for the active language.
    const profiles = {};
    for (const [c, p] of Object.entries(rawProfiles)) profiles[c] = withLang(p);
    const types = {};
    for (const [c, p] of Object.entries(rawTypes)) types[c] = withLang(p);
    const axisMeta = {
      axes: (rawAxisMeta.axes || []).map((a) => ({
        id: a.id, high_code: a.high_code, low_code: a.low_code, type_role: a.type_role,
        name: a.name && a.name.ja != null ? a.name.ja : a.name,
      })),
      neuro_systems: (rawAxisMeta.neuro_systems || []).map((n) => ({
        key: n.key, weights: n.weights,
        label: n.label && n.label.ja != null ? n.label.ja : n.label,
        region: n.region && n.region.ja != null ? n.region.ja : n.region,
      })),
    };
    const profile = profiles[code];
    if (!profile) {
      location.replace(isEn() ? "../types.html" : FALLBACK_URL);
      return;
    }
    const neuroByLabel = Object.fromEntries((axisMeta.neuro_systems || []).map(n => [n.label, n]));
    const root = document.getElementById("type-root");
    if (root) root.removeAttribute("aria-busy");
    renderProfile(profile, types, neuroByLabel);
  } catch (err) {
    console.error(err);
    renderError(err && err.message ? err.message : String(err));
  }
}

function resolveGroupMeta(code, types) {
  if (!types || !code) return null;
  const id = groupIdFor(code);
  return GROUP_DEFS.find((g) => g.id === id) || null;
}

function groupIdFor(code) {
  if (!code) return null;
  return code[0] + code[1];
}

// 前後タイプナビゲーション。types.html と同じ順序（コード昇順）で循環する。
// types.html のカード順（グループ EI→EA→VI→VA × 各グループ内コード昇順）で連結した列。
function buildNavOrder(types) {
  if (!types) return [];
  const groups = ["EI", "EA", "VI", "VA"];
  const codes = Object.keys(types);
  const order = [];
  for (const g of groups) {
    const items = codes
      .filter((c) => c && c.length >= 2 && c.slice(0, 2) === g)
      .sort((a, b) => a.localeCompare(b));
    order.push(...items);
  }
  // 未知のコードに備えて補完（types.json に存在しない場合のフォールバック）
  if (order.length === 0) return codes.slice().sort();
  return order;
}

function renderPrevNextNav(code, types) {
  if (!types) return "";
  const order = buildNavOrder(types);
  if (order.length === 0) return "";
  const idx = order.indexOf(code);
  if (idx === -1) return "";
  const prev = order[(idx - 1 + order.length) % order.length];
  const next = order[(idx + 1) % order.length];
  const prevMeta = types[prev] || {};
  const nextMeta = types[next] || {};
  const prevLabel = prev === code ? t("type.toFirst") : t("type.prev");
  const nextLabel = next === code ? t("type.toFirst") : t("type.next");
  return `
    <nav class="type-prevnext" aria-label="${esc(t("type.prevNav"))}">
      <a class="type-prevnext-link type-prevnext-prev"
         href="${isEn() ? "../og/type-" : "og/type-"}${encodeURIComponent(prev)}"
         data-type-color="${esc(prevMeta.color || "")}"
         aria-label="${esc(fmt(t("type.navTo"), { label: prevLabel, name: prevMeta.name || prev, code: prev }))}">
        <span class="type-prevnext-arrow" aria-hidden="true">←</span>
        <span class="type-prevnext-text">
          <span class="type-prevnext-eyebrow">${esc(prevLabel)}</span>
          <span class="type-prevnext-name">${esc(prevMeta.name || prev)}</span>
          <span class="type-prevnext-code">${esc(prev)}</span>
        </span>
      </a>
      <a class="type-prevnext-link type-prevnext-next"
         href="${isEn() ? "../og/type-" : "og/type-"}${encodeURIComponent(next)}"
         data-type-color="${esc(nextMeta.color || "")}"
         aria-label="${esc(fmt(t("type.navTo"), { label: nextLabel, name: nextMeta.name || next, code: next }))}">
        <span class="type-prevnext-text">
          <span class="type-prevnext-eyebrow">${esc(nextLabel)}</span>
          <span class="type-prevnext-name">${esc(nextMeta.name || next)}</span>
          <span class="type-prevnext-code">${esc(next)}</span>
        </span>
        <span class="type-prevnext-arrow" aria-hidden="true">→</span>
      </a>
    </nav>
  `;
}

// 詳細用画像があれば src を差し換える（無ければ何もせずフォールバック）。
function swapToDetailImages(root) { // codeql[js/xss-through-dom]: img.src assignment from data attribute; values are static asset paths
  if (!root) return;
  const imgs = root.querySelectorAll("img[data-detail-src]");
  imgs.forEach((img) => {
    const detail = img.getAttribute("data-detail-src");
    if (!detail) return;
    const probe = new Image();
    probe.onload = () => { img.src = detail; };
    probe.onerror = () => { /* assets/types/ 側の画像のまま */ };
    probe.src = detail;
  });
}

main();
