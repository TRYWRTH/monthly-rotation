import { differenceInCalendarDays, parseISO } from "date-fns";
import { getPhaseForDay } from "./cycle";
import type { CycleKnowledge } from "./knowledge";
import type { DailyLog } from "./supabase/types";

const SEVERE_MOODS = ["sad", "anxious", "irritable"];

/**
 * Best-effort implementation of the knowledge base's severityFlags. These
 * are simple pattern triggers meant to nudge toward "worth mentioning to a
 * doctor" — not a diagnosis. The app doesn't collect a numeric pain scale,
 * so "severe pain" is approximated as cramps logged alongside very low
 * energy (<=2) during the period, recurring across the last two full
 * cycles; "severe mood" is approximated the same way in the luteal phase.
 */
export function computeSeverityFlags(
  knowledge: CycleKnowledge,
  cycleStarts: string[],
  periodLength: number,
  logs: DailyLog[]
): string[] {
  const flags = knowledge.severityFlags.flags;
  const messages: string[] = [];
  const sorted = [...cycleStarts].sort();

  // Irregularity: last two cycle-length gaps outside 21–35 days, or the
  // configured average period length outside 2–7 days.
  if (sorted.length >= 3) {
    const gaps: number[] = [];
    for (let i = sorted.length - 1; i > 0 && gaps.length < 2; i--) {
      gaps.push(differenceInCalendarDays(parseISO(sorted[i]), parseISO(sorted[i - 1])));
    }
    const irregularGaps = gaps.filter((g) => g < 21 || g > 35).length;
    const irregularPeriod = periodLength < 2 || periodLength > 7;
    if (irregularGaps >= 2 || irregularPeriod) {
      const msg = flags.find((f) => f.trigger.includes("cycle length outside"))?.message;
      if (msg) messages.push(msg);
    }
  }

  // Build the last two complete cycles (bounded by a known next start).
  const logsByDate = new Map(logs.map((l) => [l.log_date, l]));
  const completeCycles: { start: string; length: number }[] = [];
  for (let i = sorted.length - 2; i >= 0 && completeCycles.length < 2; i--) {
    completeCycles.push({
      start: sorted[i],
      length: differenceInCalendarDays(parseISO(sorted[i + 1]), parseISO(sorted[i])),
    });
  }

  if (completeCycles.length === 2) {
    const painHits = completeCycles.map((cycle) =>
      hasPatternInPhase(cycle, "menstrual", periodLength, logsByDate, (log) => {
        const cramping = log.symptoms.includes("cramps");
        return cramping && typeof log.energy === "number" && log.energy <= 2;
      })
    );
    if (painHits.every(Boolean)) {
      const msg = flags.find((f) => f.trigger.includes("pain rated"))?.message;
      if (msg) messages.push(msg);
    }

    const moodHits = completeCycles.map((cycle) =>
      countInPhase(cycle, "luteal", periodLength, logsByDate, (log) => {
        return (
          !!log.mood &&
          SEVERE_MOODS.includes(log.mood) &&
          typeof log.energy === "number" &&
          log.energy <= 2
        );
      }) >= 3
    );
    if (moodHits.every(Boolean)) {
      const msg = flags.find((f) => f.trigger.includes("severe"))?.message;
      if (msg) messages.push(msg);
    }
  }

  return messages;
}

function hasPatternInPhase(
  cycle: { start: string; length: number },
  phase: "menstrual" | "luteal",
  periodLength: number,
  logsByDate: Map<string, DailyLog>,
  predicate: (log: DailyLog) => boolean
): boolean {
  return countInPhase(cycle, phase, periodLength, logsByDate, predicate) > 0;
}

function countInPhase(
  cycle: { start: string; length: number },
  phase: "menstrual" | "luteal",
  periodLength: number,
  logsByDate: Map<string, DailyLog>,
  predicate: (log: DailyLog) => boolean
): number {
  let count = 0;
  for (let day = 1; day <= cycle.length; day++) {
    const date = new Date(parseISO(cycle.start));
    date.setDate(date.getDate() + (day - 1));
    const iso = date.toISOString().slice(0, 10);
    const log = logsByDate.get(iso);
    if (!log) continue;
    const { phase: dayPhase } = getPhaseForDay(day, cycle.length, periodLength);
    if (dayPhase === phase && predicate(log)) count++;
  }
  return count;
}
