import type { CycleKnowledge } from "./knowledge";

/**
 * Bundled fallback copy of the `cycle_knowledge` Supabase row (id='v1'),
 * seeded via supabase/seed_cycle_knowledge.sql. Used if that table hasn't
 * been seeded yet, or the fetch fails, so the app still works offline-ish.
 * The Supabase row is the source of truth once seeded — edit it there to
 * update content without a redeploy.
 */
export const DEFAULT_CYCLE_KNOWLEDGE: CycleKnowledge = {
  $schema: "cycle-knowledge-base/v1",
  disclaimer:
    "This content is general wellness information, not medical advice. It is not a substitute for guidance from a doctor, gynecologist, or pharmacist — especially before starting any supplement, if symptoms are severe or unusual, or if either partner has an existing health condition or takes medication.",
  cycleModel: {
    notes:
      "Cycle length varies mainly because the follicular phase varies in length; the luteal phase is comparatively fixed at ~14 days across most cycle lengths.",
    defaults: { cycleLengthDays: 28, periodLengthDays: 5, lutealLengthDays: 14 },
    minCyclesForPersonalAverage: 3,
  },
  phases: [
    {
      id: "menstrual",
      name: "Menstrual",
      dayRange: "Day 1 to end of bleeding (default ~5 days)",
      hormoneSummary:
        "Estrogen and progesterone are both at their lowest point of the cycle; the uterine lining sheds.",
      typicalPhysical: ["cramps", "fatigue", "lower back pain", "headache", "bloating easing off"],
      typicalMood: ["low energy", "wanting to slow down / withdraw", "introspective"],
      nutritionFocus: [
        "Iron-rich foods to offset blood loss (leafy greens, legumes, red meat or fortified alternatives)",
        "Pair iron sources with vitamin C (citrus, peppers) to improve absorption",
        "Warm, easy-to-digest meals; stay ahead of hydration",
      ],
      movement: [
        "Light walking, stretching, or restorative yoga",
        "Rest is appropriate if energy is low — this isn't a phase to push hard training",
      ],
      selfCare: [
        "Heat (heating pad / warm bath) for cramps",
        "Extra sleep if possible",
        "Lower social/output expectations of yourself this week",
      ],
      supplements: [
        {
          name: "Magnesium",
          rationale: "Commonly used for muscle relaxation and cramp relief.",
          caution: "Can cause GI upset at high doses; check for interactions with other medications.",
        },
        {
          name: "Iron (only if levels are actually low)",
          rationale: "Supports replacing iron lost with blood.",
          caution:
            "Do not supplement iron without a blood test confirming low ferritin/iron — excess iron is harmful. This one specifically needs a doctor's input first.",
        },
      ],
      prepForNext:
        "Energy typically starts climbing as you move into the follicular phase — a good week to loosely plan (not push) anything demanding.",
    },
    {
      id: "follicular",
      name: "Follicular",
      dayRange: "End of period to a few days before ovulation (~day 6–12 in a 28-day cycle)",
      hormoneSummary:
        "Estrogen rises steadily as follicles develop; this is generally the build-up-in-energy phase.",
      typicalPhysical: ["rising energy", "clearer skin for some", "improved stamina"],
      typicalMood: ["more motivated, social, and optimistic for many people"],
      nutritionFocus: [
        "B-vitamin-rich foods (whole grains, eggs, nuts, seeds) — energy metabolism is picking up",
        "Protein and cruciferous vegetables (broccoli, cauliflower) to support estrogen metabolism",
        "This is generally a good-tolerance phase for carbohydrates given rising insulin sensitivity",
      ],
      movement: ["Good window for higher-intensity training, trying something new, or ramping up workload"],
      selfCare: ["Good phase to schedule things that need focus, socializing, or decision-making"],
      supplements: [
        {
          name: "B-complex",
          rationale: "Commonly suggested to support energy metabolism during this build-up phase.",
          caution: "Generally well tolerated; check any interactions with existing medication.",
        },
        {
          name: "Vitamin D (if levels are low / low sun exposure)",
          rationale: "Linked to general hormonal and mood support.",
          caution: "Best guided by an actual blood test rather than blind supplementing.",
        },
      ],
      prepForNext:
        "Energy and libido often peak heading into ovulation — a good time to front-load demanding tasks before the ovulatory/luteal shift.",
    },
    {
      id: "ovulatory",
      name: "Ovulatory",
      dayRange: "~3-day window around predicted ovulation (~day 13–15 in a 28-day cycle)",
      hormoneSummary: "Estrogen peaks and triggers an LH surge; the egg is released. Shortest phase of the cycle.",
      typicalPhysical: [
        "mild one-sided pelvic twinge for some (mittelschmerz)",
        "clear/stretchy discharge",
        "possible mild bloating",
      ],
      typicalMood: ["confidence and sociability often peak here for many people"],
      nutritionFocus: [
        "Antioxidant-rich foods (berries, colorful vegetables) — this phase involves more oxidative stress from ovulation itself",
        "Fibre and cruciferous vegetables to support estrogen clearance",
        "Zinc-containing foods (seeds, legumes, shellfish) around this window",
      ],
      movement: ["Often the highest-capacity window for strength/intensity work if that's already part of the routine"],
      selfCare: [
        "Good phase for anything that benefits from confidence or clear communication — hard conversations, presentations, etc.",
      ],
      supplements: [
        {
          name: "Zinc",
          rationale: "Commonly associated with supporting healthy ovulation.",
          caution: "Avoid combining high-dose zinc with copper deficiency risk over long-term use; check labeling.",
        },
        {
          name: "Vitamin E",
          rationale: "Antioxidant support suggested around ovulation.",
          caution: "Standard multivitamin doses are fine; avoid megadosing.",
        },
      ],
      prepForNext:
        "Progesterone starts rising right after this — it's worth easing intensity slightly and starting to batch-prep meals or tasks before the luteal dip.",
    },
    {
      id: "luteal",
      name: "Luteal",
      dayRange: "After ovulation to the day before the next period (~14 days, relatively fixed)",
      hormoneSummary:
        "Progesterone rises (with some estrogen) after ovulation, then both drop sharply in the last few days if pregnancy hasn't occurred — this late drop drives most PMS symptoms.",
      typicalPhysical: [
        "bloating",
        "breast tenderness",
        "headaches",
        "increased appetite",
        "fatigue increasing toward the end of the phase",
      ],
      typicalMood: [
        "irritability, lower mood, or anxiety are common in the final days (late luteal / PMS window)",
        "reduced social bandwidth is common and expected, not a character flaw",
      ],
      nutritionFocus: [
        "Complex carbs, protein, and healthy fats at regular intervals — resting metabolic rate and appetite genuinely increase in this phase",
        "Vitamin-B6-rich foods (bananas, chickpeas, poultry) alongside magnesium for mood and bloating support",
        "Limiting caffeine/alcohol/high sugar late in this phase can reduce PMS intensity for some people, if noticed as a personal pattern",
      ],
      movement: [
        "Lower-intensity or strength-focused movement tends to feel better than high-intensity cardio in the last week of this phase; scale to actual energy, not a fixed plan",
      ],
      selfCare: [
        "This is the phase to protect rest and lower social/output expectations proactively, not just react once symptoms hit",
        "Good phase for planning and organizing rather than launching new things",
      ],
      supplements: [
        {
          name: "Magnesium + Vitamin B6",
          rationale: "The combination most commonly associated with PMS mood and cramp support.",
          caution: "Generally well tolerated; check interaction with any existing medication.",
        },
        {
          name: "Chasteberry / Vitex",
          rationale:
            "Traditionally used for PMS support, typically needs 2-3 cycles of consistent use to notice any effect.",
          caution:
            "Can interact with hormonal medication (including hormonal birth control) — this one specifically should be checked with a doctor before starting.",
        },
      ],
      prepForNext:
        "Symptoms should ease within a day or two of the next period starting. If low mood or physical symptoms are consistently severe enough to disrupt daily life, that's a signal to bring it to a doctor rather than just track it (possible PMDD) — the app's insight logic should flag this pattern, not just describe it.",
    },
  ],
  alignmentRules: {
    description:
      "Used to generate the 'is this normal for where you are in your cycle' insight when a mood/symptom entry is logged.",
    rules: [
      {
        tag: "low_energy",
        expectedPhases: ["menstrual", "luteal"],
        alignedNote: "Low energy is typical for this point in your cycle — a good week to lower the bar on output.",
        offNote:
          "Low energy is a bit less typical for this phase — worth noting if it continues, though it can just be a one-off (sleep, stress, etc.).",
      },
      {
        tag: "high_energy",
        expectedPhases: ["follicular", "ovulatory"],
        alignedNote: "Makes sense — energy tends to peak around here.",
        offNote: "Nice that energy is up, even though it's a bit earlier/later than typical for this phase.",
      },
      {
        tag: "irritability",
        expectedPhases: ["luteal"],
        alignedNote: "Common in the days leading up to your period — hormonally expected, not a mood failure.",
        offNote:
          "Irritability outside the usual late-luteal window is worth a note — could be unrelated to the cycle, or worth tracking if it recurs.",
      },
      {
        tag: "cramps",
        expectedPhases: ["menstrual"],
        alignedNote: "Expected during bleeding — heat and magnesium (see phase tips) tend to help.",
        offNote: "Cramping outside your period window is worth mentioning to a doctor if it recurs, particularly mid-cycle pain.",
      },
      {
        tag: "bloating",
        expectedPhases: ["ovulatory", "luteal"],
        alignedNote: "Common around ovulation and in the run-up to your period.",
        offNote: "Bloating outside these windows is usually food/digestion related rather than cyclical.",
      },
      {
        tag: "libido_up",
        expectedPhases: ["follicular", "ovulatory"],
        alignedNote: "Tracks with the estrogen peak around this point in the cycle.",
        offNote: "No issue at all — desire doesn't have to follow the 'typical' curve.",
      },
      {
        tag: "anxiety",
        expectedPhases: ["luteal"],
        alignedNote: "The progesterone/estrogen drop late in this phase is a known driver of anxiety for many people.",
        offNote:
          "Anxiety outside the late-luteal window is less likely to be cycle-driven — worth noting the context (sleep, workload, etc.) separately.",
      },
      {
        tag: "headache",
        expectedPhases: ["menstrual", "luteal"],
        alignedNote: "Hormone-drop headaches are common right before and during your period.",
        offNote: "Headache outside this window — track whether it recurs; if frequent, worth a doctor conversation.",
      },
    ],
    implementationNote:
      "Keep this list append-only and editable in the data layer (not hardcoded in components).",
  },
  severityFlags: {
    description:
      "Simple keyword/severity thresholds the app should use to nudge toward professional care rather than just logging silently. Rule-based, not diagnostic.",
    flags: [
      {
        trigger: "pain rated 8+/10 logged on 2+ cycles in a row",
        message: "Recurring severe pain isn't something to just track — worth bringing to a doctor.",
      },
      {
        trigger: "mood entries flagged 'severe' in the luteal phase for 2+ consecutive cycles",
        message:
          "Consistently severe mood symptoms before your period, cycle after cycle, can be a sign of PMDD — a doctor can help distinguish this from typical PMS.",
      },
      {
        trigger: "cycle length outside 21-35 days, or period length outside 2-7 days, for 2+ cycles",
        message: "This falls outside typical ranges — worth mentioning at a checkup, not urgent on its own.",
      },
    ],
  },
};
