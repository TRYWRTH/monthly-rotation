import type { SupabaseClient } from "@supabase/supabase-js";
import type { Phase } from "./cycle";
import type { Database } from "./supabase/types";
import { DEFAULT_CYCLE_KNOWLEDGE } from "./cycleKnowledgeDefault";

// ---------------------------------------------------------------------------
// Chip vocab shown in the check-in form. Independent of the fetched content
// below — these are just UI labels, not medical claims.
// ---------------------------------------------------------------------------

export const MOODS = [
  "great",
  "good",
  "okay",
  "low",
  "irritable",
  "anxious",
  "sad",
  "energetic",
  "calm",
] as const;

export const SYMPTOMS = [
  "cramps",
  "bloating",
  "headache",
  "fatigue",
  "breast tenderness",
  "acne",
  "food cravings",
  "mood swings",
  "back pain",
  "nausea",
  "insomnia",
  "brain fog",
  "joint pain",
  "increased libido",
  "decreased libido",
  "spotting",
] as const;

// ---------------------------------------------------------------------------
// Cycle knowledge base content shape (matches supabase/seed_cycle_knowledge.sql)
// ---------------------------------------------------------------------------

export type SupplementEntry = { name: string; rationale: string; caution: string };

export type PhaseGuide = {
  id: Phase;
  name: string;
  dayRange: string;
  hormoneSummary: string;
  typicalPhysical: string[];
  typicalMood: string[];
  nutritionFocus: string[];
  movement: string[];
  selfCare: string[];
  supplements: SupplementEntry[];
  prepForNext: string;
};

export type AlignmentRule = {
  tag: string;
  expectedPhases: Phase[];
  alignedNote: string;
  offNote: string;
};

export type SeverityFlagDef = { trigger: string; message: string };

export type CycleKnowledge = {
  $schema: string;
  disclaimer: string;
  cycleModel: {
    notes: string;
    defaults: { cycleLengthDays: number; periodLengthDays: number; lutealLengthDays: number };
    minCyclesForPersonalAverage: number;
  };
  phases: PhaseGuide[];
  alignmentRules: { description: string; rules: AlignmentRule[]; implementationNote: string };
  severityFlags: { description: string; flags: SeverityFlagDef[] };
};

export function getPhaseGuide(knowledge: CycleKnowledge, phase: Phase): PhaseGuide | undefined {
  return knowledge.phases.find((p) => p.id === phase);
}

/**
 * Loads the cycle_knowledge content row from Supabase (seeded via
 * supabase/seed_cycle_knowledge.sql, editable there without a redeploy).
 * Falls back to the bundled copy if the table isn't seeded yet or the
 * fetch fails, so the app still works either way.
 */
export async function getCycleKnowledge(
  supabase: SupabaseClient<Database>
): Promise<CycleKnowledge> {
  const { data } = await supabase.from("cycle_knowledge").select("content").eq("id", "v1").maybeSingle();
  if (data?.content) return data.content as CycleKnowledge;
  return DEFAULT_CYCLE_KNOWLEDGE;
}

// ---------------------------------------------------------------------------
// Alignment: turn a check-in into tags, then compare against alignmentRules.
// ---------------------------------------------------------------------------

export type CheckInInput = {
  mood?: string | null;
  energy?: number | null;
  symptoms?: string[];
};

const SYMPTOM_TAGS: Record<string, string> = {
  cramps: "cramps",
  bloating: "bloating",
  headache: "headache",
  "increased libido": "libido_up",
};

const MOOD_TAGS: Record<string, string> = {
  irritable: "irritability",
  anxious: "anxiety",
};

/**
 * Derives alignmentRules tags from a check-in. `sharedOnly` restricts to
 * tags derivable from mood + energy alone (never symptoms or notes) — used
 * for the partner-visible summary, matching the "summary only" privacy
 * choice: partners see phase + mood/energy alignment, not the raw
 * symptom list.
 */
export function deriveTags(log: CheckInInput, options: { sharedOnly?: boolean } = {}): string[] {
  const tags: string[] = [];

  if (typeof log.energy === "number") {
    if (log.energy <= 2) tags.push("low_energy");
    if (log.energy >= 4) tags.push("high_energy");
  }
  if (log.mood && MOOD_TAGS[log.mood]) tags.push(MOOD_TAGS[log.mood]);

  if (!options.sharedOnly) {
    for (const s of log.symptoms ?? []) {
      if (SYMPTOM_TAGS[s]) tags.push(SYMPTOM_TAGS[s]);
    }
  }

  return tags;
}

export type Alignment = { status: "in-sync" | "notable"; message: string };

export function checkAlignment(
  knowledge: CycleKnowledge,
  tags: string[],
  phase: Phase
): Alignment[] {
  const results: Alignment[] = [];
  for (const tag of tags) {
    const rule = knowledge.alignmentRules.rules.find((r) => r.tag === tag);
    if (!rule) continue;
    if (rule.expectedPhases.includes(phase)) {
      results.push({ status: "in-sync", message: rule.alignedNote });
    } else {
      results.push({ status: "notable", message: rule.offNote });
    }
  }
  return results;
}
