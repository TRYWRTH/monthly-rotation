"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/inviteCode";
import type { CycleStart, Profile } from "@/lib/supabase/types";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const [starts, setStarts] = useState<CycleStart[]>([]);
  const [newStart, setNewStart] = useState("");

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [pairMessage, setPairMessage] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (p) {
      setProfile(p);
      setDisplayName(p.display_name ?? "");
      setCycleLength(p.avg_cycle_length ?? 28);
      setPeriodLength(p.avg_period_length ?? 5);

      if (p.pair_id) {
        const { data: pair } = await supabase.from("pairs").select("invite_code").eq("id", p.pair_id).maybeSingle();
        if (pair) setInviteCode(pair.invite_code);

        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("pair_id", p.pair_id)
          .neq("id", user.id)
          .maybeSingle();
        setPartnerName(partnerProfile?.display_name ?? null);
      }
    }

    const { data: cycleStarts } = await supabase
      .from("cycle_starts")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });
    setStarts(cycleStarts ?? []);

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || "You", avg_cycle_length: cycleLength, avg_period_length: periodLength })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function addStart() {
    if (!newStart) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("cycle_starts").upsert({ user_id: user.id, start_date: newStart }, { onConflict: "user_id,start_date" });
    setNewStart("");
    loadAll();
    router.refresh();
  }

  async function removeStart(id: string) {
    await supabase.from("cycle_starts").delete().eq("id", id);
    loadAll();
    router.refresh();
  }

  async function createPair() {
    setPairMessage(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateInviteCode();
    const { data: pair, error: pairError } = await supabase.from("pairs").insert({ invite_code: code }).select().single();
    if (pairError || !pair) {
      setPairMessage(pairError?.message ?? "Could not create invite code.");
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({ pair_id: pair.id }).eq("id", user.id);
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

    const { data: pair, error: pairError } = await supabase.from("pairs").select("*").eq("invite_code", code).maybeSingle();
    if (pairError || !pair) {
      setPairMessage("No pair found with that code — double-check it.");
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({ pair_id: pair.id }).eq("id", user.id);
    if (profileError) {
      setPairMessage(profileError.message);
      return;
    }
    setInviteCode(pair.invite_code);
    loadAll();
    router.refresh();
    setPairMessage("You're linked up!");
  }

  async function unlinkPair() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ pair_id: null }).eq("id", user.id);
    setInviteCode(null);
    setPartnerName(null);
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-sm text-[var(--muted)]">Profile & cycle</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Avg. cycle length
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
              Avg. period length
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
          {error && <p className="text-sm text-[var(--rose)]">{error}</p>}
          {saved && <p className="text-sm text-[var(--muted)]">Saved ✓</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-[var(--muted)]">Period start dates</h2>
        <div className="flex gap-2">
          <input type="date" className="input flex-1" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          <button className="btn-secondary" onClick={addStart} type="button">
            Add
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {starts.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border)]">
              {new Date(s.start_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              <button onClick={() => removeStart(s.id)} className="text-[var(--muted)] underline">
                Remove
              </button>
            </li>
          ))}
          {starts.length === 0 && <p className="text-sm text-[var(--muted)]">No dates logged yet.</p>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-[var(--muted)]">Partner</h2>
        {profile?.pair_id ? (
          <div className="card">
            <p className="text-sm mb-2">
              Linked with <span className="font-medium">{partnerName ?? "…waiting for them to join"}</span>
            </p>
            {inviteCode && (
              <p className="text-xs text-[var(--muted)] mb-3">
                Invite code: <span className="font-mono">{inviteCode}</span>
              </p>
            )}
            <button onClick={unlinkPair} className="btn-secondary">
              Unlink
            </button>
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
        {pairMessage && <p className="text-sm text-[var(--muted)]">{pairMessage}</p>}
      </section>

      <button onClick={signOut} className="btn-secondary text-[var(--rose)]">
        Sign out
      </button>
    </div>
  );
}
