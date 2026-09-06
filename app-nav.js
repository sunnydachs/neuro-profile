// app-nav.js — shared site nav (used by all three pages).
// Renders the common "診断 / タイプ一覧" tabs into #site-nav if present, marks the
// current page link as active, and renders a language selector that delegates to
// app/i18n.js for the active language.
import { currentLang, setLang, t } from "./app/i18n.js";

const NAV_LINKS = [
  { href: "index.html", label: "診断" },
  { href: "types.html", label: "タイプ一覧" },
];

function currentPage() {
  // Use the trailing segment of location.pathname; "type.html" treated as part of types.
  // /en/index.html → "index.html", /en/ → "index.html"
  const path = (location.pathname || "").replace(/\/$/, "") || "/";
  const seg = path.split("/").pop() || "";
  return seg === "" || seg === "en" ? "index.html" : seg;
}

function isEn() {
  return (location.pathname || "").startsWith("/en/");
}

// Resolve a JA-relative href to the corresponding page in the current locale.
function localizedHref(href) {
  if (isEn()) {
    if (href === "index.html") return "../index.html";
    if (href === "types.html") return "../types.html";
    if (href === "type.html")  return "../type.html";
  }
  return href;
}

function renderLangSelector(root, lang) {
  const wrap = document.createElement("div");
  wrap.className = "site-nav-lang";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", t("lang.label"));

  for (const code of ["ja", "en"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "site-nav-lang-btn";
    btn.textContent = code === "ja" ? "日本語" : "English";
    btn.setAttribute("aria-pressed", lang === code ? "true" : "false");
    btn.disabled = lang === code;
    btn.addEventListener("click", () => {
      if (code === lang) return;
      // Persist the choice, then navigate to the same page in the new locale.
      setLang(code);
      const here = currentPage();
      // Same-page equivalent (clean URLs are stripped of .html by Cloudflare Pages).
      // Resolve against origin root so we land on /en/<page> or /<page> regardless
      // of how many path segments the current page has.
      const url = new URL(location.origin + "/");
      if (code === "en") url.pathname = "/en/" + here;
      else url.pathname = "/" + here;
      location.href = url.href;
    });
    wrap.appendChild(btn);
  }
  root.appendChild(wrap);
}

export function initSiteNav() {
  const root = document.getElementById("site-nav");
  if (!root) return;
  const here = currentPage();
  const onTypes = here === "types.html" || here === "type.html";
  const inner = document.createElement("div");
  inner.className = "site-nav-inner";
  for (const link of NAV_LINKS) {
    const a = document.createElement("a");
    a.href = localizedHref(link.href);
    a.textContent = link.label;
    const isActive = (here === link.href) || (link.href === "types.html" && onTypes);
    if (isActive) a.classList.add("is-active");
    a.setAttribute("aria-current", isActive ? "page" : "false");
    inner.appendChild(a);
  }
  renderLangSelector(inner, currentLang());
  root.replaceChildren(inner);
}

initSiteNav();
