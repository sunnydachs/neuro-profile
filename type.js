// type.js — Renders a single type's detail profile.
// Reads ?type=CODE from the URL, loads profiles.json + types.json, and renders
// the 14 spec sections. Falls back to types.html for missing/invalid codes.

const FALLBACK_URL = "types.html";

const MEDALS = ["🥇", "🥈", "🥉"];

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function escAttr(s) { return esc(s); }

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
  if (!raw) return null;
  // Strict 4-letter code: only uppercase letters A..Z, length 4
  if (!/^[A-Z]{4}$/.test(raw)) return null;
  return raw;
}

function setTitle(profile) {
  document.title = `${profile.code} — ${profile.name} | 脳・認知タイプ`;
  const h1 = document.getElementById("page-title");
  if (h1) h1.textContent = `${profile.name}（${profile.code}）`;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", escAttr(`${profile.name}（${profile.code}）— ${profile.catch}。脳・認知タイプの傾向プロフィール。`));
}

function axisRowsHTML(axisLabels) {
  // axis_meta の axes[0..3] の positive_short/negative_short を使わず、
  // profiles.json の axis_labels 4 つをそのまま「キー：ラベル」として可視化する。
  // key ラベルは決定的に固定（タイプ判定軸 1〜4）。
  const keys = ["動機の方向", "処理様式", "処理対象", "対人志向"];
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
          <div class="medal-stars">${starsForTop(top3, i)} <span style="color:var(--ink-muted);font-size:12px;">関連可能性</span></div>
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
    flashCopy(btn, "コピーしました ✓");
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
    if (ok) flashCopy(btn, "コピーしました ✓");
    else alert("コピーできませんでした。テキストを長押しで選択してください。\n\n" + text);
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

  const heroHTML = `
    <section class="type-hero" aria-label="タイプ名と画像">
      <img class="type-hero-img"
           src="assets/types/${esc(profile.code)}.png"
           alt="${esc(profile.name)} のアイコン"
           loading="lazy"
           decoding="async"
           width="160" height="160" />
      <div class="type-hero-meta">
        <span class="type-hero-code">${esc(profile.code)}</span>
        <div class="type-hero-name">${esc(profile.name)}</div>
        <p class="type-hero-catch">${esc(profile.catch || "")}</p>
      </div>
    </section>
  `;

  const featuresHTML = section("あなたの特徴", "🧠", `
    <p>${esc(profile.features_short || "")}</p>
    <p>${esc(profile.features_long || "")}</p>
    <p class="disclaimer">※ 以下の結果は、回答パターンから推定された<strong>傾向</strong>であり、脳の測定ではありません。</p>
  `);

  const neuroHTML = section("神経システム TOP3", "🔥", `
    <div class="medal-list">
      ${medalHTML(neuroByLabel, profile.neuro_top3)}
    </div>
    <p class="disclaimer" style="margin-top:14px;">
      ※ これらの神経システムは、回答パターンから推定される<strong>関連可能性</strong>を表示しています。
      実際の脳活動の測定ではありません。
    </p>
  `);

  const axisHTML = section("認知プロフィール", "🧩", `
    <ul class="type-axis-list">
      ${axisRowsHTML(profile.axis_labels)}
    </ul>
    <p class="disclaimer">※ 5 つの軸のうち、軸1〜4 がタイプ判定に使われ、軸5（情動の安定）は修飾子として別表示です。</p>
  `);

  const strengthsHTML = listSection("あなたの強み", "💡", profile.strengths);
  const warningsHTML = listSection("注意したいポイント", "⚠️", profile.warnings);
  const stressHTML = paragraphSection("ストレス時の傾向", "🌀", profile.stress);
  const learningHTML = paragraphSection("学習するとき", "📚", profile.learning);
  const workHTML = paragraphSection("仕事では", "💼", profile.work);
  const relationshipsHTML = paragraphSection("人間関係では", "👥", profile.relationships);
  const growthHTML = listSection("あなたの成長ポイント", "🚀", profile.growth);
  const sciBgHTML = paragraphSection("科学的背景", "🔬", profile.scientific_background);
  const sciNoteHTML = paragraphSection("科学的な注意", "⚠️", profile.scientific_note);

  const shareHTML = `
    <section class="section" aria-label="共有カード">
      <h2><span class="icon">📤</span>共有カード</h2>
      <div class="share-card">
        <img class="share-card-img"
             src="assets/types/${esc(profile.code)}.png"
             alt="${esc(profile.name)} のアイコン"
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
        <button class="btn-secondary" id="btn-copy-share" type="button">共有テキストをコピー</button>
        <a class="btn-secondary" href="${FALLBACK_URL}" role="button">タイプ一覧に戻る</a>
        <a class="btn-primary" href="index.html" role="button">診断を受ける</a>
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
}

function renderRelated(profile, types) {
  if (!types) return "";
  // 同じグループ（axis1×axis2）の他タイプを提案する
  const same = Object.values(types)
    .filter(t => t && t.code && t.code !== profile.code && t.code[0] === profile.code[0] && t.code[1] === profile.code[1])
    .sort((a, b) => a.code.localeCompare(b.code));
  if (same.length === 0) return "";
  return `
    <section class="section" aria-label="同じグループの他のタイプ">
      <h2><span class="icon">🔗</span>同じグループの他のタイプ</h2>
      <div class="type-related">
        ${same.map(t => `<a href="type.html?type=${encodeURIComponent(t.code)}">${esc(t.code)} ${esc(t.name)}</a>`).join("")}
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
      <h2>タイプ情報を読み込めませんでした</h2>
      <p>${esc(msg)}</p>
      <p><a class="btn-primary" href="${FALLBACK_URL}">タイプ一覧へ戻る</a></p>
    </section>
  `;
}

async function main() {
  const code = getTypeCode();
  if (!code) {
    location.replace(FALLBACK_URL);
    return;
  }
  try {
    const [profiles, types, axisMeta] = await Promise.all([
      loadJSON("data/profiles.json"),
      loadJSON("data/types.json"),
      loadJSON("data/axis_meta.json"),
    ]);
    const profile = profiles[code];
    if (!profile) {
      location.replace(FALLBACK_URL);
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

main();
