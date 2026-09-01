# 脳・認知タイプ診断（傾向の推定）

50 問の質問に答えて、16 の「脳・認知タイプの傾向」のうちどれに近い傾向があるかを推定する
**クライアント完結型の Web アプリ**です。

> **これは脳の測定ではありません。**
> 質問への回答パターンから、あなたの**認知特性の傾向**を推定するセルフチェックです。
> 医学的診断や能力の優劣を断定するものではなく、結果は自己理解の参考としてお使いください。

---

## 実行方法

### 方法 A：ブラウザで `index.html` を直接開く

- **Firefox / Safari**：`file://` で開いただけで動作します（ES モジュール対応のブラウザが必要です）。
- **Chrome / Edge**：`file://` では ES モジュールが CORS でブロックされるため、
  以下のいずれかで配信してください。

### 方法 B：ローカル静的サーバ（推奨）

```bash
# 任意の場所から、ファイルのあるディレクトリへ移動
cd neuro-profile

# Python があれば
python3 -m http.server 8000

# あるいは Node があれば
npx serve .
```

その後、ブラウザで `http://localhost:8000/` を開いてください。

### 方法 C：GitHub Pages 等に置く

`index.html`, `app.js`, `app.css`, `app/scoring.js`, `data/*.json`,
`assets/types/*.png` をそのままリポジトリ直下に置けば動きます。

---

## テスト

```bash
npm test              # 両方
npm run test:scoring       # スコアリング仕様テスト
npm run test:integration   # 16タイプ網羅テスト
```

Node 18+ が必要です（`node:test` 相当の ESM と `node:assert` のみ使用）。

---

## ファイル構成

```
neuro-profile/
├── index.html              # エントリ（HTML シェル）
├── app.css                 # モバイルファーストのスタイル
├── app.js                  # UI 状態機械 + レンダリング + シェア
├── app/
│   └── scoring.js          # 純粋なスコアリングエンジン（DOM 非依存）
├── data/
│   ├── questions.json      # 50 問の質問定義
│   ├── axis_meta.json      # 5 軸と神経系 7 系統のメタ情報
│   ├── profiles.json       # 16 タイプの完成プロフィール
│   └── types.json          # 既存の構造化型データ（参考用）
├── assets/
│   └── types/              # 16 タイプの画像（{CODE}.png, 512×512）
├── step1〜step10  *.md    # 既存の設計ドキュメント（参照用）
├── tests/
│   ├── scoring.test.mjs    # スコアリングの単体テスト
│   └── integration.test.mjs # 16 タイプ × 結果構造の統合テスト
└── package.json
```

---

## スコアリング仕様（step5-scoring.md の実装）

| 要素 | 実装 |
| --- | --- |
| 逆転項目 | `s = 6 - r`（Q5-8, Q13-16, Q21-24, Q29-32, Q33-36） |
| 軸スコア 0..100 | `P = (axisMean - 1) / 4 * 100` |
| 欠損処理 | ≤2 欠損 → mean imputation。≥3 欠損 → 軸スコア `null` |
| 極性二値化 | `≥55=HIGH, ≤45=LOW, それ以外=MID` |
| 16 タイプ判定 | 主要4軸が HIGH/LOW なら `exactCode`、MID があれば最近傍ユークリッド距離 |
| 神経系 7 系統 | `NeuroScore = clamp(50 + Σ w·(P-50), 0, 100)`（重みテーブル §5） |
| 信頼度（高/中/低） | 欠損・一貫性・社会的望ましさ・中央/極端 を統合 |

---

## 言語表現ルール（step9）

「あなたの脳は〜」「〜は活発です」「ドーパミンが多い」のような断定表現は禁止。
- ✅ 「〜しやすい可能性」「〜という傾向」「〜と関連づけて研究」
- ✅ 「これは脳の測定ではなく、傾向の推定です」

このルールは UI 文言・共有テキスト・HTML タイトル・`<meta description>` の
すべてに適用されています。

---

## 制限事項

- 16Personalities / MBTI の流用なし（名称・構造・コード方式すべて独自）。
- 軸5（情動の安定性）はタイプ判定に使わず、タイプ内の「ストレス時の傾向」の修飾子として表示。
- fMRI / EEG / 神経伝達物質などの測定は一切行っていません。
