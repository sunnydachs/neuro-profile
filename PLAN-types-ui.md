# タイプ一覧・詳細ページ機能の実装計画（16Personalities 風）

> 目的：現在の単一結果ページに加え、上部に「タイプ一覧タブ」を設け、タイプカード一覧・
> タイプ別詳細ページを新設する。コピーではなくベストプラクティスの参照。

---

## 1. 目標

現在の実装は「質問 → 結果表示」への1方向導線。ここに以下を追加する：

1. **タイプ一覧ページ**（`types.html`）：全16タイプを4グループでカード表示。
2. **タイプ詳細ページ**（`type.html?type=EINS` 等）：選択タイプの詳細プロフィールを表示。
3. **ナビゲーション**：全ページ共通のヘッダータブ（「診断」「タイプ一覧」等）。

---

## 2. 16Personalities の構造分析（参照元）

### 2.1 タイプ一覧ページ（`16personalities.com/personality-types`）
- **4 つの「大分野」**でグループ化：Analysts（紫）/ Diplomats（緑）/ Sentinels（青緑）/ Explorers（黄）。
- 各タイプは **カード形式**：
  - 左に **SVG アバター**（flat/幾何学的スタイル、全身像、男性・女性バージョン別）
  - **タイプ名（通称）**（例：Architect）
  - **コードバリアント**（例：INTJ-A / INTJ-T）
  - **なんと言わんかキャッチコピー**（例："Imaginative and strategic thinkers..."）
- カードが詳細ページへのリンクになっている。
- 「Take the test」CTA が各グループ区切りと下部に配置。

### 2.2 タイプ詳細ページ（`16personalities.com/entj-personality`）
- **Introduction**（タイプ名・コード・特徴の核心、雰囲気イラスト＝SVGのアニメ）
- **特徴の叙述セクション**（例：Striving for Greatness, A Worthy Challenge）
- **強み・弱点**（Strengths & Weaknesses、次ページへのリンク）
- **人気の有名人・キャラクター**（例：Marvel characters, Steve Jobs）
- **「Unlock now」CTA**（有料レポートへの誘導）
- **共有**（SNS・QR）
- **Comments**（読者コメント）
- 言語切替・検索（サイト規模による）

### 2.3 画像アセットの戦略（16Personalities）
- **アバター**：SVG、flat design、幾何学的、グループ色に合わせた配色。
- **中のイラスト**：SVG アニメーション（セクションの表情を付加）。
- **共有カード**：Type-specific PNG（OGP/画像）。
- **背景**：時代や組織に合わせた配色だが、内容を邪魔しない最小限。

---

## 3. 本サービスへの落とし込み設計

### 3.1 グループ構造の対応
本サービスは **4つの色グループ**を活用する（既存のカラーデザインを活用）：

| グループ | 軸1×軸2 | 色 | 類似の16Personalities グループ |
|----------|---------|-----|---------------------------|
| 1 | E×I（探索×直感） | #FFB454（暖橙） | Explorers (黄) に近い |
| 2 | E×A（探索×分析） | #E8843C（橙） | Analysts (紫) に近い |
| 3 | V×I（警戒×直感） | #8FB6E0（薄青） | Diplomats (緑) に近い |
| 4 | V×A（警戒×分析） | #5C7CA8（深青） | Sentinels (青) に近い |

→ タイプ一覧ページは、この4グループで区切ってカード表示する。

### 3.2 ページ構成（新規）

```
index.html           (現在：診断のエントリ)
  app.css / app.js / app/scoring.js
  data/*.json
types.html           (タイプ一覧)
type.html?type=EINS  (タイプ詳細、JS で ?type= を解釈)
assets/types/*.png   (既存 16 タイプ画像)
assets/types-large/*.png  (詳細用・大きい画像、必要なら)
```

### 3.3 タイプ一覧ページ（types.html）

**元素 → 16Personalities 風だがオリジナルに再構成**
- ヘッダータブ（共通ナビ）：
  - 「診断」（index.htmlへ）／「タイプ一覧」（types.html、活性）
- 4グループごとに見出し + 2x4 グリッド（モバイルは 1 列 → 2 列）。
- 各カード：
  - 画像（`assets/types/{CODE}.png`）
  - タイプ名（例：ひらめき探検家）
  - コード（例：EINS）
  - キャッチコピー
  - **リンク**：`type.html?type=EINS`
- 下部に CTA「診断する」（index.html へのリンク）。

**重要**：画像は `assets/types/{CODE}.png` を流用。アニメーションやSVGは現段階で不要。

### 3.4 タイプ詳細ページ（type.html?type=EINS）

URL パラメータでタイプコードを受け取り、`data/profiles.json` から該当タイプだけを
クライアント JS でレンダリングする（静的生成もできるが、今回は動的描画で十分）。

**セクション構成**（16Personalities を参考に、本サービスの14セクションを活かす）：

1. **ヒーロー**：タイプ名・コード・キャッチコピー・大画像（同じ PNG）。
2. **特徴（features_long）**：中心テキスト。
3. **神経システム TOP3**：🥇🥈🥉 ＋ ★表示（step6 の方法を踏襲）、**推定である注記**。
4. **認知プロフィール**（axis_labels、軸の説明）。
5. **過去の強み・注意・ストレス・学習・仕事・人間関係・成長**：
   これは `data/profiles.json` の既存フィールドを、そのまま「読み物」として表示。
6. **科学的背景**：`scientific_background`。
7. **科学的な注意**：`scientific_note`。
8. **共有**：共有テキスト（`share.disclaimer` 含む）。
9. **「あなたの診断で合致か」CTA**：質問へのリンク。
10. **「他のタイプ」 への区切りリンク**：「探索×直感」「一覧へ戻る」等。

**留意点**：16Personalities の「有名人・コメント」はスコープ外（実文案なし）。ただし
将来拡張を考えたセクション切り離しは設計に入れる。

### 3.5 画像アセット戦略

**既存（そのまま使う）**：
- `assets/types/{CODE}.png`（512x512、ローポリ・フラット・パステル）
  → 一覧カードのアイコン・詳細ページのヒーロー画像に流用。

**今後生成するもの（必要時）**：
1. **詳細ページのフルボディ/背景**イメージ（16Personalitiesの「アニメーション」の代替）
   - `assets/types-detail/{CODE}.png`（例：1024x1024、背景、やや大きめ）
   - プロンプト：`A minimal low-poly vector full-body scene of <character>, in muted <group color> palette, abstract geometric environment, clean composition, isolated on <group color> background.`
2. **共有カード用 OGP 画像**（OGP用、1200x630）
   - タイプ名・コード・キャッチコピー・基調色の背景色で構成。
   - 後続タスクで生成する。

**画像命名規則**（一貫性確保）：
- アバター/サムネイル：`assets/types/{CODE}.png`
- 詳細画像（背景・大きめ）：`assets/types-detail/{CODE}.png`
- OGP 共有：`assets/og/{CODE}.png`

---

## 4. 実装ステップ（計画）

フェーズを分けて段階的に進める。まず「一覧＋詳細」の基本動作を完成させ、後から画像拡張する。

### Phase 1：基本構造（最小限の動くもの）
1. types.html：16タイプを4グループのカードで表示。
2. type.html：URL ?type=CODE でプロフィールを動的表示。
3. 既存 index.html に「タイプ一覧」リンク追加（共通ナビ）。

### Phase 2：UX強化
1. タイプカードにホバーエフェクト＋グループ色で強調。
2. 詳細ページに「前/次タイプ」へのナビ機能（Cyclic）。
3. 画像遅延読み込み（loading="lazy"）。

### Phase 3：画像拡充
1. 詳細用の大きい背景画像を `assets/types-detail/` に16枚生成。
2. OGP 用共有画像を `assets/og/` に生成。
3. favicon の整備。

### Phase 4：コンテンツブラッシュアップ
1. process *step8-profiles* の文質改善（必要があれば）。
2. 「このタイプになりやすい質問傾向」などの補足（後続）。

---

## 5. 技術的決定（確定したことを記録）

- **動的レンダリング**：`type.html では URLSearchParams で type= を取得し、
  data/profiles.json から type のデータを取り出す。
- **共有**は既存の app.js の共有 compose 方法に統一。
- **言語表現は step9-review.md の基準を厳守**（「〜しやすい可能性」等）。
- 詳細ページでの「測定ではなく傾向」は必ず表示（STEP9 要件）。

---

> この計画に基づき、まず Phase 1（types.html + type.html の基本実装）を Codex に委任する。