# Generates en siblings for data/profiles.json and data/types.json from a single
"""Generate the English field maps for all 16 types (writes .i18n_tmp/en_output.json)."""
# definition of the 16-type English content. Run via: python3 scripts/gen_en_data.py
# Keeps the canonical repeated phrases DRY; output is merged by the JS-free merge
# helper (scripts/merge_en_json.py). Idempotent.

import json, os, collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)

# ---------------- canonical fragments (English, hedged tone) ----------------
F_NEW = "strong interest in, and approach tendency toward, the new"
F_CHANGE = "sharp instincts for novelty and a positive take on change"
F_LEARN = "learns from challenges and seizes many growth opportunities"
F_ORGANIZE = "skilled at organising information and thinking in a structured way"
F_PLAN = "delivers steady results through planning and reliability"
F_THINK = "deep thought and imagination let them build a world of their own"
F_INSIGHT = "a clear view of themselves and insight from reflection"
F_AXIS = "keeps a clear axis of their own and decides without being swayed"
F_INDEP = "self-reliant and able to deliver on their own"
F_ACTION = "action-oriented and skilled at producing results by actually doing"
F_LEARNFAST = "absorbs quickly from a high volume of stimulation"
F_EMPATHY = "picks up on others' feelings and builds warm relationships"
F_TEAM = "eases the mood of a team and draws out its strengths"
F_RISK = "can sense risk and choose the safe path"
F_SAFE = "heads off major failures through caution"
F_GUT = "intuition and flashes of insight unlock ideas beyond the usual frame"
F_QUICK = "reacts and adapts swiftly to the situation at hand"

W_JUMP = "can jump at whatever is new and struggle to stay focused"
W_RISK = "tends to under-estimate risk"
W_OVERT = "can overthink and delay decisions or action"
W_PLANCHANGE = "can find it hard to handle changes or surprises in a plan"
W_INNER = "can retreat inward and lose touch with reality"
W_DAYDREAM = "can lose time to daydreams and put action off"
W_VERIFY = "can skip checking the facts after a gut call"
W_DETAIL = "can struggle with detail and consistency checks"
W_DISTANT = "can keep too much distance and drift toward isolation"
W_FRICTION = "can create friction where empathy and cooperation are expected"
W_MOVED = "can absorb too much of others' emotion and tire easily"
W_BOUNDARY = "can lose sight of their own feelings and boundaries"
W_CAUTION = "can be so cautious that they miss good opportunities"
W_SLOWFIRST = "can take time to make a first step"
W_EXTERNAL = "can be swept along by outside stimulation and ignore their inner life"
W_NOREFLECT = "can struggle to carve out calm time for reflection"

REL_WARM = ("Naturally picks up on others' feelings and relates warmly. Values emotional "
            "connection and wants to help; the flip side is that absorbing too much emotion "
            "can leave them tired.")
REL_COOL = ("Keeps a clear personal axis and relates to people calmly at a comfortable "
            "distance. Rational and sincere, though at times keeps too much distance and "
            "can drift toward isolation.")

LEARN_REFLECTIVE = ("Learns well through systematic understanding and deep dives — sorting out "
                    "concepts and reasoning in their own head until it clicks. Suited to unhurried, "
                    "deep study.")
LEARN_EXPERIENCE = ("Learns through experience and trying things — touching and failing on the spot "
                    "until it settles in. Suits a do-it-then-understand style rather than sitting in "
                    "lectures or reading textbooks.")
LEARN_PROCEDURE = ("Learns through procedures and practice — laying out steps and repeating them by "
                   "hand until they stick. Excels where the goal and the process are clear.")

SCINOTE = ("This check does not perform brain measurement (fMRI, EEG, etc.). It infers psychological "
           "and cognitive characteristics from your answers and builds the profile by reference to "
           "related neuroscience research. It does not directly measure activity, size, or "
           "neurotransmitter levels in any specific brain region.")
DISCLAIMER_SHARE = "This is not a brain measurement — an inference of tendencies."

NEURO = {
    "executive": "Executive Control Network",
    "reward": "Reward & Motivation System",
    "dmn": "Default Mode Network",
    "salience": "Salience / Interoceptive System",
    "vigilance": "Vigilance & Threat-Processing System",
    "social": "Social Cognition Network",
    "emotion": "Emotion Regulation System",
}

# ja neural-system name -> en canonical (used to map neuro_top3 / share medals)
NEURO_LOOKUP = {
    "報酬・動機づけ系": NEURO["reward"],
    "警戒・脅威処理系": NEURO["vigilance"],
    "実行制御ネットワーク": NEURO["executive"],
    "デフォルトモード": NEURO["dmn"],
    "サリエンス／内受容系": NEURO["salience"],
    "社会認知ネットワーク": NEURO["social"],
    "情動調節系": NEURO["emotion"],
}

# ---------------- axis labels / focus (by type) ----------------
LABEL = {}
LABEL["E"] = F_NEW
LABEL["V"] = "strongly cautious and vigilant"
LABEL["A"] = "moves things forward with analysis and planning"
LABEL["I"] = "judges through intuition and in-the-moment feeling"
LABEL["N"] = "directs energy toward an inner world"
LABEL["X"] = "draws energy from engaging with the outer world"
LABEL["S"] = "highly empathetic and in tune with others' feelings"
LABEL["D"] = "strongly independent and calmly keeps a cool distance when deciding"

FOCUS_N = "easily moved by the unfamiliar and by challenges"
FOCUS_A = "organises information and prepares a plan before acting"
FOCUS_I = "trusts gut feel more than logic"
FOCUS_INNER = "values inner life, imagination and reflection"
FOCUS_OUTER = "draws inspiration from settings, people and stimulation"
FOCUS_V = "easily senses and prepares for risk and uncertainty"
FOCUS_S = "likes emotional connection with others"
FOCUS_D = "moves forward guided by their own values"

def axis_labels(code):
    """Localized English axis-label list for a type code (motivation, processing, target, interpersonal)."""
    return [LABEL[code[0]], LABEL[code[1]], LABEL[code[2]], LABEL[code[3]]]
def axis_focus(code):
    """Localized English axis-focus sentences for a type code."""
    m = code[0] == "V"
    return [FOCUS_V if m else FOCUS_N,
            FOCUS_A if code[1] == "A" else FOCUS_I,
            FOCUS_INNER if code[2] == "N" else FOCUS_OUTER,
            FOCUS_S if code[3] == "S" else FOCUS_D]

# ---------------- names / catches ----------------
NAME = {
 "EAND":"Visionary Architect","EANS":"Idealist Planner","EAXD":"Strategic Executor",
 "EAXS":"Orchestrating Planner","EIND":"Visionary Dreamer","EINS":"Intuitive Explorer",
 "EIXD":"Intuitive Pioneer","EIXS":"Sensory Explorer","VAND":"Cautious Architect",
 "VANS":"Empathetic Designer","VAXD":"Steady Overseer","VAXS":"Social Cogniser",
 "VIND":"Reflective Navigator","VINS":"Guarded Reflector","VIXD":"Cautious Responder",
 "VIXS":"Sensitive Guardian",
}
CATCH = {
 "EAND":"Carving out new territory on your own through vision and analysis",
 "EANS":"Picturing an ideal and making it real through empathy and planning",
 "EAXD":"Executing plans with your own hands to secure solid results",
 "EAXS":"Heading toward a goal and achieving it by planning with a team",
 "EIND":"Shaping inner ideas in a way that is fully your own",
 "EINS":"Jumping into a new world carrying inner vision and empathy",
 "EIXD":"Blazing quickly through uncharted ground on your own",
 "EIXS":"Stepping into the unknown with others, led by your senses",
 "VAND":"Preparing thoroughly and building things up steadily on your own",
 "VANS":"Steadily building a foundation of safety through empathy and planning",
 "VAXD":"Keeping order and results through calm, cool analysis",
 "VAXS":"Standing ready with the team to watch for risk and prepare",
 "VIND":"Deepening your own thinking in a safe inner space",
 "VINS":"Observing and nurturing your inner world with care",
 "VIXD":"Sniffing out change and protecting what matters by your own judgement",
 "VIXS":"Reading your surroundings through attentive senses and empathy",
}

# ---------------- strengths / warnings / growth ----------------
ST = {}
WT = {}
GR = {}
CORE_E = [F_CHANGE, F_LEARN]
CORE_V = [F_RISK, F_SAFE]
ANA = [F_ORGANIZE, F_PLAN]
INT = [F_GUT, F_QUICK]

def build_st(code):
    """Return 8 localized English strengths for a type code."""
    first = CORE_E if code[0] == "E" else CORE_V
    proc = ANA if code[1] == "A" else INT
    # target axis: inner vs outer
    target = [F_THINK, F_INSIGHT] if code[2] == "N" else [F_ACTION, F_LEARNFAST]
    # interpersonal: S -> empathy/team, D -> own-axis/independent
    interp = [F_EMPATHY, F_TEAM] if code[3] == "S" else [F_AXIS, F_INDEP]
    return (first + proc + target + interp)[:8]

def build_wt(code):
    """Return 8 localized English watchpoints (warnings) for a type code."""
    w = []
    if code[0] == "E":
        w += [W_JUMP, W_RISK]
    else:
        w += [W_CAUTION, W_SLOWFIRST]
    w += [W_OVERT, W_PLANCHANGE] if code[1] == "A" else [W_VERIFY, W_DETAIL]
    w += [W_INNER, W_DAYDREAM] if code[2] == "N" else [W_EXTERNAL, W_NOREFLECT]
    w += [W_DISTANT, W_FRICTION] if code[3] == "D" else [W_MOVED, W_BOUNDARY]
    return w[:8]
def build_gr(code):
    """Return 4 localized English growth suggestions for a type code."""
    g = ["Sometimes pause to check the risk before acting.",
         "After a gut call, take a moment to check the evidence."] if code[1]=="I" else \
        ["Sometimes pause to check the risk before acting.",
         "Practice trying things as you go, before over-thinking."]
    if code[0]=="V":
        g[0] = "Add small test steps to build a sense of safety."
    g.append("Consciously cross-check your inner world against outer reality."
             if code[2]=="N" else
             "Carve out regular time away from people and stimulation to reflect.")
    g.append("Sometimes step a little closer and try empathy and cooperation."
             if code[3]=="D" else
             "Hold your own feelings and boundaries too, not just empathy.")
    return g

STRESS_E = ("Under stress you tend to act on impulse from restlessness and to chase new "
            "stimulation as a distraction. To settle, pause and re-order your priorities and "
            "run one risk check.")
STRESS_V = ("Under stress your vigilance rises and anxiety or worry can get in the way of moving. "
            "To settle, avoid assuming the worst — take one small step and rebuild a sense of safety.")
def stress(code): return STRESS_E if code[0]=="E" else STRESS_V
def learn(code):
    """Return the localized English learning style for a type code."""
    if code[1]=="A": return LEARN_PROCEDURE
    return LEARN_EXPERIENCE if code[2]=="X" else LEARN_REFLECTIVE
def rel(code): return REL_WARM if code[3]=="S" else REL_COOL

WORK = {
 "EAND":"Excels where you shape an independent vision at your own pace — deepening a plan and pursuing it alone. Heavily-directed environments sit less well.",
 "EANS":"Excels where you warm ideas up and bring people along through empathy — picturing a new concept and building it with others. Fine-grained administrative work suits you less.",
 "EAXD":"Excels in independent, pioneering work where you set a goal and deliver results yourself. Being tightly micromanaged sits less well.",
 "EAXS":"Excels when launching something new and getting people on board — rallying a team to carve out a fresh territory. Monotonous routine work is a poor fit.",
 "EIND":"Excels where you shape an independent vision at your own pace — deepening a plan and pursuing it alone. Heavily-directed environments sit less well.",
 "EINS":"Excels where you warm ideas up and bring people along through empathy — picturing a new concept and building it with others. Fine-grained administrative work suits you less.",
 "EIXD":"Excels in independent, pioneering work where you set a goal and deliver results yourself. Being tightly micromanaged sits less well.",
 "EIXS":"Excels when launching something new and getting people on board — rallying a team to carve out a fresh territory. Monotonous routine work is a poor fit.",
 "VAND":"Excels where you build things up alone and steadily through reflection and caution, in a setting with little interference. Being rushed about suits you less.",
 "VANS":"Excels where you value a caring inner compass and support those around you with empathy — in warm relationships and a stable environment. Rapidly changing settings sit less well.",
 "VAXD":"Excels where you manage results through cool analysis and independent judgement, keeping order and advancing reliably. Vague, hands-off environments suit you less.",
 "VAXS":"Excels where you support a team and manage risk — reassuring those around you with caution and empathy. Settings that push reckless gambles sit less well.",
 "VIND":"Excels where you build things up alone and steadily through reflection and caution, in a setting with little interference. Being rushed about suits you less.",
 "VINS":"Excels where you value a caring inner compass and support those around you with empathy — in warm relationships and a stable environment. Rapidly changing settings sit less well.",
 "VIXD":"Excels where you manage results through cool analysis and independent judgement, keeping order and advancing reliably. Vague, hands-off environments suit you less.",
 "VIXS":"Excels where you support a team and manage risk — reassuring those around you with caution and empathy. Settings that push reckless gambles sit less well.",
}

# scientific_background by type code
SCI = {
 "EAND":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Executive Control Network (prefrontal and parietal cortex). Moving forward through analysis and planning has been linked to the Reward & Motivation System, and directing energy toward an inner world to the Default Mode Network.",
 "EANS":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Moving forward through analysis and planning has been linked to the Executive Control Network, and directing energy toward an inner world to the Default Mode Network.",
 "EAXD":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Executive Control Network (prefrontal and parietal cortex). Moving forward through analysis and planning has been linked to the Reward & Motivation System, and drawing energy from the outer world to the Vigilance & Threat-Processing System.",
 "EAXS":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Moving forward through analysis and planning has been linked to the Executive Control Network, and drawing energy from the outer world to the Social Cognition Network.",
 "EIND":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Judging through intuition and in-the-moment feeling has been linked to the Default Mode Network, and directing energy toward an inner world to the Salience / Interoceptive System.",
 "EINS":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Judging through intuition and in-the-moment feeling has been linked to the Default Mode Network, and directing energy toward an inner world to the Salience / Interoceptive System.",
 "EIXD":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Judging through intuition and in-the-moment feeling has been linked to the Salience / Interoceptive System, and drawing energy from the outer world to the Executive Control Network.",
 "EIXS":"Your answers fit a cognitive profile with a strong interest in what is new and an approach tendency; this is studied in relation to the Reward & Motivation System (a reward circuitry centred on the ventral striatum). Judging through intuition and in-the-moment feeling has been linked to the Salience / Interoceptive System, and drawing energy from the outer world to the Social Cognition Network.",
 "VAND":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Executive Control Network (prefrontal and parietal cortex). Moving forward through analysis and planning has been linked to the Vigilance & Threat-Processing System, and directing energy toward an inner world to the Default Mode Network.",
 "VANS":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Moving forward through analysis and planning has been linked to the Executive Control Network, and directing energy toward an inner world to the Default Mode Network.",
 "VAXD":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Executive Control Network (prefrontal and parietal cortex). Moving forward through analysis and planning has been linked to the Vigilance & Threat-Processing System, and drawing energy from the outer world to the Reward & Motivation System.",
 "VAXS":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Moving forward through analysis and planning has been linked to the Executive Control Network, and drawing energy from the outer world to the Social Cognition Network.",
 "VIND":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Judging through intuition and in-the-moment feeling has been linked to the Default Mode Network, and directing energy toward an inner world to the Salience / Interoceptive System.",
 "VINS":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Judging through intuition and in-the-moment feeling has been linked to the Default Mode Network, and directing energy toward an inner world to the Salience / Interoceptive System.",
 "VIXD":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Judging through intuition and in-the-moment feeling has been linked to the Salience / Interoceptive System, and drawing energy from the outer world to the Executive Control Network.",
 "VIXS":"Your answers fit a cognitive profile that is cautious and vigilant; this is studied in relation to the Vigilance & Threat-Processing System (includes the amygdala). Judging through intuition and in-the-moment feeling has been linked to the Salience / Interoceptive System, and drawing energy from the outer world to the Social Cognition Network.",
}
CODES = list(NAME.keys())

def features_short(code):
    """Return the one-line English feature summary for a type code."""
    return ". ".join(axis_labels(code)) + "."
def features_long(code):
    """Return the English long description for a type code."""
    return (axis_labels(code)[0].capitalize() + ", an approach that " + axis_labels(code)[1] +
            ", one that " + axis_labels(code)[2] + ", and a style that " + axis_labels(code)[3] +
            " — this combination forms a distinctive cognitive profile.")

# ---------------- build per-code en map (fields present in profiles.json) ----------------
def build_profile(code, profile=None):
    """Build the full English field map for one type code (name..neuro_top3, share)."""
    profile = profile or {}
    ja_top3 = (profile.get("neuro_top3") or {}).get("ja") or []
    labels = axis_labels(code)
    return {
        "name": NAME[code],
        "catch": CATCH[code],
        "axis_labels": labels,
        "axis_focus": axis_focus(code),
        "features_short": features_short(code),
        "features_long": features_long(code),
        "strengths": build_st(code),
        "warnings": build_wt(code),
        "stress": stress(code),
        "learning": learn(code),
        "work": WORK[code],
        "relationships": rel(code),
        "growth": build_gr(code),
        "scientific_background": SCI[code],
        "scientific_note": SCINOTE,
        "neuro_top3": [NEURO_LOOKUP.get(m, m) for m in ja_top3],
    }

if __name__ == "__main__":
    pfile = os.path.join(ROOT, "data", "profiles.json")
    tfile = os.path.join(ROOT, "data", "types.json")
    with open(pfile, encoding="utf-8") as fh: P = json.load(fh)
    with open(tfile, encoding="utf-8") as fh: T = json.load(fh)

    PROFILES = {}
    for code in CODES:
        profile = P.get(code, {})
        base = build_profile(code, profile)
        ja_share = (profile.get("share") or {})
        ja_medals = (ja_share.get("medals") or {}).get("ja") or []
        PROFILES[code] = dict(base)
        PROFILES[code]["share"] = {
            "title": f"I'm a {NAME[code]} ({code}) 🧠",
            "bullets": axis_labels(code)[:3],
            "medals": [NEURO_LOOKUP.get(m, m) for m in ja_medals],
            "disclaimer": DISCLAIMER_SHARE,
        }

    # for types.json: name, catch, axis_labels, axis_focus, strengths, warnings, neuro_top3(EN)
    TYPES = {}
    for code in CODES:
        base = PROFILES[code]
        ja_top3 = (T.get(code, {}).get("neuro_top3") or {}).get("ja") or []
        TYPES[code] = {
            "name": base["name"],
            "catch": base["catch"],
            "axis_labels": base["axis_labels"],
            "axis_focus": base["axis_focus"],
            "strengths": base["strengths"],
            "warnings": base["warnings"],
            "neuro_top3": [NEURO_LOOKUP.get(m, m) for m in ja_top3],
        }
        # profiles.json neuro_top3 handled below on write (inject per existing ja arrays)

    out = os.path.join(ROOT, ".i18n_tmp", "en_output.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"profiles": PROFILES, "types": TYPES}, fh, ensure_ascii=False, indent=2)
    print("wrote", out)