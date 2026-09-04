// types.js — Renders the 16-type list, grouped by axis1×axis2.
// Source of truth: data/types.json (cards) + data/profiles.json (sanity fallback).
// No external deps.

const GROUP_DEFS = [
  {
    id: "EI",
    title: "探索 × 直感（ひらめきで新しい世界へ）",
    sub: "報酬接近と直感・即応の傾向。変化とひらめきをエネルギーにします。",
    color: "#FFB454",
  },
  {
    id: "EA",
    title: "探索 × 分析（構想を段取りで形にする）",
    sub: "報酬接近と分析・計画の傾向。構想を描き、手順に落とし込みます。",
    color: "#E8843C",
  },
  {
    id: "VI",
    title: "警戒 × 直感（感性と慎重さで周囲を感じる）",
    sub: "警戒・回避と直感・即応の傾向。気配りや内省と素早い反応が同居します。",
    color: "#8FB6E0",
  },
  {
    id: "VA",
    title: "警戒 × 分析（慎重さと計画で確実を積む）",
    sub: "警戒・回避と分析・計画の傾向。検証と見通しで失敗を遠ざけます。",
    color: "#5C7CA8",
  },
];

function groupOf(code) {
  // code[0]=axis1 (E/V), code[1]=axis2 (I/A)
  return code[0] + code[1];
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

function renderGroup(def, items, currentCode) {
  const section = document.createElement("section");
  section.className = "types-group";
  section.style.setProperty("--group-color", def.color);
  section.setAttribute("aria-label", def.title);

  const head = document.createElement("div");
  head.className = "types-group-head";
  head.innerHTML = `
    <span class="types-group-bar" aria-hidden="true"></span>
    <h2 class="types-group-title">${esc(def.title)}</h2>
    <p class="types-group-sub">${esc(def.sub)}</p>
  `;
  section.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "types-grid";

  for (const t of items) {
    const a = document.createElement("a");
    a.className = "type-card";
    a.href = `type.html?type=${encodeURIComponent(t.code)}`;
    a.style.setProperty("--type-color", t.color || def.color);
    a.setAttribute("aria-label", `${t.name}（${t.code}）の詳細を見る`);
    if (currentCode && currentCode === t.code) {
      a.classList.add("is-current");
      a.setAttribute("aria-current", "page");
    }
    a.innerHTML = `
      <img class="type-card-img"
           src="assets/brain/${esc(t.code)}.png"
           data-detail-src="assets/brain/${esc(t.code)}.png"
           alt="${esc(t.name)} のアイコン"
           loading="lazy"
           decoding="async"
           width="88" height="88" />
      <div class="type-card-meta">
        <p class="type-card-code">${esc(t.code)}</p>
        <p class="type-card-neural">${esc(t.neural_name || "")}</p>
        <p class="type-card-name">${esc(t.name)}</p>
        <p class="type-card-catch">${esc(t.catch || "")}</p>
      </div>
    `;
    grid.appendChild(a);
  }
  section.appendChild(grid);
  return section;
}

function renderError(msg) {
  const root = document.getElementById("types-root");
  if (!root) return;
  root.removeAttribute("aria-busy");
  root.innerHTML = `
    <section class="card">
      <h2>タイプ一覧を読み込めませんでした</h2>
      <p>${esc(msg)}</p>
      <p>ローカル静的サーバ（<code>npm run serve</code> など）で開いてください。</p>
    </section>
  `;
}

function currentTypeCode() {
  if (typeof location === "undefined") return null;
  const path = (location.pathname || "").split("/").pop();
  if (path !== "type.html") return null;
  const raw = new URLSearchParams(location.search).get("type");
  if (!raw || !/^[A-Z]{4}$/.test(raw)) return null;
  return raw;
}

async function main() {
  const currentCode = currentTypeCode();
  const root = document.getElementById("types-root");
  if (!root) return;
  try {
    const types = await loadJSON("data/types.json");
    const codes = Object.keys(types).sort();
    if (codes.length === 0) throw new Error("types.json is empty");

    // Bucket by group
    const buckets = new Map(GROUP_DEFS.map(g => [g.id, []]));
    for (const code of codes) {
      const def = types[code];
      if (!def || !def.code) continue;
      const g = groupOf(def.code);
      if (!buckets.has(g)) buckets.set(g, []);
      buckets.get(g).push(def);
    }

    // Render groups in the predefined order
    const frag = document.createDocumentFragment();
    for (const g of GROUP_DEFS) {
      const items = (buckets.get(g.id) || []).slice().sort((a, b) => a.code.localeCompare(b.code));
      if (items.length === 0) continue;
      frag.appendChild(renderGroup(g, items, currentCode));
    }

    root.removeAttribute("aria-busy");
    root.replaceChildren(frag);
    swapToDetailImages(root);
  } catch (err) {
    console.error(err);
    renderError(err && err.message ? err.message : String(err));
  }
}

function swapToDetailImages(root) { // codeql[js/xss-through-dom]: same pattern as type.js — see suppression note
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
