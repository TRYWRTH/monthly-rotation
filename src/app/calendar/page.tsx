"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { getPhaseForDate, PHASE_COLORS, PHASE_LABELS, type Phase } from "@/lib/cycle";
import type { DailyLog, PartnerLogSummary, Profile } from "@/lib/supabase/types";

type LogLike = Pick<DailyLog, "log_date" | "mood" | "energy" | "flow"> & {
  symptoms?: string[];
  notes?: string | null;
};

type Person = {
  id: string;
  name: string;
  cycleLength: number;
  periodLength: number;
  starts: string[];
  logsByDate: Record<string, LogLike>;
};

export default function CalendarPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Person | null>(null);
  const [partner, setPartner] = useState<Person | null>(null);
  const [viewing, setViewing] = useState<"me" | "partner">("me");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      const { data: myStarts } = await supabase
        .from("cycle_starts")
        .select("start_date")
        .eq("user_id", user.id);

      const { data: myLogs } = await supabase.from("daily_logs").select("*").eq("user_id", user.id);

      const myLogMap: Record<string, LogLike> = {};
      (myLogs ?? []).forEach((l) => (myLogMap[l.log_date] = l as DailyLog));

      setMe({
        id: user.id,
        name: profile?.display_name ?? "You",
        cycleLength: profile?.avg_cycle_length ?? 28,
        periodLength: profile?.avg_period_length ?? 5,
        starts: (myStarts ?? []).map((s) => s.start_date),
        logsByDate: myLogMap,
      });

      if (profile?.pair_id) {
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("pair_id", profile.pair_id)
          .neq("id", user.id)
          .maybeSingle<Profile>();

        if (partnerProfile) {
          const { data: partnerStarts } = await supabase
            .from("cycle_starts")
            .select("start_date")
            .eq("user_id", partnerProfile.id);

          // Partner check-ins come through a summary view (mood/energy/flow
          // only) rather than the daily_logs table — symptoms and free-text
          // notes stay private to each person by design.
          const { data: partnerLogs } = await supabase
            .from("partner_log_summary")
            .select("*")
            .eq("user_id", partnerProfile.id);

          const partnerLogMap: Record<string, LogLike> = {};
          (partnerLogs ?? []).forEach((l) => (partnerLogMap[l.log_date] = l as PartnerLogSummary));

          setPartner({
            id: partnerProfile.id,
            name: partnerProfile.display_name,
            cycleLength: partnerProfile.avg_cycle_length,
            periodLength: partnerProfile.avg_period_length,
            starts: (partnerStarts ?? []).map((s) => s.start_date),
            logsByDate: partnerLogMap,
          });
        }
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const person = viewing === "me" ? me : partner;

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const leadingBlanks = getDay(startOfMonth(month));

  if (loading) {
    return <div className="flex flex-1 items-center justify-center">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        {partner && (
          <div className="flex gap-1 chip !p-1">
            <button
              className="px-2 py-1 rounded-full text-sm"
              style={viewing === "me" ? { background: "var(--primary)", color: "#fff" } : undefined}
              onClick={() => setViewing("me")}
            >
              You
            </button>
            <button
              className="px-2 py-1 rounded-full text-sm"
              style={viewing === "partner" ? { background: "var(--primary)", color: "#fff" } : undefined}
              onClick={() => setViewing("partner")}
            >
              {partner.name}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-secondary px-3" onClick={() => setMonth((m) => subMonths(m, 1))}>
          ←
        </button>
        <p className="font-semibold">{format(month, "MMMM yyyy")}</p>
        <button className="btn-secondary px-3" onClick={() => setMonth((m) => addMonths(m, 1))}>
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted)]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((day) => {
          const phase = person
            ? getPhaseForDate(day, person.starts, person.cycleLength, person.periodLength)
            : null;
          const iso = format(day, "yyyy-MM-dd");
          const hasLog = !!person?.logsByDate[iso];
          const isStart = person?.starts.includes(iso);

          return (
            <button
              key={iso}
              onClick={() => setSelected(day)}
              className="aspect-square rounded-full flex items-center justify-center text-sm relative"
              style={{
                background: phase ? PHASE_COLORS[phase] + "33" : "transparent",
                border: isToday(day) ? "2px solid var(--foreground)" : isStart ? "2px solid " + (phase ? PHASE_COLORS[phase] : "var(--border)") : "1px solid transparent",
                outline: selected && isSameDay(selected, day) ? "2px solid var(--accent)" : undefined,
                color: "var(--foreground)",
              }}
            >
              {format(day, "d")}
              {hasLog && (
                <span
                  className="absolute bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(PHASE_LABELS) as Phase[]).map((p) => (
          <span key={p} className="chip">
            <span
              className="inline-block h-2 w-2 rounded-full mr-1"
              style={{ background: PHASE_COLORS[p] }}
            />
            {PHASE_LABELS[p]}
          </span>
        ))}
      </div>

      {selected && person && (
        <DaySummary
          date={selected}
          person={person}
          log={person.logsByDate[format(selected, "yyyy-MM-dd")]}
          editable={viewing === "me"}
        />
      )}
    </div>
  );
}

function DaySummary({
  date,
  person,
  log,
  editable,
}: {
  date: Date;
  person: Person;
  log?: LogLike;
  editable: boolean;
}) {
  const phase = getPhaseForDate(date, person.starts, person.cycleLength, person.periodLength);
  const iso = format(date, "yyyy-MM-dd");

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">{format(date, "EEEE, MMM d")}</p>
        {phase && (
          <span className="chip" style={{ borderColor: PHASE_COLORS[phase], color: PHASE_COLORS[phase] }}>
            {PHASE_LABELS[phase]}
          </span>
        )}
      </div>
      {log ? (
        <div className="flex flex-wrap gap-2">
          {log.mood && <span className="chip">{log.mood}</span>}
          {log.flow && log.flow !== "none" && <span className="chip">flow: {log.flow}</span>}
          {log.symptoms?.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No check-in logged.</p>
      )}
      {editable && (
        <Link href={`/log?date=${iso}`} className="text-sm underline text-[var(--muted)] mt-3 inline-block">
          {log ? "Edit check-in" : "Add check-in"}
        </Link>
      )}
    </div>
  );
}
