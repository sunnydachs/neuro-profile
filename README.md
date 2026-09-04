**English** | [日本語](./README.ja.md)

[![CI](https://github.com/sunnydachs/neuro-profile/actions/workflows/ci.yml/badge.svg)](https://github.com/sunnydachs/neuro-profile/actions/workflows/ci.yml)
[![CodeQL](https://github.com/sunnydachs/neuro-profile/actions/workflows/codeql.yml/badge.svg)](https://github.com/sunnydachs/neuro-profile/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/sunnydachs/neuro-profile/graph/badge.svg)](https://codecov.io/gh/sunnydachs/neuro-profile)
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-025e8c?logo=dependabot)](https://github.com/sunnydachs/neuro-profile/security/dependabot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

# Brain / Cognitive Type Check (tendency inference)

Answer 50 questions and the app infers which of 16 "brain / cognitive-type tendencies"
you are closest to. A **fully client-side web app** — no backend, no data leaves your browser.

> **This is not a measurement of your brain.**
> It is a self-check that infers your **cognitive-tendency** profile from your answer patterns.
> It does not make medical diagnoses or judgments about ability, and the result is meant only
> as a reference for self-understanding.

Live version: <https://neuro-profile.pages.dev/>

---

## Running

### Option A: Open `index.html` directly in a browser

- **Firefox / Safari**: works straight from `file://` (requires a browser with ES module support).
- **Chrome / Edge**: ES modules are blocked by CORS on `file://`, so serve the app by one of
  the methods below instead.

### Option B: Local static server (recommended)

```bash
# From anywhere, move to the app directory
cd neuro-profile

# If you have Python
python3 -m http.server 8000

# Or if you have Node
npx serve .
```

Then open `http://localhost:8000/` in your browser.

### Option C: Host it on GitHub Pages (or any static host)

Deploy `index.html`, `app.js`, `app.css`, `app-nav.js`, `type.js`, `types.js`,
`app/scoring.js`, `data/*.json`, and `assets/brain/*.png` as-is at the repository root.

---

## Tests

```bash
npm test                     # both suites
npm run test:scoring         # scoring-spec tests
npm run test:integration     # 16-type coverage tests
```

Requires Node 18+ (uses only ESM + `node:assert`, like `node:test`).

---

## File structure

```
neuro-profile/
├── index.html              # entry point (diagnostic screen / HTML shell)
├── types.html              # list of all 16 types
├── type.html               # individual type detail (?type=CODE)
├── app.css                 # mobile-first styles
├── app.js                  # diagnostic UI state machine + rendering + share
├── app-nav.js              # site navigation shared across pages
├── type.js                 # individual type detail rendering
├── types.js                # 16-type list rendering
├── app/
│   └── scoring.js          # pure scoring engine (no DOM)
├── data/
│   ├── questions.json      # 50-question definition
│   ├── axis_meta.json      # metadata for 5 axes and 7 neural systems
│   ├── profiles.json       # completed profiles for 16 types
│   └── types.json          # existing structured type data (reference)
├── assets/
│   ├── brain/              # 16 brain-character images ({CODE}.png)
│   ├── types/              # legacy type images (reference)
│   ├── types-detail/       # type-detail images
│   ├── og/                 # OG images
│   └── hero.png            # hero banner
├── og/                     # static HTML for per-type OG image generation
├── docs/                   # design documents (step1–10 and others, reference)
├── scripts/                # dev scripts (image generation, naming application, etc.)
├── tests/
│   ├── scoring.test.mjs    # scoring unit tests
│   └── integration.test.mjs # 16-type × result-structure integration tests
├── LICENSE                 # MIT license
└── package.json
```

---

## Scoring spec (implemented from `docs/step5-scoring.md`)

| Element | Implementation |
| --- | --- |
| Reversed items | `s = 6 - r` (Q5-8, Q13-16, Q21-24, Q29-32, Q33-36) |
| Axis score 0..100 | `P = (axisMean - 1) / 4 * 100` |
| Missing handling | ≤2 missing → mean imputation; ≥3 missing → axis score `null` |
| Polarity binarization | `≥55=HIGH, ≤45=LOW, else MID` |
| 16-type classification | primary 4 axes HIGH/LOW → `exactCode`; otherwise nearest Euclidean distance |
| 7 neural systems | `NeuroScore = clamp(50 + Σ w·(P-50), 0, 100)` (weight table §5) |
| Reliability (high/mid/low) | combines missingness, consistency, social desirability, central/extreme |

---

## Language rules (see `docs/step9-review.md`)

Assertive phrasings such as "your brain is…", "…is active", "you have more dopamine" are prohibited.
- ✅ "may tend to…", "a tendency toward…", "studied in association with…"
- ✅ "This is not a measurement of the brain, but an inference of tendencies."

This rule applies to all UI copy, share text, HTML titles, and `<meta description>`.

---

## Limitations

- No reuse of 16Personalities / MBTI (names, structure, and coding scheme are all original).
- Axis 5 (emotional stability) is not used for type classification; it is shown as a
  "tendency under stress" modifier within a type.
- No fMRI / EEG / neurotransmitter measurement is performed at all.

---

## License

[MIT](./LICENSE)