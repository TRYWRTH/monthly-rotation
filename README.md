# Monthly Rotation

A private, installable web app for two people to track their cycles, log how
they feel, and see phase-aligned tips (supplements, nutrition, movement,
self-care) — plus a "how to support your partner" view based on where they
are in their cycle.

No app store: it's a PWA (installable to your home screen from the browser).

## How it works

- **Auth & data**: [Supabase](https://supabase.com) (Postgres + auth). Each
  person has an account; two accounts link into a "pair" via a short invite
  code (Settings → Partner).
- **Privacy split**: your own check-ins (mood, energy, symptoms, flow,
  free-text notes) are private to you. Your partner sees your current cycle
  phase and a mood/energy-based alignment summary, but never your symptom
  list or notes — see `supabase/schema.sql` (`daily_logs` RLS +
  `partner_log_summary` view) if you want to change that boundary.
- **Cycle math**: phases (menstrual/follicular/ovulatory/luteal) are computed
  backward from predicted ovulation (cycle length − ~14-day luteal phase),
  not as even fractions of cycle length — see `src/lib/cycle.ts`. Once 3+
  cycles are logged, your own rolling average cycle length is used instead
  of the manually-set default.
- **Content**: phase guides, symptom-alignment notes, and supplement
  suggestions live in a `cycle_knowledge` Supabase table (seeded from
  `supabase/seed_cycle_knowledge.sql`), not hardcoded in the app — edit that
  row in the Supabase Table Editor any time, no redeploy needed. General
  wellness information, not medical advice (disclaimer shown in-app).

## Setup

### 1. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql`, then
   `supabase/seed_cycle_knowledge.sql`.
3. In Project Settings → API, copy the **Project URL** and **anon public**
   key.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
step 1.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, complete
onboarding (last period start date, cycle length), then have your partner
sign up and enter the invite code from your Settings page.

### 4. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   Vercel project environment variables (Project Settings → Environment
   Variables) — these are inlined at build time, so they must be set
   *before* the first build.
3. In your Supabase project, add the deployed Vercel URL to
   **Authentication → URL Configuration** (Site URL / Redirect URLs).
4. Deploy. Once live, open it on your phone's browser and use "Add to Home
   Screen" (iOS Safari) or the install prompt (Android Chrome) to install it
   like an app.

## Project structure

```
src/app/            Pages (dashboard, log, calendar, insights, settings, auth)
src/components/      Shared UI (nav, phase card, service worker registration)
src/lib/cycle.ts      Phase math + rolling cycle-length average
src/lib/knowledge.ts  Content types, tag derivation, alignment checking
src/lib/severity.ts   "Worth mentioning to a doctor" pattern flags
src/lib/supabase/     Browser/server Supabase clients + generated types
supabase/schema.sql   Tables, RLS policies, views
supabase/seed_cycle_knowledge.sql  Phase/alignment/supplement content
```

## Notes

- This app gives general wellness information, not medical advice — the
  in-app disclaimer and doctor-mention nudges are load-bearing, not
  decoration.
- The severity flags (recurring severe pain, possible PMDD pattern, unusual
  cycle stats) are simple heuristics, not diagnosis.
