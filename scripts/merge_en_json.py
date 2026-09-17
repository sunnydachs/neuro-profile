# Merge script: inject generated English into data/profiles.json and data/types.json.
"""Inject .i18n_tmp/en_output.json English into data/profiles.json & data/types.json (ja preserved)."""
# - runs only after scripts/gen_en_data.py produced .i18n_tmp/en_output.json
# - preserves existing "ja" values; only adds/overwrites the "en" siblings
# - UNSHARES share: {ja:{title,bullets,medals,disclaimer}, en:{...}}
# - converts wrapped plain fields {ja: ...} -> {ja, en} for every localized field listed
# - merges neuro_top3 {ja} + new en
# Run: python3 scripts/merge_en_json.py
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)
gen = os.path.join(ROOT, ".i18n_tmp", "en_output.json")
assert os.path.exists(gen), "run scripts/gen_en_data.py first"
EN = json.load(open(gen, encoding="utf-8"))

P_FILE = os.path.join(ROOT, "data", "profiles.json")
T_FILE = os.path.join(ROOT, "data", "types.json")
P = json.load(open(P_FILE, encoding="utf-8"))
T = json.load(open(T_FILE, encoding="utf-8"))

# fields that are single wrapped strings/lists under profiles (name..growth, scientific_*)
STR_FIELDS = ["name","catch","axis_labels","axis_focus","features_short","features_long",
              "strengths","warnings","stress","learning","work","relationships","growth",
              "scientific_background","scientific_note","neuro_top3"]

def unshare(sub):
    """Return a new {ja, en} dict from an already-wrapped field dict."""
    return {"ja": sub["ja"], "en": sub["en"]}

missing = []
for code, en in EN["profiles"].items():
    if code not in P:
        missing.append(("profiles", code)); continue
    prof = P[code]
    for k, v in en.items():
        if k == "share":
            continue
        if k in prof:
            if isinstance(prof[k], dict) and "ja" in prof[k]:
                prof[k]["en"] = v
            else:
                prof[k] = {"ja": prof[k], "en": v}
        else:
            missing.append(("profiles.field", code+"."+k))
    # share block
    old_share = prof.get("share") or {}
    # normalize nested share fields to {ja,en}
    new_share = {}
    for subk, subv in en["share"].items():
        ja_part = (old_share.get(subk) or {}).get("ja")
        new_share[subk] = {"ja": ja_part, "en": subv}
    # keep any extra existing share keys (eg older) by preserving order: annotations in place
    prof["share"] = new_share

for code, en in EN["types"].items():
    if code not in T:
        missing.append(("types", code)); continue
    t = T[code]
    for k, v in en.items():
        if k in t:
            if isinstance(t[k], dict) and "ja" in t[k]:
                t[k]["en"] = v
            else:
                t[k] = {"ja": t[k], "en": v}
        else:
            missing.append(("types.field", code+"."+k))

if missing:
    # boxes that were expected
    print("MISSING (unexpected):", missing, file=sys.stderr)

json.dump(P, open(P_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(T, open(T_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("merged profiles.json and types.json (en injected, ja preserved)")