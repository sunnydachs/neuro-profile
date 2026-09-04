# タイプ命名 確定版（4層構造）

> 最終版。名前自体から「脳・神経・認知」を感じさせる。
> BRAIN SYSTEM / CORE REGION は axis_meta.json の neuro_systems（label / region）を正とする。

## 4層構造

```
TYPE CODE      →  VAND
NEURAL NAME    →  CORTEX ARCHITECT     （英語コードネーム）
JAPANESE TYPE  →  前頭制御型            （日本語型名）
BRAIN SYSTEM   →  実行制御ネットワーク   （科学的根拠＝既存label）
CORE REGION    →  前頭前野・頭頂葉       （科学的根拠＝既存region）
```

## 神経システムの対応表（axis_meta.json 準拠＝変更しない）

| BRAIN SYSTEM (label) | CORE REGION (region) | key |
|---|---|---|
| 報酬・動機づけ系 | 腹側線条体を中心とする報酬回路 | reward |
| 警戒・脅威処理系 | 扁桃体を含む | vigilance |
| 実行制御ネットワーク | 前頭前野・頭頂葉 | executive |
| デフォルトモード | 内側前頭・後帯状皮質など | dmn |
| サリエンス／内受容系 | 島皮質・前帯状皮質 | salience |
| 社会認知ネットワーク | 側頭頭頂接合部など | social |
| 情動調節系 | 前頭−辺縁調節回路 | emotion_reg |

## 16タイプ 命名（確定版）

### グループ EI（探索×直感）— ひらめき・接近

| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| EINS | SALIENCE SCOUT | 直感探査型 | 報酬・動機づけ系 | 腹側線条体 |
| EIND | INNER DREAMER | 内観直感型 | デフォルトモード | 内側前頭・後帯状皮質 |
| EIXS | MIRROR SCOUT | 感覚探査型 | 報酬・動機づけ系 | 腹側線条体 |
| EIXD | SALIENCE PIONEER | 直感開拓型 | 報酬・動機づけ系 | 腹側線条体 |

### グループ EA（探索×分析）— 構想・達成

| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| EANS | PREFRONTAL DREAMER | 構想制御型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| EAND | CORTEX ARCHITECT | 前頭構想型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| EAXS | EXECUTIVE ORCHESTRA | 計画統括型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| EAXD | EXECUTIVE ENGINE | 実行制御型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |

### グループ VI（警戒×直感）— 感性・警戒

| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| VINS | NEURO SENTINEL | 警戒内省型 | 警戒・脅威処理系 | 扁桃体 |
| VIND | DEFAULT NAVIGATOR | 深慮直感型 | デフォルトモード | 内側前頭・後帯状皮質 |
| VIXS | INSULA WATCHER | 感覚警戒型 | サリエンス／内受容系 | 島皮質・前帯状皮質 |
| VIXD | AMYGDALA GUARD | 警戒反応型 | 警戒・脅威処理系 | 扁桃体 |

### グループ VA（警戒×分析）— 慎重・堅実

| CODE | NEURAL NAME | JAPANESE TYPE | BRAIN SYSTEM | CORE REGION |
|---|---|---|---|---|
| VANS | MIRROR BUILDER | 共感設計型 | 社会認知ネットワーク | 側頭頭頂接合部 |
| VAND | CORTEX ARCHITECT | 前頭制御型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |
| VAXS | EMPATHY NODE | 社会認知型 | 社会認知ネットワーク | 側頭頭頂接合部 |
| VAXD | EXECUTIVE CORE | 統括制御型 | 実行制御ネットワーク | 前頭前野・頭頂葉 |

## 命名の設計根拠

- **NEURAL NAME**：脳部位（Salience/Insula/Amygdala/Prefrontal/Cortex/Executive/
  Mirror/Empathy/Neuro/Default）＋ 役割（Scout/Dreamer/Pioneer/Architect/Engine/
  Orchestra/Sentinel/Navigator/Watcher/Guard/Builder/Node/Core）。
  → 全量大文字、「神経系のコードネーム」として命名。

- **JAPANESE TYPE**：職業名（探検家/設計士/守り手/司令塔…）を撤廃し、
  「〇〇型」の認知スタイル名に統一。
  前頭制御型・警戒反応型・感覚統合型・社会認知型・内的探索型 などの語彙群を採用。

- **BRAIN SYSTEM / CORE REGION**：axis_meta.json の label / region をそのまま使用。
  科学的妥当性をこの層で担保する（「〜の傾向」という推定表現は従来どおり保持）。

## 残課題（今回スコープ外・棚上げ）

1. 静的 neuro_top3（types.json）と動的計算（scoring.js）のズレ整合 → 別タスク。
2. 各タイプの「優位神経システム TOP3」を、上記 BRAIN SYSTEM に合わせて
   再割り当てする際の、weights（重み）との整合確認 → 別タスク。
3. JAPANESE TYPE の一部語彙（構想制御型/計画統括型/統括制御型）のブラッシュアップ。

※ 本確定版は、NEURAL NAME / JAPANESE TYPE を UI に反映するための命名表。
   BRAIN SYSTEM / CORE REGION は既存データの表示引用。