#!/usr/bin/env python3
"""TOPページ用ヒーローイメージを Pixazo (Flux-Schnell) で生成する。

モチーフ: 抽象的な神経ネットワーク図（ノードと接続線のローポリ表現）。
リアルな脳ではなく「認知特性のつながり」を表すジオメトリック表現にし、
科学的誤解（脳＝測定結果）を招かないようにする。
既存タイプ画像の流儀（ミニマル・ローポリ・パステル・単色背景）に合わせる。
"""
import json, os, sys, time, urllib.request
from pathlib import Path

PIXAZO_URL = "https://gateway.pixazo.ai/flux-1-schnell/v1/getData"
OUT = Path("/home/arari/projects/neuro-profile/assets") / "hero.png"


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
    "A minimalist abstract low-poly vector illustration of a neural network: "
    "scattered glowing nodes connected by thin clean lines, forming a gentle web shape. "
    "Flat design, geometric shapes (circles and straight edges), no realistic brain anatomy, "
    "no text, no letters, no numbers, no human face. "
    "Muted pastel palette (soft warm orange and soft blue accents) on a light neutral "
    "background, clean composition, generous negative space, calm and scientific mood."
)


def gen_image(path, prompt, key, seed, w, h):
    body = json.dumps({
        "prompt": prompt, "num_steps": 4, "seed": seed,
        "width": w, "height": h,
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
    Path(path).write_bytes(data)


def main():
    key = load_key()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    seed = 20260901
    # ヒーローは横長（TOPの見出し下に置くバナー）1200x500程度
    gen_image(OUT, PROMPT, key, seed, 1200, 500)
    print(f"OK -> {OUT} ({os.path.getsize(OUT)}B)")


if __name__ == "__main__":
    main()