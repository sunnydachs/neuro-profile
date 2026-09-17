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
  const from_url = fromURL();
  if (from_url) return from_url; // explicit /en/ path always wins
  const stored = readStored();
  if (stored) return stored;     // user-picked explicit lang
  // For the root / JA path: default to 'ja' so Japanese visitors (and shared links)
  // never unexpectedly render English just from a multi-locale browser header.
  return DEFAULT_LANG;
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

// Per-language UI strings. All static UI chrome, buttons, headings, alerts and
// nav live here so app.js / type.js / types.js / app-nav.js can call t(key).
const UI_STRINGS = {
  ja: {
    // nav
    "nav.diagnose": "診断",
    "nav.types": "タイプ一覧",
    "lang.ja": "日本語",
    "lang.en": "English",
    "lang.label": "言語",
    // quiz
    "quiz.kind.regular": "本診断の質問",
    "quiz.kind.social": "信頼性チェック（社会的望ましさ）",
    "quiz.kind.attention": "信頼性チェック（注意散漫）",
    "quiz.kind.consistency": "信頼性チェック（回答の一貫性）",
    "quiz.kind.central": "信頼性チェック（中央寄り）",
    "quiz.kind.meta": "信頼性チェック（総合）",
    "quiz.kind.question": "質問",
    "btn.next": "次へ →",
    "btn.seeResults": "結果を見る →",
    "btn.back": "← 戻る",
    "alert.needAnswer": "回答を選んでください。",
    // result
    "result.section.traits": "あなたの特徴",
    "result.section.neuro": "特に働きやすい可能性のある神経システム",
    "result.section.profile": "認知プロフィール（0〜100）",
    "result.section.strengths": "あなたの強み（傾向として）",
    "result.section.warnings": "注意したいポイント",
    "result.section.stress": "ストレス時の脳・認知傾向",
    "result.section.learning": "学習するとき",
    "result.section.work": "仕事では",
    "result.section.relationships": "人間関係では",
    "result.section.growth": "あなたの成長ポイント",
    "result.section.science": "科学的背景",
    "result.section.share": "共有カード",
    "result.section.reliability": "回答の信頼性",
    "result.regionLabel": "関連が研究されている部位：",
    "result.regionHint": "（傾向推定の参考）",
    "result.cannotDetermine": "診断不能",
    "result.heroLabel": "タイプ名と画像",
    "site.name.ja": "脳・認知タイプ",
    "page.descTemplate": "{name}（{code}）— {catch}。{site}の傾向プロフィール。",
    "disclaimer.tendency": "※ 以下の結果は、回答パターンから推定された<strong>傾向</strong>であり、脳の測定ではありません。",
    "disclaimer.axisScope": "※ 5 つの軸のうち、軸1〜4 がタイプ判定に使われ、軸5（情動の安定）は修飾子として別表示です。",
    "result.section.stressShort": "ストレス時の傾向",
    "disclaimer.feature": "※ 以下は回答パターンからの<strong>傾向推定</strong>です（脳の測定ではありません）。",
    "disclaimer.neuro": "※ これらの神経システムは、回答パターンから推定される<strong>関連可能性</strong>を表示しています。実際の脳活動の測定ではありません。",
    "disclaimer.reliability": "※ 信頼度は、回答パターンから自動推定された参考値です。回答を見直す目安としてご確認ください。",
    // axis
    "axis.noteFormat": "{name}：{value} / 100",
    "axis.fourAxesHint": "※ 5 つの軸のうち、軸1〜4 がタイプ判定に使われ、軸5（情動の安定）は修飾子として別表示です。",
    // tiers
    "tier.veryHigh": "非常に働きやすい可能性",
    "tier.high": "働きやすい可能性",
    "tier.mid": "中程度の傾向",
    "tier.low": "他の系統が相対的に目立つ",
    "tier.other": "この系統より他が前面に立つ傾向",
    // judgment
    "judgment.match": "あなたの回答パターンは「{name}」（{code}）の傾向と一致しています。",
    "judgment.close": "あなたの回答は「{name}」（{code}）に最も近い傾向です（{axes} は中性的）。",
    "list.separator": "・",
    // reliability
    "grade.high": "信頼度：高",
    "grade.mid": "信頼度：中",
    "grade.low": "信頼度：低",
    "flags.missing": "未回答 {n} 問",
    "flags.social": "社会的望ましさ検出（{n} 件）",
    "flags.attention": "注意散漫可能性（{n} 件）",
    "flags.center": "「どちらともいえない」の多用",
    "flags.extreme": "極端回答の多用",
    "flags.same": "同一回答の連打",
    "flags.linePrefix": "（検出された傾向：",
    "flags.lineSuffix": "）",
    // result messages
    "result.unable": "回答数が不足しているため、診断を確定できません。もう一度お試しください。",
    "result.errorTitle": "結果を表示できませんでした",
    "result.errorBody": "回答パターンが想定外でした。もう一度お試しください。",
    "restart.confirm": "回答をリセットして最初に戻ります。よろしいですか？",
    // share / card
    "share.copyText": "共有テキストをコピー",
    "share.copyUrl": "結果URLをコピー",
    "share.saveCard": "カード画像を保存",
    "share.shareX": "X でシェア",
    "share.shareLine": "LINE でシェア",
    "share.restart": "もう一度診断する",
    "share.copied": "コピーしました ✓",
    "share.saved": "保存しました ✓",
    "share.generating": "生成中…",
    "share.cardDisclaimer": "※ 脳の測定ではなく、傾向の推定です",
    "share.reliability": "※ 信頼度：{grade}",
    "share.copyFailed": "コピーできませんでした。テキストを長押しで選択してください。\n\n{text}",
    "share.cardFailed": "カード画像の生成に失敗しました。",
    "gradeShort.high": "高",
    "gradeShort.mid": "中",
    "gradeShort.low": "低",
    // image alt
    "img.typeAlt": "{name} のアイコン",
    // type list / detail page
    "types.loading": "タイプ一覧を読み込み中です…",
    "types.loadError": "タイプ一覧を読み込めませんでした",
    "types.localServerHint": "ローカル静的サーバ（<code>npm run serve</code> など）で開いてください。",
    "types.detailFor": "{name}（{code}）の詳細を見る",
    "types.takeCheck": "診断を受ける",
    "type.detailTitle": "タイプ詳細",
    "type.detailSub": "選択されたタイプのプロフィールを表示します。",
    "type.loading": "タイプ情報を読み込み中です…",
    "type.loadErrorTitle": "タイプ情報を読み込めませんでした",
    "type.backToList": "タイプ一覧へ戻る",
    "type.section.features": "あなたの特徴",
    "type.section.neuroTop3": "神経システム TOP3",
    "type.section.profile": "認知プロフィール",
    "type.section.related": "同じグループの他のタイプ",
    "type.section.share": "共有カード",
    "type.section.sciNote": "科学的な注意",
    "type.neuroRelated": "関連可能性",
    "type.prevNav": "前後のタイプへ",
    "type.prev": "前のタイプ",
    "type.next": "次のタイプ",
    "type.toFirst": "最初のタイプへ",
    "type.navTo": "{label}: {name}（{code}）へ",
    "type.axisKeys": ["動機の方向", "処理様式", "処理対象", "対人志向"],
    "type.scopeDisclaimer": "※ 軸1〜4（主要軸）と軸5（情動の安定）は修飾子として別表示です。",
    // 4 quadrant groups (types.js / type.js)
    "group.EI.title": "探索 × 直感（ひらめきで新しい世界へ）",
    "group.EI.short": "ひらめきで新しい世界へ",
    "group.EI.sub": "報酬接近と直感・即応の傾向。変化とひらめきをエネルギーにします。",
    "group.EA.title": "探索 × 分析（構想を段取りで形にする）",
    "group.EA.short": "構想を段取りで形にする",
    "group.EA.sub": "報酬接近と分析・計画の傾向。構想を描き、手順に落とし込みます。",
    "group.VI.title": "警戒 × 直感（感性と慎重さで周囲を感じる）",
    "group.VI.short": "感性と慎重さで周囲を感じる",
    "group.VI.sub": "警戒・回避と直感・即応の傾向。気配りや内省と素早い反応が同居します。",
    "group.VA.title": "警戒 × 分析（慎重さと計画で確実を積む）",
    "group.VA.short": "慎重さと計画で確実を積む",
    "group.VA.sub": "警戒・回避と分析・計画の傾向。検証と見通しで失敗を遠ざけます。",
  },
  en: {
    // nav
    "nav.diagnose": "Check",
    "nav.types": "Type list",
    "lang.ja": "日本語",
    "lang.en": "English",
    "lang.label": "Language",
    // quiz
    "quiz.kind.regular": "Core diagnostic item",
    "quiz.kind.social": "Reliability check (social desirability)",
    "quiz.kind.attention": "Reliability check (attention)",
    "quiz.kind.consistency": "Reliability check (consistency)",
    "quiz.kind.central": "Reliability check (middle-bias)",
    "quiz.kind.meta": "Reliability check (overall)",
    "quiz.kind.question": "Question",
    "btn.next": "Next →",
    "btn.seeResults": "See results →",
    "btn.back": "← Back",
    "alert.needAnswer": "Please select an answer.",
    // result
    "result.section.traits": "Your traits",
    "result.section.neuro": "Neural systems that may be especially active",
    "result.section.profile": "Cognitive profile (0–100)",
    "result.section.strengths": "Your strengths (as tendencies)",
    "result.section.warnings": "Points to watch",
    "result.section.stress": "Brain & cognitive tendencies under stress",
    "result.section.learning": "When learning",
    "result.section.work": "At work",
    "result.section.relationships": "In relationships",
    "result.section.growth": "Your growth points",
    "result.section.science": "Scientific background",
    "result.section.share": "Share card",
    "result.section.reliability": "Answer reliability",
    "result.regionLabel": "Regions linked in research:",
    "result.regionHint": "(reference for tendency inference)",
    "result.cannotDetermine": "Cannot determine",
    "result.heroLabel": "Type name and image",
    "site.name.ja": "Brain & Cognitive Type",
    "page.descTemplate": "{name} ({code}) — {catch}. A tendency profile from {site}.",
    "disclaimer.tendency": "The following results are <strong>tendencies</strong> inferred from your answer pattern — not a brain measurement.",
    "disclaimer.axisScope": "Of the 5 axes, axes 1–4 determine the type; axis 5 (emotional stability) is shown separately as a modifier.",
    "result.section.stressShort": "Tendencies under stress",
    "disclaimer.feature": "The following are <strong>tendency inferences</strong> from your answer pattern (not a brain measurement).",
    "disclaimer.neuro": "These neural systems show the <strong>potential associations</strong> inferred from your answer pattern. They are not measurements of actual brain activity.",
    "disclaimer.reliability": "Reliability is an automatic reference estimate from your answer pattern — use it as a cue to review your answers.",
    // axis
    "axis.noteFormat": "{name}: {value} / 100",
    "axis.fourAxesHint": "Of the 5 axes, axes 1–4 determine the type; axis 5 (emotional stability) is shown separately as a modifier.",
    // tiers
    "tier.veryHigh": "may be very active",
    "tier.high": "may be active",
    "tier.mid": "moderate tendency",
    "tier.low": "other systems relatively prominent",
    "tier.other": "other systems tend to dominate over this one",
    // judgment
    "judgment.match": "Your answer pattern matches the inclination of “{name}” ({code}).",
    "judgment.close": "Your answers are closest to “{name}” ({code}) ({axes} are neutral).",
    "list.separator": ", ",
    // reliability
    "grade.high": "Reliability: high",
    "grade.mid": "Reliability: moderate",
    "grade.low": "Reliability: low",
    "flags.missing": "{n} unanswered",
    "flags.social": "social-desirability signals detected ({n})",
    "flags.attention": "possible attention scatter ({n})",
    "flags.center": "heavy use of “Neutral”",
    "flags.extreme": "heavy use of extreme answers",
    "flags.same": "same answer throughout",
    "flags.linePrefix": "(signals detected: ",
    "flags.lineSuffix": ")",
    // result messages
    "result.unable": "Not enough answers to confirm a result. Please try again.",
    "result.errorTitle": "Unable to display the result",
    "result.errorBody": "Your answer pattern was unexpected. Please try again.",
    "restart.confirm": "Reset your answers and start over?",
    // share / card
    "share.copyText": "Copy share text",
    "share.copyUrl": "Copy result URL",
    "share.saveCard": "Save card image",
    "share.shareX": "Share on X",
    "share.shareLine": "Share on LINE",
    "share.restart": "Diagnose again",
    "share.copied": "Copied ✓",
    "share.saved": "Saved ✓",
    "share.generating": "Generating…",
    "share.cardDisclaimer": "This is not a brain measurement — it infers tendencies.",
    "share.reliability": "Reliability: {grade}",
    "share.copyFailed": "Could not copy. Long-press the text to select it.\n\n{text}",
    "share.cardFailed": "Failed to generate the card image.",
    "gradeShort.high": "high",
    "gradeShort.mid": "moderate",
    "gradeShort.low": "low",
    // image alt
    "img.typeAlt": "{name} icon",
    // type list / detail page
    "types.loading": "Loading the type list…",
    "types.loadError": "Could not load the type list",
    "types.localServerHint": "Open via a local static server (e.g. <code>npm run serve</code>).",
    "types.detailFor": "View details for {name} ({code})",
    "types.takeCheck": "Take the check",
    "type.detailTitle": "Type detail",
    "type.detailSub": "Showing the profile of the selected type.",
    "type.loading": "Loading type details…",
    "type.loadErrorTitle": "Could not load the type details",
    "type.backToList": "Back to type list",
    "type.section.features": "Your traits",
    "type.section.neuroTop3": "Neural systems TOP 3",
    "type.section.profile": "Cognitive profile",
    "type.section.related": "Other types in the same group",
    "type.section.share": "Share card",
    "type.section.sciNote": "Scientific note",
    "type.neuroRelated": "linkage",
    "type.prevNav": "Previous / next type",
    "type.prev": "Previous type",
    "type.next": "Next type",
    "type.toFirst": "Back to first type",
    "type.navTo": "{label}: to {name} ({code})",
    "type.axisKeys": ["Motivation", "Processing style", "Processing target", "Interpersonal"],
    "type.scopeDisclaimer": "Axes 1–4 determine the type; axis 5 (emotional stability) is shown separately as a modifier.",
    // 4 quadrant groups (types.js / type.js)
    "group.EI.title": "Exploration × Intuition (toward new worlds through inspiration)",
    "group.EI.short": "into new worlds through inspiration",
    "group.EI.sub": "A tendency toward reward-seeking, intuition and quick response — energized by change and inspiration.",
    "group.EA.title": "Exploration × Analysis (shaping ideas through plans)",
    "group.EA.short": "shaping ideas through plans",
    "group.EA.sub": "A tendency toward reward-seeking, analysis and planning — picturing ideas and turning them into steps.",
    "group.VI.title": "Vigilance × Intuition (reading surroundings with care and intuition)",
    "group.VI.short": "sensing the surroundings with intuition and care",
    "group.VI.sub": "A tendency toward vigilance, avoidance, intuition and quick response — thoughtfulness and rapid reaction together.",
    "group.VA.title": "Vigilance × Analysis (building certainty with caution and planning)",
    "group.VA.short": "building certainty with caution and planning",
    "group.VA.sub": "A tendency toward vigilance, avoidance, analysis and planning — checking and foresight keep failure at bay.",
  },
};

// Simple placeholder fill: {name} → value. No positional args.
export function fmt(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m
  );
}

export function t(key) {
  const lang = currentLang();
  const val = (UI_STRINGS[lang] && UI_STRINGS[lang][key]);
  if (val !== undefined && val !== null) return val;
  return UI_STRINGS.ja[key] ?? key;
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
    out[k] = resolveLangField(v);
  }
  return out;
}

// Resolve one value: if it's an i18n-wrapped {ja,en} field → pick the active language;
// if it's a plain nested object (e.g. a share block) → recurse field-by-field.
export function resolveLangField(v) {
  if (v && typeof v === "object") {
    if ("ja" in v || "en" in v) {
      // wrapped scalar/array field — resolve to the active language
      return pickL10n(v);
    }
    // plain container (share, etc.) — resolve each nested field
    return withLang(v);
  }
  return v;
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
