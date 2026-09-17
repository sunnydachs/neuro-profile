# Merge English Q/A + axis_meta into data/*.json (preserves ja; only fills en).
# Run after scripts/gen_en_questions.py .
import json, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)
gen = os.path.join(ROOT, ".i18n_tmp", "en_qa.json")
assert os.path.exists(gen), "run scripts/gen_en_questions.py first"
EN = json.load(open(gen, encoding="utf-8"))

QFILE = os.path.join(ROOT, "data", "questions.json")
AFILE = os.path.join(ROOT, "data", "axis_meta.json")
Q = json.load(open(QFILE, encoding="utf-8"))
A = json.load(open(AFILE, encoding="utf-8"))

Q["text"]["en"] = {str(k): v for k, v in EN["questions"].items()}
Q["scale"]["en"] = EN["scale"]

# axis_meta: inject per-item en siblings
for i, ax in enumerate(EN["axes"]):
    a = A["axes"][i]
    for k in ("name","positive","negative","positive_short","negative_short"):
        a[k]["en"] = ax[k]
for i, n in enumerate(EN["neuro"]):
    ne = A["neuro_systems"][i]
    for k in ("label","region","description"):
        ne[k]["en"] = n[k]

json.dump(Q, open(QFILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(A, open(AFILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# sanity
missing = [k for k in map(str, range(1,51)) if k not in Q["text"]["en"]]
print("questions en keys:", len(Q["text"]["en"]), "missing:", missing or "none")
print("scale en:", Q["scale"]["en"])
print("axes en name[0]:", A["axes"][0]["name"])
print("neuro en[0]:", A["neuro_systems"][0]["label"]["en"])