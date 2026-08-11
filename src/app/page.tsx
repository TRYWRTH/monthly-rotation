import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCycleInfo } from "@/lib/cycle";
import { getCycleKnowledge, getPhaseGuide, deriveTags, checkAlignment } from "@/lib/knowledge";
import PhaseCard from "@/components/PhaseCard";
import type { DailyLog } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: myStarts } = await supabase
    .from("cycle_starts")
    .select("start_date")
    .eq("user_id", user.id);

  if (!myStarts || myStarts.length === 0) {
    redirect("/onboarding");
  }

  const myInfo = getCurrentCycleInfo(
    myStarts.map((s) => s.start_date),
    profile?.avg_cycle_length ?? 28,
    profile?.avg_period_length ?? 5
  );

  let partnerName = "Your partner";
  let partnerInfo = null;
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
        partnerInfo = getCurrentCycleInfo(
          partnerStarts.map((s) => s.start_date),
          partnerProfile.avg_cycle_length,
          partnerProfile.avg_period_length
        );
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLog } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today)
    .maybeSingle<DailyLog>();

  const knowledge = await getCycleKnowledge(supabase);
  const guide = myInfo ? getPhaseGuide(knowledge, myInfo.phase) : null;
  const alignment =
    todayLog && myInfo ? checkAlignment(knowledge, deriveTags(todayLog), myInfo.phase) : null;

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 flex flex-col gap-5">
      <div>
        <p className="text-sm text-[var(--muted)]">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold">Hi {profile?.display_name ?? "there"}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhaseCard name={profile?.display_name ?? "You"} info={myInfo} isSelf />
        {profile?.pair_id ? (
          <PhaseCard name={partnerName} info={partnerInfo} isSelf={false} />
        ) : (
          <div className="card flex items-center justify-center text-center">
            <p className="text-sm text-[var(--muted)]">
              <Link href="/settings" className="underline">
                Link your partner
              </Link>{" "}
              to see their cycle too.
            </p>
          </div>
        )}
      </div>

      {guide && (
        <div className="card">
          <h2 className="font-semibold mb-1">{guide.name} phase</h2>
          <p className="text-sm text-[var(--muted)]">{guide.hormoneSummary}</p>
        </div>
      )}

      {!todayLog ? (
        <Link href="/log" className="btn-primary text-center">
          Log how you feel today
        </Link>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Today&apos;s check-in</h2>
            <Link href="/log" className="text-sm underline text-[var(--muted)]">
              Edit
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {todayLog.mood && <span className="chip">{todayLog.mood}</span>}
            {todayLog.symptoms.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
          {alignment && alignment.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {alignment.map((a, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span>{a.status === "in-sync" ? "✅" : "💡"}</span>
                  <span className="text-[var(--muted)]">{a.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">Keep logging to build the pattern.</p>
          )}
        </div>
      )}

      <Link href="/insights" className="btn-secondary text-center">
        See phase tips &amp; suggestions
      </Link>
    </div>
  );
}
