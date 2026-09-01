#!/usr/bin/env python3
"""16タイプの診断アイコンを Pixazo (Flux-Schnell) で生成する。"""
import json, os, sys, time, urllib.request

PIXAZO_URL = "https://gateway.pixazo.ai/flux-1-schnell/v1/getData"

CHARACTERS = {
 "EINS":"a curious explorer holding a glowing compass with a small heart motif",
 "EIND":"a dreamy thinker with a floating light bulb and a book",
 "EIXS":"an adventurer with a lightning-bolt idea above the head, with friends",
 "EIXD":"a swift pioneer holding a small flag and a torch",
 "EANS":"a strategist drawing a star-map with a quill",
 "EAND":"a visionary standing before a canvas of glowing lines",
 "EAXS":"a challenger leading a small team up a peak",
 "EAXD":"a pioneer planting a flag on a finished geometric structure",
 "VINS":"a contemplative figure cradling a flower and a book",
 "VIND":"a thinker in a quiet cave lit by a single lamp",
 "VIXS":"an observer with a magnifying glass over a small world",
 "VIXD":"a vigilant watcher with a shield and keen eyes",
 "VANS":"a designer building a sturdy geometric foundation",
 "VAND":"a careful builder stacking balanced stones",
 "VAXS":"a guardian watching over a small group from above",
 "VAXD":"a calm commander at a control table with ordered icons",
}

BG = {
 "EI":"light warm orange",
 "EA":"soft muted orange",
 "VI":"light soft blue",
 "VA":"soft muted blue",
}

def style(desc, bg):
    return (f"A minimalist low-poly vector illustration of {desc}, flat design, "
            f"geometric shapes, sharp edges, solid muted pastel colors, no gradients, "
            f"clean lines, isolated on a solid {bg} background.")

def main():
    key = os.environ.get("PIXAZO_API_KEY")
    if not key:
        # .env から読む
        env = "/home/arari/projects/ai-short-video/.env"
        if os.path.exists(env):
            for line in open(env):
                line = line.strip()
                if line.startswith("PIXAZO_API_KEY="):
                    key = line.split("=",1)[1].strip().strip('"').strip("'")
    if not key:
        print("ERROR: PIXAZO_API_KEY not found", file=sys.stderr); sys.exit(1)

    outdir = "/home/arari/projects/neuro-profile/assets/types"
    os.makedirs(outdir, exist_ok=True)

    for code, desc in CHARACTERS.items():
        bg = BG[code[0]+code[1]]
        prompt = style(desc, bg)
        body = json.dumps({
            "prompt": prompt, "num_steps": 4, "seed": sum(map(ord, code)),
            "height": 512, "width": 512,
        }).encode()
        req = urllib.request.Request(PIXAZO_URL, data=body, headers={
            "Content-Type":"application/json",
            "Cache-Control":"no-cache",
            "Ocp-Apim-Subscription-Key": key,
        })
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = json.load(r)
        img_url = resp.get("output") or resp.get("url") or resp.get("data")
        if not img_url:
            print(f"[{code}] NO URL: {resp}", file=sys.stderr); continue
        # ダウンロード（R2 は UA + Referer 必須）
        path = os.path.join(outdir, f"{code}.png")
        req2 = urllib.request.Request(img_url, headers={
            "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer":"https://gateway.pixazo.ai/",
        })
        with urllib.request.urlopen(req2, timeout=60) as r:
            data = r.read()
        with open(path, "wb") as f:
            f.write(data)
        print(f"[{code}] {desc[:40]}... -> {path} ({len(data)}B)")
        time.sleep(0.5)

    print("DONE", len(CHARACTERS))

if __name__ == "__main__":
    main()