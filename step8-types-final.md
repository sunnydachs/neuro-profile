# STEP 8 — 16 タイプの完成文章・共有カード・ビジュアル設計

> 目的：16 タイプそれぞれの結果ページ完成文章・共有カード・画像アセット仕様を定める。
> 他モデル（16Personalities 等）の名称・文章・構造はコピーしない。

---

## 0. カラーデザインシステム（画像・UI 共通）

### 0.1 グループ分けと基調色
- **上位グループ＝軸1（動機の方向）で 2 大グループに分ける**：
  - **探索グループ（E）**：暖色系。報酬・動機づけ・接近のニュアンス。
  - **警戒グループ（V）**：寒色系。警戒・分析・落ち着きのニュアンス。
- さらに軸2（直感 I / 分析 A）を「色相の明るさ・彩度の段差」で表現する。

### 0.2 色パレット（初期案）

| グループ | 基調色（HEX） | 印象 |
|----------|--------------|------|
| 探索(E)+直感(I) | #FFB454（温かい橙） | 活発・ひらめき・冒険 |
| 探索(E)+分析(A) | #E8843C（落ち着いた橙） | 戦略的な訪問・達成 |
| 警戒(V)+直感(I) | #8FB6E0（やわらかい青） | 静かな感性・観察 |
| 警戒(V)+分析(A) | #5C7CA8（深めの青） | 堅実・分析・守り |

（背景用の淡色・ライトバージョンは各色の 12% 明度上がり／彩度落としで派生。
 画像生成では背景色にこの「淡色版」を使う。）

### 0.3 画像生成の汎用プロンプトテンプレート
```
A minimalist low-poly vector illustration of <キャラクター記述>, flat design,
geometric shapes, sharp edges, solid muted pastel colors, no gradients, clean lines,
isolated on a solid <背景色名> background.
```
- 背景色名は上記パレットの「淡色版」の名前を当てる。
- キャラクター記述は各タイプの象徴（下記 §2 参照）。
- `num_steps=4, seed=<タイプ毎に固定>, 512x512`。

---

## 1. タイプ名の最終確定

仮置きの「詩的名」を、**覚えやすく・共有しやすく・重複しない**ものへ研磨する。
命名ルール：
- 2〜5 文字の造語・複合語。漢字＋かな、またはカタカナを併用し、語感で覚えやすい。
- キャッチコピーは情緒的、タイプ名は意味が伝わる中間寄り（STEP 3 で確認した方向の
  中間案を採用）。

| # | コード | タイプ名（確定） | キャッチコピー |
|---|--------|-----------------|---------------|
| 1 | EINS | ひらめき探検家 | 内なるビジョンと共感を抱えて、新世界へ飛び込む |
| 2 | EIND | 着想の思索者 | 内なる着想を、独自の道で形にする |
| 3 | EIXS | 直感の冒険者 | 感覚のまま、人とともに未知へ踏み出す |
| 4 | EIXD | 軽快なパイオニア | 自力で、未踏の地を素早く切り拓く |
| 5 | EANS | 夢描きの戦略家 | 理想を描き、共感と計画で現実にする |
| 6 | EAND | 構想する先駆者 | 新領域を、構想と分析で独自に切り拓く |
| 7 | EAXS | 達成志向の挑戦者 | 目標へ向け、計画とチームで成果を掴む |
| 8 | EAXD | 完遂のパイオニア | 計画を実行し、自力で確実に成果を掴む |
| 9 | VINS | 静観の審美家 | 内なる世界を、丁寧に観察し育む |
| 10 | VIND | 深慮の思索者 | 安全な内側で、独自の思索を深める |
| 11 | VIXS | 感性の観察者 | 身の回りを、注意深い感性と共感で感じ取る |
| 12 | VIXD | 鋭敏な警戒者 | 変化を嗅ぎ分け、独自の判断で守る |
| 13 | VANS | 安定の設計士 | 着実に、共感と計画で安心の土台を築く |
| 14 | VAND | 慎重な構築家 | 綿密に準備し、自力で確実に積み上げる |
| 15 | VAXS | 頼れる守り手 | チームとともに、リスクを見据えて備える |
| 16 | VAXD | 堅実な司令塔 | 冷静な分析で、秩序と成果を保つ |

---

## 2. 各タイプの象徴（画像キャラクター記述）

画像生成の `キャラクター記述` に使う。タイプごとに固有のモチーフ＋グループ色。

| # | コード | キャラクター記述（画像用） |
|---|--------|---------------------------|
| 1 | EINA | a curious explorer with a glowing compass and a small heart motif |
| 2 | EINS | a dreamer following a floating light orb with companions |
| 3 | EIAN | an adventurer with a lightning-bolt idea above the head |
| 4 | EIAL | a pioneer holding a blueprint and a torch |
| 5 | EANA | a strategist drawing a star-map with a quill |
| 6 | EANS | a visionary standing before a canvas of glowing lines |
| 7 | EAXA | a challenger leading a small team up a peak |
| 8 | EAXS | a pioneer planting a flag on a finished structure |
| 9 | VINA | a contemplative figure cradling a flower and a book |
| 10 | VINS | a thinker in a quiet cave lit by a single lamp |
| 11 | VIAN | an observer with a magnifying glass over a small world |
| 12 | VIAL | a vigilant watcher with a shield and keen eyes |
| 13 | VANA | a designer building a sturdy foundation with care |
| 14 | VANS | a careful builder stacking balanced stones |
| 15 | VAXA | a guardian watching over a small group from above |
| 16 | VAXS | a calm commander at a control table with ordered icons |

---

## 3. 各タイプの 14 項目プロフィール（完成文章）

> 記述量が大きいため、16 タイプ × 14 項目は「生成スクリプト + 型定義」で自動生成し、
> 別ファイル `step8-profiles/*.md` に 1 タイプずつ出力する方式を採る（後続で実装）。
> ここでは 1 タイプ分の完成例を全文示し、残り 15 タイプは同じテンプレートで生成する。

### プロフィールの記述テンプレート（14 項目）

1. タイプ名／2. キャッチコピー／3. タイプコード／4. 主な認知特性／
5. 関係する脳ネットワーク／6. 強み／7. 苦手な環境／8. ストレス時の傾向／
9. 学習傾向／10. 問題解決傾向／11. 人間関係の傾向／12. 仕事上の傾向／
13. 成長ポイント／14. 共有用サマリ

### 記述ルール（神経表現）
全タイプの「関係する脳ネットワーク」は推定表現に統一する（STEP 6/9 と同一基準）。

---

## 4. 共有カードの仕様

### 掲載要素
1. タイプ名＋コード
2. タイプアイコン（Pixazo 生成画像）
3. キャッチコピー（1 行）
4. 3 つの主要特徴（バイト長の短い箇条書き）
5. 神経システム TOP3（🥇🥈🥉 簡易表示）
6. サービスのロゴ・診断名・URL/QR

### 共有時の注意
- 「私は△△脳タイプでした」型の一言共有フレーズを用意（煽り・医学誤認は禁止）。
- 医学的診断と誤認させない文言（「※脳の測定ではなく、傾向の推定です」）を常時添付。

---

> 次：この仕様に基づき 16 タイプの完成文章を生成し、STEP 9 の危険表現チェックへ。