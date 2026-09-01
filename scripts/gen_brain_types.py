#!/usr/bin/env python3
"""16タイプの「脳キャラ」画像を Pixazo (Flux-Schnell) で生成する。

タッチ（確定版）: 白〜クリームのぷにぷにした脳ブロブ、点目だけ（口・手・足なし）、
もちもち質感。各タイプの対応ブライン部位に応じて「形」と「役割のアクセント」を変える。
背景はグループ淡色（EI/EA=オレンジ系、VI/VA=ブルー系）。
出力: assets/brain/<CODE>.png（512x512）
"""
import json, os, time, urllib.request
from pathlib import Path

PIXAZO_URL = "https://gateway.pixazo.ai/flux-1-schnell/v1/getData"
OUT = Path("/home/arari/projects/neuro-profile/assets/brain")


def load_key():
    key = os.environ.get("PIXAZO_API_KEY")
    if key:
        return key
    env = "/home/arari/projects/ai-short-video/.env"
    if os.path.exists(env):
        for line in open(env):
            if line.startswith("PIXAZO_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"\'').strip("'")
    raise RuntimeError("PIXAZO_API_KEY not found")


# 部位 -> (形の記述, アクセントの記述)
REGION_SHAPE = {
    "amygdala": (
        "a small round almond-shaped squishy brain blob",
        "a tiny muted indigo-violet glowing dot on each side, like a quiet alert marker",
    ),
    "prefrontal": (
        "a wide rounded brain blob with a large smooth broad frontal surface",
        "thin tiny circuit-like lines in a delicate grid pattern across the front",
    ),
    "insula": (
        "a brain blob with a deep soft fold in the center like a hidden island",
        "faint soft green concentric ripple marks around the fold",
    ),
    "striatum": (
        "a small chubby round brain grain blob",
        "a warm orange glowing dot, softly shining like a reward spark",
    ),
    "dmn": (
        "a gentle curving brain blob with soft inner curves",
        "tiny pale gold star-like dots scattered like a quiet starry field",
    ),
    "social": (
        "a smooth brain blob with a soft flowing junction line, gently two-lobed",
        "a soft pink-to-coral ring accent",
    ),
    "acc": (
        "a slender arc-shaped brain blob curving softly",
        "a white-silver subtle crossing light mark",
    ),
}

# 16タイプ -> (region, グループ色)
TYPES = {
    "EINS": ("striatum",  "EI"),
    "EIND": ("dmn",       "EI"),
    "EIXS": ("striatum",  "EI"),
    "EIXD": ("striatum",  "EI"),
    "EANS": ("prefrontal","EA"),
    "EAND": ("prefrontal","EA"),
    "EAXS": ("prefrontal","EA"),
    "EAXD": ("prefrontal","EA"),
    "VINS": ("amygdala",  "VI"),
    "VIND": ("dmn",       "VI"),
    "VIXS": ("insula",    "VI"),
    "VIXD": ("amygdala",  "VI"),
    "VANS": ("social",    "VA"),
    "VAND": ("prefrontal","VA"),
    "VAXS": ("social",    "VA"),
    "VAXD": ("prefrontal","VA"),
}

# グループ背景色（淡色名）
GROUP_BG = {
    "EI": "soft pale warm orange",
    "EA": "soft muted light orange",
    "VI": "soft pale light blue",
    "VA": "soft muted light blue",
}

# グループのアクセント色名（探索=橙系、警戒=青系）
GROUP_ACCENT = {
    "EI": "warm orange",
    "EA": "warm orange",
    "VI": "soft blue",
    "VA": "soft blue",
}


def build_prompt(region_key, group):
    shape, accent = REGION_SHAPE[region_key]
    bg = GROUP_BG[group]
    acc = GROUP_ACCENT[group]
    # 前頭前野は黄橙/青の差を回路線で出すため、アクセント色を差し込む
    if region_key == "prefrontal":
        accent_desc = f"{acc} circuit lines"
    elif region_key == "striatum":
        accent_desc = f"{accent} glow dot"
    else:
        accent_desc = accent
    return (
        f"A cute squishy white-to-cream brain blob creature: {shape}, "
        f"with tiny two black dot eyes only (no mouth, no arms, no legs), "
        f"gentle neutral calm expression, soft squishy marshmallow mochi texture "
        f"with a subtle glossy highlight, gentle wavy brain folds on the surface. "
        f"It has {accent_desc} as a soft subtle accent. "
        f"Centered on a solid {bg} background with a soft rounded drop shadow. "
        f"Kawaii pastel illustration, adorable and approachable. "
        f"No text, no letters, no labels."
    )


def gen(code, region_key, group, key, seed):
    prompt = build_prompt(region_key, group)
    body = json.dumps({
        "prompt": prompt, "num_steps": 4, "seed": seed,
        "width": 512, "height": 512,
    }).encode()
    req = urllib.request.Request(PIXAZO_URL, data=body, headers={
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Ocp-Apim-Subscription-Key": key,
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.load(r)
    url = resp.get("output") or resp.get("url")
    if not url:
        raise RuntimeError(f"[{code}] no output: {resp}")
    req2 = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://gateway.pixazo.ai/",
    })
    with urllib.request.urlopen(req2, timeout=60) as r:
        data = r.read()
    path = OUT / f"{code}.png"
    path.write_bytes(data)
    return len(data)


def main():
    key = load_key()
    OUT.mkdir(parents=True, exist_ok=True)
    for code, (region_key, group) in TYPES.items():
        seed = sum(map(ord, code)) + 9000
        try:
            n = gen(code, region_key, group, key, seed)
            print(f"[{code}] {region_key:10s} {group} -> {n}B")
        except Exception as e:
            print(f"[{code}] ERROR: {e}")
        time.sleep(0.4)
    print("DONE")


if __name__ == "__main__":
    main()