import { addDays, differenceInCalendarDays, parseISO } from "date-fns";

export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export const CYCLE_DEFAULTS = {
  cycleLengthDays: 28,
  periodLengthDays: 5,
  lutealLengthDays: 14,
};

export const MIN_CYCLES_FOR_PERSONAL_AVERAGE = 3;

export type PhaseForDay = { phase: Phase; lowConfidence: boolean };

/**
 * Mirrors cycleModel.calculation from the cycle knowledge base: phases are
 * computed backward from ovulation (cycleLength - lutealLength), not as
 * even fractions of cycle length, since the luteal phase is comparatively
 * fixed while the follicular phase is what actually varies.
 */
export function getPhaseForDay(
  cycleDay: number,
  cycleLength: number,
  periodLength: number,
  lutealLength: number = CYCLE_DEFAULTS.lutealLengthDays
): PhaseForDay {
  const day = ((cycleDay - 1) % cycleLength) + 1;

  const minBound = periodLength + 1;
  const clamp = (n: number) => Math.min(Math.max(n, minBound), cycleLength);

  const ovulationDay = cycleLength - lutealLength;
  const follicularEnd = clamp(ovulationDay - 2);
  const ovulatoryStart = clamp(ovulationDay - 1);
  const ovulatoryEnd = clamp(ovulationDay + 1);

  let lowConfidence = false;
  if (follicularEnd < minBound || ovulatoryStart > ovulatoryEnd) {
    lowConfidence = true;
  }

  if (day <= periodLength) return { phase: "menstrual", lowConfidence };
  if (day <= follicularEnd) return { phase: "follicular", lowConfidence };
  if (day <= ovulatoryEnd) return { phase: "ovulatory", lowConfidence };
  return { phase: "luteal", lowConfidence };
}

export type CycleInfo = {
  cycleDay: number;
  phase: Phase;
  lowConfidence: boolean;
  cycleLength: number;
  periodLength: number;
  lastStart: string;
  predictedNextStart: string;
  daysUntilNextPeriod: number;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  isLate: boolean;
  usingPersonalAverage: boolean;
};

/**
 * Rolling average cycle length from the gaps between the most recent
 * period start dates (up to the last 6 gaps / 7 starts). Needs at least
 * minCyclesForPersonalAverage (3) full cycles — i.e. 4 start dates — to
 * kick in; falls back to the passed-in default before that.
 */
export function getRollingCycleLength(
  cycleStarts: string[],
  fallback: number,
  minCycles: number = MIN_CYCLES_FOR_PERSONAL_AVERAGE
): { cycleLength: number; usingPersonalAverage: boolean } {
  const sorted = [...cycleStarts].sort();
  if (sorted.length < minCycles + 1) {
    return { cycleLength: fallback, usingPersonalAverage: false };
  }

  const recent = sorted.slice(-7);
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    gaps.push(differenceInCalendarDays(parseISO(recent[i]), parseISO(recent[i - 1])));
  }

  const plausible = gaps.filter((g) => g >= 15 && g <= 60);
  if (plausible.length < minCycles) {
    return { cycleLength: fallback, usingPersonalAverage: false };
  }

  const avg = Math.round(plausible.reduce((a, b) => a + b, 0) / plausible.length);
  return { cycleLength: avg, usingPersonalAverage: true };
}

/**
 * cycleStarts: ISO date strings ("yyyy-MM-dd") of known period start days.
 * cycleLength/periodLength are the user's manually-set averages, used as
 * fallback until enough real cycles have been logged.
 */
export function getCurrentCycleInfo(
  cycleStarts: string[],
  cycleLength: number,
  periodLength: number,
  today: Date = new Date()
): CycleInfo | null {
  if (cycleStarts.length === 0) return null;

  const { cycleLength: effectiveCycleLength, usingPersonalAverage } = getRollingCycleLength(
    cycleStarts,
    cycleLength
  );

  const sorted = [...cycleStarts].sort((a, b) => (a < b ? 1 : -1));
  const mostRecent = sorted.find((d) => parseISO(d) <= today) ?? sorted[sorted.length - 1];

  const cycleDay = differenceInCalendarDays(today, parseISO(mostRecent)) + 1;
  const { phase, lowConfidence } = getPhaseForDay(cycleDay, effectiveCycleLength, periodLength);
  const predictedNextStart = addDays(parseISO(mostRecent), effectiveCycleLength);
  const daysUntilNextPeriod = differenceInCalendarDays(predictedNextStart, today);
  const ovulationDay = effectiveCycleLength - CYCLE_DEFAULTS.lutealLengthDays;

  return {
    cycleDay,
    phase,
    lowConfidence,
    cycleLength: effectiveCycleLength,
    periodLength,
    lastStart: mostRecent,
    predictedNextStart: predictedNextStart.toISOString().slice(0, 10),
    daysUntilNextPeriod,
    fertileWindowStart: addDays(parseISO(mostRecent), Math.max(ovulationDay - 3, periodLength + 1))
      .toISOString()
      .slice(0, 10),
    fertileWindowEnd: addDays(parseISO(mostRecent), Math.min(ovulationDay + 1, effectiveCycleLength))
      .toISOString()
      .slice(0, 10),
    isLate: cycleDay > effectiveCycleLength,
    usingPersonalAverage,
  };
}

export function getPhaseForDate(
  date: Date,
  cycleStarts: string[],
  cycleLength: number,
  periodLength: number
): Phase | null {
  if (cycleStarts.length === 0) return null;
  const { cycleLength: effectiveCycleLength } = getRollingCycleLength(cycleStarts, cycleLength);

  const candidates = cycleStarts.filter((d) => parseISO(d) <= date);
  if (candidates.length === 0) return null;
  const mostRecent = candidates.sort((a, b) => (a < b ? 1 : -1))[0];
  const cycleDay = differenceInCalendarDays(date, parseISO(mostRecent)) + 1;
  return getPhaseForDay(cycleDay, effectiveCycleLength, periodLength).phase;
}

export const PHASE_LABELS: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

export const PHASE_COLORS: Record<Phase, string> = {
  menstrual: "#c9184a",
  follicular: "#ff9770",
  ovulatory: "#ffd166",
  luteal: "#7b6cf6",
};
