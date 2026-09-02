#!/usr/bin/env python3
"""「タイプ＝脳」ビジュアルのサンプル生成（決定版タッチ）。

方針: 柔らかい不定形の脳アメーバ（角なし）、非対称のなだらかな
シナプス突起、白〜クリームベース、小さな点目だけ（口なし）、
ぷにぷに・もちもち質感。しわ（脳回）をマイルドに表現して「脳」を保つ。
参考: しなぷしゅ（インスパイア／オリジナルに落とし込む）。
"""
import json, os, urllib.request
from pathlib import Path

PIXAZO_URL = "https://gateway.pixazo.ai/flux-1-schnell/v1/getData"
OUT = Path("/home/arari/projects/neuro-profile/assets") / "brain-sample-EINS.png"


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


PROMPT = (
    "A cute soft blob-like brain creature, organic amoeba-shaped silhouette "
    "with no sharp corners, made of a white to cream color, smooth rounded "
    "bumpy protrusions like soft dendrites/synapse bumps along the body, "
    "gentle wavy folds on the surface suggesting a brain's cortex in a very "
    "mild friendly way, tiny two black dot eyes only (no mouth, no arms, "
    "no legs), gentle calm neutral expression, squishy marshmallow mochi "
    "texture with a soft matte finish and subtle glossy highlight, "
    "centered on a soft warm cream background with a soft rounded drop shadow, "
    "kawaii pastel illustration style, adorable and approachable. "
    "No text, no letters, no labels."
)


def main():
    key = load_key()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps({
        "prompt": PROMPT, "num_steps": 4, "seed": 704,
        "width": 1024, "height": 1024,
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
        raise RuntimeError(f"no output: {resp}")
    req2 = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0", "Referer": "https://gateway.pixazo.ai/",
    })
    with urllib.request.urlopen(req2, timeout=60) as r:
        data = r.read()
    OUT.write_bytes(data)
    print(f"OK -> {OUT} ({len(data)}B)")


if __name__ == "__main__":
    main()