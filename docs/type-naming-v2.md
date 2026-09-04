# タイプ命名 新仕様（4層構造）

> 目的：タイプ名を「普通の性格診断名」から「神経科学のコードネーム」へ刷新し、
> 名前自体から「脳・神経・認知」を感じさせる。
> 科学的妥当性は「BRAIN SYSTEM / CORE REGION」層で担保（axis_meta.json の
> neuro_systems の label / region をそのまま使用）。

## 4層構造（最終形）

```
TYPE CODE      →  VAND
NEURAL NAME    →  CORTEX ARCHITECT        （神経コードネーム／英語名）
JAPANESE TYPE  →  前頭制御型               （日本語で意味が分かる型名）
BRAIN SYSTEM   →  EXECUTIVE CONTROL NETWORK
CORE REGION    →  DLPFC（背外側前頭前野）
```

- TYPE CODE：既存の 4 文字コード（EINS 等）をそのまま踏襲。
- NEURAL NAME：脳科学用語＋役割の造語。各タイプの TOP1 神経システムに由来。
- JAPANESE TYPE：職業名をやめ「〇〇型」の認知スタイル名に。
- BRAIN SYSTEM / CORE REGION：axis_meta.json の label / region（科学的根拠）。

## 命名ルール

### NEURAL NAME（英語）
- 脳部位（Amygdala / Cortex / Prefrontal / Insula / Salience / Executive /
  Default / Mirror / Social / Empathy / Memory …）＋ 役割語
  （Sentinel / Architect / Scout / Guard / Core / Strategist / Engine /
  Dreamer / Navigator / Node / Reader / Net …）。
- 全量英語大文字で統一。

### JAPANESE TYPE（日本語型名）
- 「〇〇型」で統一。職業名（設計士・守り手・探検家…）は使わない。
- 認知スタイル＋系（探索/警戒/直感/分析）× 対象（内/外）× 対人（共感/独立）を反映。

## 16タイプ 命名案（叩き台）

### ⚡ SALIENCE系（探索×直感 EI ／ 島皮質・前帯状皮質）
| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| EINS | SALIENCE-SCOUT | 直感探査型 | 報酬・動機づけ系 | 腹側線条体 |
| EIND | INSULA-DREAMER | 内観直感型 | 報酬・動機づけ系 | 腹側線条体 |
| EIXS | MIRROR-SCOUT | 感覚探索型 | 報酬・動機づけ系 | 腹側線条体 |
| EIXD | SALIENCE-PIONEER | 直感開拓型 | 報酬・動機づけ系 | 腹側線条体 |

### 🧠 EXECUTIVE系（探索×分析 EA ／ 前頭前野）
| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| EANS | PREFRONTAL-DREAMER | 構想制御型 | 報酬・動機づけ系 | 腹側線条体 |
| EAND | EXECUTIVE-ARCHITECT | 前頭構想型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| EAXS | PREFRONTAL-ORCHESTRA | 計画推進型 | 報酬・動機づけ系 | 腹側線条体 |
| EAXD | EXECUTIVE-ENGINE | 実行統括型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |

### 🌌 DEFAULT系（警戒×直感 VI ／ デフォルトモード）
| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| VINS | NEURO-SENTINEL | 警戒内省型 | 警戒・脅威処理系 | 扁桃体 |
| VIND | DEFAULT-NAVIGATOR | 深慮直感型 | 警戒・脅威処理系 | 扁桃体 |
| VIXS | INSULA-WATCHER | 感覚警戒型 | 警戒・脅威処理系 | 扁桃体 |
| VIXD | AMYGDALA-GUARD | 鋭敏防衛型 | 警戒・脅威処理系 | 扁桃体 |

### 👁 SOCIAL系（警戒×分析 VA ／ 社会認知＋実行）
| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| VANS | MIRROR-BUILDER | 共感設計型 | 警戒・脅威処理系 | 扁桃体 |
| VAND | CORTEX-ARCHITECT | 前頭制御型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| VAXS | EMPATHY-NODE | 共感守護型 | 警戒・脅威処理系 | 扁桃体 |
| VAXD | EXECUTIVE-CORE | 統括分析型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |

## 注意点・要調整

1. **BRAIN SYSTEM の主役選定**：現状は types.json の neuro_top3 TOP1 を反映しているが、
   SALIENCE系（EI）の TOP1 が全員「報酬・動機づけ系」で偏りがある。より
   「脳感」を出すなら、各タイプの軸構成から「最も特徴的な神経システム」を
   個別に再割当てした方が良い（要検討）。
2. **CORE REGION の表記**：axis_meta.json の region は「腹側線条体を中心とする報酬
   回路」のような日本語長文。表示では短縮形（DLPFC / 島皮質 / 扁桃体 / 前頭前野 等）
   と正式名を併記するのが良い。
3. **JAPANESE TYPE のバランス**：「前頭制御型」は良いが、「感覚探索型」「共感設計型」
   など一部まだ汎用的。より「神経・認知」を感じさせる語彙に研磨する余地あり。

## 次のステップ

1. 上記命名をレビュー（特に偏り・重複・「神経感」の強さ）
2. 16タイプの命名を確定 → types.json / profiles.json に反映するデータ構造を設計
3. UI（一覧・詳細・結果）に 4 層構造を表示する実装
4. ブラウザ確認 → レビュー

※ このファイルは「叩き台」。命名はユーザーと摺り合わせて最終確定する。