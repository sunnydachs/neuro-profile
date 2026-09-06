// app/i18n.js — language detection and per-language UI strings.
//
// Resolution order (per docs/i18n-design.md §2):
//   1. URL prefix (/en/ → 'en')
//   2. Explicit user choice stored in localStorage
//   3. navigator.languages (browser preference)
//   4. Fallback: 'ja'
//
// Translation text in data/*.json uses the "plan C" shape:
//   { "structure": [...], "text": { "ja": {...}, "en": {...} }, "scale": {...} }
// For profile/axis/type fields, translatable strings are wrapped:
//   { "ja": "...", "en": "..." }

const STORAGE_KEY = "neuro-profile:lang";
const SUPPORTED = ["ja", "en"];
const DEFAULT_LANG = "ja";
const EN_PREFIX = /^\/en\//;

const listeners = new Set();

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.includes(v)) return v;
  } catch { /* localStorage may be unavailable */ }
  return null;
}

function writeStored(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); }
  catch { /* ignore */ }
}

function fromNavigator() {
  const list = (typeof navigator !== "undefined" && navigator.languages) || [];
  for (const tag of list) {
    const lower = String(tag).toLowerCase();
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("ja")) return "ja";
  }
  return null;
}

function fromURL() {
  if (typeof location === "undefined") return null;
  return EN_PREFIX.test(location.pathname) ? "en" : null;
}

export function detectLang() {
  return fromURL() || readStored() || fromNavigator() || DEFAULT_LANG;
}

export function currentLang() {
  return detectLang();
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  writeStored(lang);
  for (const fn of listeners) {
    try { fn(lang); } catch (e) { console.error(e); }
  }
}

// Per-language UI strings. Keep keys stable; English values are EN: placeholders
// awaiting real translation (per docs/i18n-design.md §6 step 6).
const UI_STRINGS = {
  ja: {
    "lang.ja": "日本語",
    "lang.en": "English",
    "lang.label": "言語",
  },
  en: {
    "lang.ja": "Japanese",
    "lang.en": "English",
    "lang.label": "Language",
  },
};

export function t(key) {
  const lang = currentLang();
  return (UI_STRINGS[lang] && UI_STRINGS[lang][key]) || UI_STRINGS.ja[key] || key;
}

// Resolve a translatable field for the active language.
// Falls back to 'ja', then to the raw value, so a missing translation never breaks the page.
export function pickL10n(field, lang = currentLang()) {
  if (field == null) return "";
  if (typeof field === "string") return field;
  if (typeof field !== "object") return String(field);
  if (typeof field[lang] === "string") return field[lang];
  if (typeof field.ja === "string") return field.ja;
  const arr = field[lang] || field.ja;
  return Array.isArray(arr) ? arr : "";
}

// Returns a copy of `obj` where each i18n-wrapped field is replaced with the
// current-language string/array. Used to feed type.js / app.js which still
// expect a flat shape (profile.name, profile.catch, etc.).
export function withLang(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = (v && typeof v === "object" && ("ja" in v || "en" in v)) ? pickL10n(v) : v;
  }
  return out;
}

// Update document-level language signals: <html lang>, og:locale.
// Per-page modules own their <title> rewrite; this is the minimal common layer.
export function applyLang() {
  const lang = currentLang();
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    const og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", lang === "en" ? "en_US" : "ja_JP");
  }
  return lang;
}
