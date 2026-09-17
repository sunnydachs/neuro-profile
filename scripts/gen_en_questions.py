# English translation of data/questions.json (50 items + 5-point scale) and
# axis_meta labels/regions. Run: python3 scripts/gen_en_questions.py
# then: python3 scripts/merge_en_questions.py
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)

# ---- 50 items (regular = 1-40; reliability = 41-50) ----
Q = {}
Q[1] = "I feel excited about new places or unknown situations."
Q[2] = "If a reward were guaranteed, I'd take on a challenge with some risk."
Q[3] = "Even at a gathering full of unfamiliar people, I actively start conversations."
Q[4] = "If something looks interesting, I try it even when the outcome is unclear."
Q[5] = "I avoid situations where I might fail and pick the sure path."
Q[6] = "Before starting something new, I research the risks thoroughly."
Q[7] = "In a first-time situation I feel strong anxiety or tension."
Q[8] = "I'd rather avoid situations where the outcome is uncertain."
Q[9] = "When deciding, I trust what feels right more than pure logic."
Q[10] = "I often move to action right away on the spur of the moment."
Q[11] = "I understand things by sensing them with my body first."
Q[12] = "Rather than thinking step by step, I size up the whole at a glance."
Q[13] = "Before deciding, I lay out and compare the pros and cons."
Q[14] = "Before acting, I make a solid plan and the order of steps."
Q[15] = "To reach a conclusion I gather as much information as possible and compare."
Q[16] = "Rather than rush to a decision, I take time to check as I go."
Q[17] = "I enjoy time spent alone in daydreams and imagination."
Q[18] = "I like to look back carefully over my inner self and feelings."
Q[19] = "I spend more time thinking things over in my head than on what's happening."
Q[20] = "I often savour stories or music by connecting them to my own experience."
Q[21] = "I feel more energised when I'm out among people, activity and stimulation."
Q[22] = "Talking with people or meeting outside events often sparks my ideas."
Q[23] = "I feel more at ease or prefer lively places over a quiet room."
Q[24] = "Rather than think it through in my head, I feel most at home handling things or being on site."
Q[25] = "When someone is hurting, I feel a pang in my own chest."   # '胸が痛む'
Q[26] = "I'm good at putting myself in another person's shoes."
Q[27] = "I can read how someone is feeling from their face and expression."
Q[28] = "I naturally find myself thinking about how others feel."
Q[29] = "I tend to judge objectively, without being carried away by others' emotions."
Q[30] = "When solving a problem, I put facts and reason ahead of emotion."
Q[31] = "In relationships I don't push the distance closer than is needed."
Q[32] = "I value a person's logical consistency over group empathy."
Q[33] = "I tend to have big ups and downs in mood."
Q[34] = "I'm prone to anxiety or worry over small things."
Q[35] = "When something unpleasant happens, I keep turning it over for a long time."
Q[36] = "I dwell on criticism or failure longer than most people."
Q[37] = "Even under stress, I can calm myself down fairly quickly."
Q[38] = "My emotions are stable and rarely swing violently."
Q[39] = "Even in a difficult situation, I can cope without panicking."
Q[40] = "I take things less personally and bounce back quickly."
# reliability checks (Japanese source reused from the source file)
Q[41] = "I have never once told a lie."
Q[42] = "I am always completely honest with everyone."
Q[43] = "I have never regretted anything."
Q[44] = "Even on an off day, I can reliably perform at my usual level."
Q[45] = "I have never criticised anyone."
Q[46] = "(consistency) If you answered 'act before thinking', did you answer the opposite items consistently too?"
Q[47] = "(consistency) If you answered 'plan carefully', does it contradict your other answers?"
Q[48] = "In every situation, I can stay perfectly calm."
Q[49] = "I am never at all flustered or anxious about anything."
Q[50] = "(meta) Did you avoid overusing 'Neither' when no option fit?"

SCALE = {"5":"Strongly agree","4":"Somewhat agree","3":"Neutral","2":"Somewhat disagree","1":"Strongly disagree"}

# ---- axis_meta ----
AXES = [
 {"name":"Motivation & Direction","positive":"Exploration & Reward-Seeking","negative":"Vigilance & Avoidance","positive_short":"Exploration","negative_short":"Vigilance"},
 {"name":"Processing Style","positive":"Intuition & Rapid Response","negative":"Analysis & Planning","positive_short":"Intuition","negative_short":"Analysis"},
 {"name":"Processing Target","positive":"Inner World","negative":"Outer World","positive_short":"Inner","negative_short":"Outer"},
 {"name":"Interpersonal Orientation","positive":"Empathy & Social Cognition","negative":"Independent, Analytical Relating","positive_short":"Empathy","negative_short":"Independent"},
 {"name":"Emotional Stability","positive":"Low Variability","negative":"High Variability","positive_short":"Stable","negative_short":"Fluctuating"},
]
NEURO = [
 {"label":"Reward & Motivation System","region":"reward circuitry centred on the ventral striatum","description":"a tendency to pursue goals and rewards"},
 {"label":"Vigilance & Threat-Processing System","region":"includes the amygdala","description":"sensitivity to danger and uncertain cues"},
 {"label":"Executive Control Network","region":"prefrontal and parietal cortex","description":"a tendency for planning, focus and inhibition"},
 {"label":"Default Mode Network","region":"medial frontal and posterior cingulate cortex, among others","description":"a tendency for inner thought, imagination and reflection"},
 {"label":"Salience / Interoceptive System","region":"insula and anterior cingulate cortex","description":"awareness of body sensations and salient information"},
 {"label":"Social Cognition Network","region":"temporo-parietal junction, among others","description":"a tendency to read others' feelings and perspectives"},
 {"label":"Emotion Regulation System","region":"fronto-limbic regulation circuitry","description":"recovering from and stabilising emotional swings"},
]

if __name__ == "__main__":
    out = os.path.join(ROOT, ".i18n_tmp", "en_qa.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"questions": Q, "scale": SCALE, "axes": AXES, "neuro": NEURO},
              open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("wrote", out)