"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MOODS, SYMPTOMS } from "@/lib/knowledge";
import type { Flow } from "@/lib/supabase/types";

const FLOWS: { value: Flow; label: string }[] = [
  { value: "none", label: "None" },
  { value: "spotting", label: "Spotting" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center">Loading…</div>}>
      <LogForm />
    </Suspense>
  );
}

function LogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [date, setDate] = useState(searchParams.get("date") ?? todayISO());
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodMsg, setPeriodMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", date)
        .maybeSingle();

      if (data) {
        setMood(data.mood);
        setEnergy(data.energy);
        setSymptoms(data.symptoms ?? []);
        setFlow(data.flow);
        setNotes(data.notes ?? "");
      } else {
        setMood(null);
        setEnergy(null);
        setSymptoms([]);
        setFlow(null);
        setNotes("");
      }
      setSaved(false);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function toggleSymptom(s: string) {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        log_date: date,
        mood,
        energy,
        symptoms,
        flow,
        notes: notes || null,
      },
      { onConflict: "user_id,log_date" }
    );

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function logPeriodStart() {
    setPeriodMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("cycle_starts")
      .upsert({ user_id: user.id, start_date: date }, { onConflict: "user_id,start_date" });
    if (error) {
      setPeriodMsg(error.message);
      return;
    }
    setFlow((prev) => prev ?? "medium");
    setPeriodMsg(`Logged ${date} as a period start.`);
    router.refresh();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">How are you feeling?</h1>
        <input
          type="date"
          className="input"
          max={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <button type="button" onClick={logPeriodStart} className="btn-secondary">
        🩸 Mark this as a period start day
      </button>
      {periodMsg && <p className="text-sm text-[var(--muted)] -mt-3">{periodMsg}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section>
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Mood</h2>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? null : m)}
                className="chip"
                style={
                  mood === m
                    ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" }
                    : undefined
                }
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Energy</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergy(energy === n ? null : n)}
                className="flex-1 rounded-xl border py-2 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: energy === n ? "var(--primary)" : "var(--card)",
                  color: energy === n ? "var(--primary-foreground)" : "var(--foreground)",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Flow</h2>
          <div className="flex flex-wrap gap-2">
            {FLOWS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFlow(flow === f.value ? null : f.value)}
                className="chip"
                style={
                  flow === f.value
                    ? { background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" }
                    : undefined
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Symptoms</h2>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className="chip"
                style={
                  symptoms.includes(s)
                    ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                    : undefined
                }
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Notes</h2>
          <textarea
            className="input min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth remembering about today…"
          />
        </section>

        {error && <p className="text-sm text-[var(--rose)]">{error}</p>}
        {saved && <p className="text-sm text-[var(--muted)]">Saved ✓</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save check-in"}
        </button>
      </form>
    </div>
  );
}
