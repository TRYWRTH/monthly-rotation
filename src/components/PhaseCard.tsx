import { PHASE_COLORS, PHASE_LABELS, type CycleInfo } from "@/lib/cycle";

export default function PhaseCard({
  name,
  info,
  isSelf,
}: {
  name: string;
  info: CycleInfo | null;
  isSelf: boolean;
}) {
  if (!info) {
    return (
      <div className="card">
        <p className="text-sm text-[var(--muted)]">
          {isSelf ? "Add your last period start date in Settings to see your phase." : `${name} hasn't set up their cycle yet.`}
        </p>
      </div>
    );
  }

  const color = PHASE_COLORS[info.phase];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-[var(--muted)]">{isSelf ? "You" : name}</p>
        <span className="chip" style={{ borderColor: color, color }}>
          {PHASE_LABELS[info.phase]}
        </span>
      </div>
      <p className="text-3xl font-semibold mb-1">
        Day {info.cycleDay}
        <span className="text-base font-normal text-[var(--muted)]"> / {info.cycleLength}</span>
      </p>
      <p className="text-sm text-[var(--muted)]">
        {info.isLate
          ? "Period may be running late"
          : info.daysUntilNextPeriod <= 0
          ? "Period expected any day now"
          : `Next period in ~${info.daysUntilNextPeriod} day${info.daysUntilNextPeriod === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
