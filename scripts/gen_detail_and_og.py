#!/usr/bin/env python3
"""詳細ページ用大画像（業界構造 ABSTRACT）と OGP 用画像（1200x630）を生成する。"""
import json, os, sys, time, urllib.request
from pathlib import Path

PIXAZO_URL = "https://gateway.pixazo.ai/flux-1-schnell/v1/getData"

CHARACTERS = {
    "EINS":"an explorer holding a glowing compass, with a heart-shaped beacon",
    "EIND":"a dreamy thinker with a floating light bulb and an open book",
    "EIXS":"an adventurer with a lightning-bolt idea, with companions",
    "EIXD":"a swift pioneer holding a flag and a torch",
    "EANS":"a strategist drawing a star-map with a quill",
    "EAND":"a visionary before a canvas of glowing lines",
    "EAXS":"a challenger leading a team up a peak",
    "EAXD":"a pioneer planting a flag on a finished structure",
    "VINS":"a contemplative figure cradling a flower and a book",
    "VIND":"a thinker in a quiet cave lit by a single lamp",
    "VIXS":"an observer with a magnifying glass over a small world",
    "VIXD":"a vigilant watcher with a shield and keen eyes",
    "VANS":"a designer building a sturdy geometric foundation",
    "VAND":"a careful builder stacking balanced stones",
    "VAXS":"a guardian watching over a group from above",
    "VAXD":"a calm commander at a control table with ordered icons",
}

GROUP_COLOR = {
    "EI":"light warm orange",
    "EA":"soft muted orange",
    "VI":"light soft blue",
    "VA":"soft muted blue",
}

def load_key():
    key = os.environ.get("PIXAZO_API_KEY")
    if key: return key
    env = "/home/arari/projects/ai-short-video/.env"
    if os.path.exists(env):
        for line in open(env):
            if line.startswith("PIXAZO_API_KEY="):
                return line.split("=",1)[1].strip().strip('"\'')
    raise RuntimeError("PIXAZO_API_KEY not found")

def gen_image(path, prompt, key, seed, w, h):
    body = json.dumps({
        "prompt": prompt, "num_steps": 4, "seed": seed,
        "width": w, "height": h,
    }).encode()
    req = urllib.request.Request(PIXAZO_URL, data=body, headers={
        "Content-Type":"application/json",
        "Cache-Control":"no-cache",
        "Ocp-Apim-Subscription-Key": key,
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        resp = json.load(r)
    url = resp.get("output") or resp.get("url")
    if not url:
        raise RuntimeError(f"no output: {resp}")
    req2 = urllib.request.Request(url, headers={
        "User-Agent":"Mozilla/5.0","Referer":"https://gateway.pixazo.ai/",
    })
    with urllib.request.urlopen(req2, timeout=60) as r:
        data = r.read()
    Path(path).write_bytes(data)

def main():
    key = load_key()
    out_detail = Path("/home/arari/projects/neuro-profile/assets/types-detail")
    out_og = Path("/home/arari/projects/neuro-profile/assets/og")
    out_detail.mkdir(parents=True, exist_ok=True)
    out_og.mkdir(parents=True, exist_ok=True)

    for code, desc in CHARACTERS.items():
        bg = GROUP_COLOR[code[0]+code[1]]
        seed = sum(map(ord, code))

        # 詳細用大画像
        dpath = out_detail / f"{code}.png"
        dprompt = f"A minimal low-poly vector full-body scene of {desc}, muted pastel palette, geometric environment, clean composition, isolated on a solid {bg} background."
        gen_image(dpath, dprompt, key, seed, 1024, 1024)
        print(f"detail: {dpath} ({os.path.getsize(dpath)}B)")
        time.sleep(0.3)

        # OGP 用（1200x630）
        opath = out_og / f"{code}.png"
        oprompt = f"A minimal low-poly vector wide banner of {desc}, flat design, geometric shapes, solid muted pastel colors, clean lines, isolated on a solid {bg} background, suitable as a social share banner."
        gen_image(opath, oprompt, key, seed+1, 1200, 630)
        print(f"og:     {opath} ({os.path.getsize(opath)}B)")
        time.sleep(0.3)

    print("DONE")

if __name__ == "__main__":
    main()