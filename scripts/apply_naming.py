#!/usr/bin/env python3
"""16タイプの name（日本語型名）と neural_name（英語コードネーム）を
type-naming-final.md の確定版に一括更新する。

- types.json / profiles.json の両方に反映。
- name: 「〇〇型」に更新
- neural_name: 新規フィールドとして追加
- catch（キャッチコピー）は変更しない。
"""
import json
from pathlib import Path

ROOT = Path("/home/arari/projects/neuro-profile")

# code -> (neural_name, japanese_type)
NAMING = {
    "EINS": ("SALIENCE SCOUT", "直感探査型"),
    "EIND": ("INNER DREAMER", "内観直感型"),
    "EIXS": ("MIRROR SCOUT", "感覚探査型"),
    "EIXD": ("SALIENCE PIONEER", "直感開拓型"),
    "EANS": ("PREFRONTAL DREAMER", "構想制御型"),
    "EAND": ("CORTEX ARCHITECT", "前頭構想型"),
    "EAXS": ("EXECUTIVE ORCHESTRA", "計画統括型"),
    "EAXD": ("EXECUTIVE ENGINE", "実行制御型"),
    "VINS": ("NEURO SENTINEL", "警戒内省型"),
    "VIND": ("DEFAULT NAVIGATOR", "深慮直感型"),
    "VIXS": ("INSULA WATCHER", "感覚警戒型"),
    "VIXD": ("AMYGDALA GUARD", "警戒反応型"),
    "VANS": ("MIRROR BUILDER", "共感設計型"),
    "VAND": ("CORTEX ARCHITECT", "前頭制御型"),
    "VAXS": ("EMPATHY NODE", "社会認知型"),
    "VAXD": ("EXECUTIVE CORE", "統括制御型"),
}

# 旧 name -> 新 JAPANESE TYPE（文章内の埋め込み置換用）
OLD_NAME = {
    "EINS": "ひらめき探検家",
    "EIND": "着想の思索者",
    "EIXS": "直感の冒険者",
    "EIXD": "軽快なパイオニア",
    "EANS": "夢描きの戦略家",
    "EAND": "構想する先駆者",
    "EAXS": "達成志向の挑戦者",
    "EAXD": "完遂のパイオニア",
    "VINS": "静観の審美家",
    "VIND": "深慮の思索者",
    "VIXS": "感性の観察者",
    "VIXD": "鋭敏な警戒者",
    "VANS": "安定の設計士",
    "VAND": "慎重な構築家",
    "VAXS": "頼れる守り手",
    "VAXD": "堅実な司令塔",
}


def update_record(rec):
    code = rec.get("code")
    if not code or code not in NAMING:
        return rec
    neural_name, jp_type = NAMING[code]
    old = OLD_NAME[code]
    # name を更新
    rec["name"] = jp_type
    # neural_name を追加（先頭寄りに挿入）
    rec["neural_name"] = neural_name
    # 文章内の旧name埋め込みを置換（share.title など）
    rec = replace_in_strings(rec, old, jp_type)
    return rec


def replace_in_strings(obj, old, new):
    """オブジェクト内の全文字列に含まれる old を new に置換（nameフィールドは除く対象を明示的に除く）。"""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "name":
                # name は既に更新済みなのでそのまま（ただしここでは再代入しない）
                out[k] = v
                continue
            out[k] = replace_in_strings(v, old, new)
        return out
    if isinstance(obj, list):
        return [replace_in_strings(x, old, new) for x in obj]
    if isinstance(obj, str):
        return obj.replace(old, new)
    return obj


def main():
    for fname in ["data/types.json", "data/profiles.json"]:
        path = ROOT / fname
        data = json.loads(path.read_text(encoding="utf-8"))
        if fname == "data/types.json":
            for code, rec in data.items():
                data[code] = update_record(rec)
        else:  # profiles.json（同じく code キー辞書）
            for code, rec in data.items():
                data[code] = update_record(rec)
        path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"updated {fname} ({len(data)} records)")

    print("DONE")


if __name__ == "__main__":
    main()