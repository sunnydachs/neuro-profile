// scripts/gen-type-pages.js
// Generates static HTML pages (one per type) so social crawlers (which do not
// run JavaScript) receive correct per-type OGP meta tags + type image.
// Output: og/type-<CODE>.html for every profile in data/profiles.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "og");

const BASE_URL = "https://neuro-profile.pages.dev";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function main() {
  const raw = readFileSync(resolve(ROOT, "data/profiles.json"), "utf8");
  const profiles = JSON.parse(raw);
  const codes = Object.keys(profiles);
  const tmpl = readFileSync(resolve(ROOT, "type.html"), "utf8");

  mkdirSync(OUT_DIR, { recursive: true });

  for (const code of codes) {
    const p = profiles[code];
    const ogDesc = `${p.name}（${p.code}）— ${p.catch}。脳・認知タイプの傾向プロフィール。`;
    const ogImage = `assets/og/${code}.png`;
    const pageUrl = `${BASE_URL}/og/type-${code}.html`;
    const ogTitle = `${p.name}（${p.code}）| 脳・認知タイプ`;

    // Replace head meta block with per-type values (crawler-visible without JS).
    // type.html body remains; JS (type.js) will still run and enhance the page.
    let html = tmpl
      // title
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(ogTitle)}</title>`)
      // description
      .replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${esc(ogDesc)}" />`)
      // og:title
      .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${esc(ogTitle)}" />`)
      .replace(/<meta property="og:description"[^>]*\/>/, `<meta property="og:description" content="${esc(ogDesc)}" />`)
      .replace(/<meta property="og:type"[^>]*\/>/, `<meta property="og:type" content="article" />`)
      .replace(/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${esc(pageUrl)}" />`)
      .replace(/<meta property="og:image"[^>]*\/>/, `<meta property="og:image" content="${BASE_URL}/${ogImage}" />`)
      .replace(/<meta property="og:image:width"[^>]*\/>/, `<meta property="og:image:width" content="1200" />`)
      .replace(/<meta property="og:image:height"[^>]*\/>/, `<meta property="og:image:height" content="624" />`)
      .replace(/<meta name="twitter:title"[^>]*\/>/, `<meta name="twitter:title" content="${esc(ogTitle)}" />`)
      .replace(/<meta name="twitter:description"[^>]*\/>/, `<meta name="twitter:description" content="${esc(ogDesc)}" />`)
      .replace(/<meta name="twitter:image"[^>]*\/>/, `<meta name="twitter:image" content="${BASE_URL}/${ogImage}" />`);

    // Insert <base href="/"> so relative asset/data paths resolve from site root
    // even though this page lives in the /og/ subdirectory.
    html = html.replace(/<head>/, `<head>\n<base href="/">`);

    writeFileSync(resolve(OUT_DIR, `type-${code}.html`), html, "utf8");
  }
  console.log(`Generated ${codes.length} pages in ${OUT_DIR}`);
}

main();
