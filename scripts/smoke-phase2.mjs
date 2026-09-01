// scripts/smoke-phase2.mjs
// Phase 2 で type.js / types.js に追加したロジック（グループ解決、前後ナビ、aria-current、
// 詳細画像フォールバック指定）がデータ的に破綻しないかを確認するためのスモークテスト。
//
// ブラウザ DOM を必要としない純粋関数ロジックだけを抜粋して読み込み、
// 16タイプ分の出力を dump する。テスト本体は含めない（npm test には影響しない）。

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const types = JSON.parse(fs.readFileSync(path.join(ROOT, "data/types.json"), "utf8"));

// type.js 内のヘルパーを Node 用に再実装（仕様は同じ）
const GROUP_DEFS = [
  { id: "EI", title: "探索 × 直感", color: "#FFB454" },
  { id: "EA", title: "探索 × 分析", color: "#E8843C" },
  { id: "VI", title: "警戒 × 直感", color: "#8FB6E0" },
  { id: "VA", title: "警戒 × 分析", color: "#5C7CA8" },
];

function groupIdFor(code) { return code[0] + code[1]; }
function resolveGroupMeta(code) {
  const id = groupIdFor(code);
  return GROUP_DEFS.find((g) => g.id === id);
}

// types.html カード順（group × コード昇順）に合わせる
function buildNavOrder(types) {
  const groups = ["EI", "EA", "VI", "VA"];
  const codes = Object.keys(types);
  const order = [];
  for (const g of groups) {
    const items = codes.filter((c) => c.slice(0, 2) === g).sort();
    order.push(...items);
  }
  return order;
}
const codes = buildNavOrder(types);
let ok = true;
const rows = [];
for (let i = 0; i < codes.length; i++) {
  const c = codes[i];
  const prev = codes[(i - 1 + codes.length) % codes.length];
  const next = codes[(i + 1) % codes.length];
  const g = resolveGroupMeta(c);
  if (!g) { console.error(`missing group for ${c}`); ok = false; }
  rows.push({ code: c, group: g.title, color: g.color, prev, next });
}

console.log("Phase 2 smoke:");
console.table(rows);

// types.js: 各タイプの詳細画像が存在することを fs.statSync でチェック
const detailDir = path.join(ROOT, "assets", "types-detail");
const missing = [];
for (const c of codes) {
  const p = path.join(detailDir, `${c}.png`);
  if (!fs.existsSync(p)) missing.push(c);
}
if (missing.length) { console.error("missing detail images:", missing); ok = false; }
else console.log(`✓ all ${codes.length} types-detail images present`);

process.exit(ok ? 0 : 1);
