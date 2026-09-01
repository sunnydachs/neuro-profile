// app-nav.js — shared site nav (used by all three pages)
// Renders the common "診断 / タイプ一覧" tabs into #site-nav if present,
// and marks the current page link as active.
const NAV_LINKS = [
  { href: "index.html", label: "診断" },
  { href: "types.html", label: "タイプ一覧" },
];

function currentPage() {
  // Use the trailing segment of location.pathname; "type.html" treated as part of types.
  const path = (location.pathname || "").split("/").pop() || "index.html";
  return path;
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
    a.href = link.href;
    a.textContent = link.label;
    const isActive = (here === link.href) || (link.href === "types.html" && onTypes);
    if (isActive) a.classList.add("is-active");
    a.setAttribute("aria-current", isActive ? "page" : "false");
    inner.appendChild(a);
  }
  root.replaceChildren(inner);
}

initSiteNav();
