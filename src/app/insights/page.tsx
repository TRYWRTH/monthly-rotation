import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCycleInfo, PHASE_COLORS, PHASE_LABELS, type Phase } from "@/lib/cycle";
import { getCycleKnowledge, getPhaseGuide, deriveTags, checkAlignment } from "@/lib/knowledge";
import { computeSeverityFlags } from "@/lib/severity";
import type { DailyLog } from "@/lib/supabase/types";

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: myStarts } = await supabase.from("cycle_starts").select("start_date").eq("user_id", user.id);

  if (!myStarts || myStarts.length === 0) redirect("/onboarding");

  const knowledge = await getCycleKnowledge(supabase);

  const startDates = myStarts.map((s) => s.start_date);
  const periodLength = profile?.avg_period_length ?? 5;
  const myInfo = getCurrentCycleInfo(startDates, profile?.avg_cycle_length ?? 28, periodLength);
  const guide = myInfo ? getPhaseGuide(knowledge, myInfo.phase) : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const { data: recentLogs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("log_date", sevenDaysAgo.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  const recentAlignment =
    myInfo && recentLogs
      ? (recentLogs as DailyLog[]).map((log) => ({
          log,
          alignment: checkAlignment(knowledge, deriveTags(log), myInfo.phase),
        }))
      : [];

  const { data: allLogs } = await supabase.from("daily_logs").select("*").eq("user_id", user.id);
  const severityMessages = computeSeverityFlags(
    knowledge,
    startDates,
    periodLength,
    (allLogs ?? []) as DailyLog[]
  );

  let partnerName: string | null = null;
  let partnerPhase: Phase | null = null;
  let partnerPhaseLabel: string | null = null;
  let partnerColor: string | null = null;

  if (profile?.pair_id) {
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("pair_id", profile.pair_id)
      .neq("id", user.id)
      .maybeSingle();

    if (partnerProfile) {
      partnerName = partnerProfile.display_name;
      const { data: partnerStarts } = await supabase
        .from("cycle_starts")
        .select("start_date")
        .eq("user_id", partnerProfile.id);

      if (partnerStarts && partnerStarts.length > 0) {
        const partnerInfo = getCurrentCycleInfo(
          partnerStarts.map((s) => s.start_date),
          partnerProfile.avg_cycle_length,
          partnerProfile.avg_period_length
        );
        if (partnerInfo) {
          partnerPhase = partnerInfo.phase;
          partnerPhaseLabel = PHASE_LABELS[partnerInfo.phase];
          partnerColor = PHASE_COLORS[partnerInfo.phase];
        }
      }
    }
  }
  const partnerGuide = partnerPhase ? getPhaseGuide(knowledge, partnerPhase) : null;

  if (!myInfo || !guide) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-6">
        <p className="text-[var(--muted)]">
          Add your last period start date in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to see insights.
        </p>
      </div>
    );
  }

  const color = PHASE_COLORS[myInfo.phase];

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 flex flex-col gap-6">
      <div>
        <span className="chip" style={{ borderColor: color, color }}>
          {PHASE_LABELS[myInfo.phase]} · Day {myInfo.cycleDay}
        </span>
        <h1 className="text-2xl font-semibold mt-2">{guide.name} phase</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{guide.hormoneSummary}</p>
        {myInfo.lowConfidence && (
          <p className="text-xs text-[var(--muted)] mt-2">
            Your cycle/period lengths make the exact phase boundaries a rough estimate this cycle.
          </p>
        )}
      </div>

      {severityMessages.length > 0 && (
        <div className="card" style={{ borderColor: "var(--primary)" }}>
          <h2 className="font-semibold mb-2">Worth a mention at your next checkup</h2>
          <ul className="flex flex-col gap-2">
            {severityMessages.map((m, i) => (
              <li key={i} className="text-sm text-[var(--muted)]">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Supplements to consider">
        <ul className="flex flex-col gap-2">
          {guide.supplements.map((s) => (
            <li key={s.name} className="text-sm">
              <span className="font-medium">{s.name}</span>{" "}
              <span className="text-[var(--muted)]">— {s.rationale}</span>
              <div className="text-xs text-[var(--muted)] mt-0.5">{s.caution}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Food & nutrition">
        <BulletList items={guide.nutritionFocus} />
      </Section>

      <Section title="Movement">
        <BulletList items={guide.movement} />
      </Section>

      <Section title="Self-care">
        <BulletList items={guide.selfCare} />
      </Section>

      <Section title="Preparing for what's next">
        <p className="text-sm text-[var(--muted)]">{guide.prepForNext}</p>
      </Section>

      {partnerGuide && partnerName && (
        <Section title={`How to support ${partnerName}`}>
          <p className="text-sm mb-2">
            {partnerName} is currently in their{" "}
            <span style={{ color: partnerColor ?? undefined }} className="font-medium">
              {partnerPhaseLabel?.toLowerCase()}
            </span>{" "}
            phase.
          </p>
          <BulletList items={partnerGuide.typicalMood} />
        </Section>
      )}

      <Section title="How your last week lines up">
        {recentAlignment.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No check-ins yet this week —{" "}
            <Link href="/log" className="underline">
              log how you feel
            </Link>{" "}
            to start building the picture.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentAlignment.map(({ log, alignment }) => (
              <li key={log.log_date} className="text-sm">
                <p className="font-medium mb-1">
                  {new Date(log.log_date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {alignment.length === 0 ? (
                  <p className="text-[var(--muted)]">No notable pattern from today&apos;s log.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {alignment.map((a, i) => (
                      <li key={i} className="flex gap-2 text-[var(--muted)]">
                        <span>{a.status === "in-sync" ? "✅" : "💡"}</span>
                        <span>{a.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-[var(--muted)] px-1">{knowledge.disclaimer}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-[var(--muted)] flex gap-2">
          <span>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
