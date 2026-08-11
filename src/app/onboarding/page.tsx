"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/inviteCode";
import type { Profile } from "@/lib/supabase/types";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lastStart, setLastStart] = useState("");

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [pairMessage, setPairMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (p) {
        setProfile(p);
        setDisplayName(p.display_name ?? "");
        setCycleLength(p.avg_cycle_length ?? 28);
        setPeriodLength(p.avg_period_length ?? 5);
        if (p.pair_id) {
          const { data: pair } = await supabase
            .from("pairs")
            .select("invite_code")
            .eq("id", p.pair_id)
            .maybeSingle();
          if (pair) setInviteCode(pair.invite_code);
        }
      }

      const { data: lastCycle } = await supabase
        .from("cycle_starts")
        .select("start_date")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastCycle) setLastStart(lastCycle.start_date);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPair() {
    setPairMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateInviteCode();
    const { data: pair, error: pairError } = await supabase
      .from("pairs")
      .insert({ invite_code: code })
      .select()
      .single();

    if (pairError || !pair) {
      setPairMessage(pairError?.message ?? "Could not create invite code.");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ pair_id: pair.id })
      .eq("id", user.id);

    if (profileError) {
      setPairMessage(profileError.message);
      return;
    }

    setInviteCode(pair.invite_code);
    setPairMessage("Invite code created — share it with your partner.");
  }

  async function joinPair() {
    setPairMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    const { data: pair, error: pairError } = await supabase
      .from("pairs")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();

    if (pairError || !pair) {
      setPairMessage("No pair found with that code — double-check it.");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ pair_id: pair.id })
      .eq("id", user.id);

    if (profileError) {
      setPairMessage(profileError.message);
      return;
    }

    setInviteCode(pair.invite_code);
    setPairMessage("You're linked up!");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || "You",
        avg_cycle_length: cycleLength,
        avg_period_length: periodLength,
      })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    if (lastStart) {
      const { error: cycleError } = await supabase
        .from("cycle_starts")
        .upsert({ user_id: user.id, start_date: lastStart }, { onConflict: "user_id,start_date" });
      if (cycleError) {
        setError(cycleError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center">Loading…</div>;
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-1">
          {profile?.pair_id ? "Update your details" : "Let's set things up"}
        </h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Cycle averages are just a starting point — the app refines them as you log.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1 text-sm">
            Your name
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Avg. cycle length (days)
              <input
                type="number"
                min={15}
                max={60}
                className="input"
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Avg. period length (days)
              <input
                type="number"
                min={1}
                max={14}
                className="input"
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Last period start date
            <input
              type="date"
              className="input"
              value={lastStart}
              onChange={(e) => setLastStart(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-[var(--rose)]">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save and continue"}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-[var(--border)]">
          <h2 className="font-semibold mb-2">Link with your partner</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            One of you creates an invite code, the other enters it. You&apos;ll then see each
            other&apos;s cycle phase and check-ins.
          </p>

          {inviteCode ? (
            <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 text-center">
              <p className="text-sm text-[var(--muted)] mb-1">You&apos;re linked. Invite code:</p>
              <p className="text-2xl font-mono tracking-widest">{inviteCode}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button type="button" onClick={createPair} className="btn-secondary">
                Create invite code
              </button>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Enter partner's code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <button type="button" onClick={joinPair} className="btn-secondary">
                  Join
                </button>
              </div>
            </div>
          )}
          {pairMessage && <p className="text-sm mt-3 text-[var(--muted)]">{pairMessage}</p>}
        </div>
      </div>
    </div>
  );
}
