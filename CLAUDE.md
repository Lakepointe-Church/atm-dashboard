# At the Movies — Campaign Dashboard

Public, team-facing analytics dashboard for Lakepointe Church's **At the Movies**
campaign (runs **July 11 – August 2, 2026**). Shows GA4 + HubSpot + Meta numbers for the
ad landing page (`atm-social`) and the member page (`at-the-movies`), with trend charts.

Full product spec: [`ATM_Dashboard_Spec.md`](ATM_Dashboard_Spec.md).

## Status

- **Phase 1 — DONE & shipped.** Static dashboard rendering the June 16, 2026 known values,
  with Meta wired from a committed JSON file. Fully deployable with **no secrets**.
- **Phase 2 — DEFERRED** (needs API credentials). Live GA4/HubSpot pulls, a Neon Postgres
  history store, an `/api/sync` route, and a twice-daily Vercel cron. See
  [Phase 2 plan](#phase-2-deferred) below.

## Live

- **Production:** https://atm-dashboard-jet.vercel.app (public, no login)
- **GitHub:** https://github.com/Lakepointe-Church/atm-dashboard (public)
- **Vercel project:** `atm-dashboard` under account **`plafata`** (`plafatas-projects`) —
  note this is a personal account, not an org/team. Deploy with `vercel --prod --yes`.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Recharts · TypeScript. Hosted on Vercel.

> The spec said Next 14; we use **Next 16** to match the sibling Lakepointe tool
> (`community-demographic-tool`). The future history store is **Neon Postgres**
> (`@neondatabase/serverless`), not the spec's Vercel KV.

```
src/
  app/
    layout.tsx        # fonts (Fraunces + Inter), metadata, <Analytics/>
    page.tsx          # the dashboard (server component) — header, cards, charts, footnotes
    globals.css       # light theme base + bg wash + fade animations
  components/
    TrendChart.tsx    # 'use client' Recharts line chart (multi-series, themed)
    ui/StatCard.tsx   # 'use client' metric card (white, accent top bar, serif number)
    ui/Surface.tsx    # white rounded panel w/ soft shadow
    ui/SectionHeader.tsx # serif section heading w/ colored accent rule
  lib/
    theme.ts          # ⭐ design tokens (colors, fonts, shadows) — single source of truth
    data.ts           # ⭐ data layer — typed shapes + getDashboardData()
data/
  meta.json           # manually-entered Meta Ads numbers (safe to commit, no secrets)
```

## Design system (light, editorial)

Deliberately **distinct from** the dark "CIP" sibling dashboard — do not reintroduce that
dark/gold/dot-grid look. All tokens live in [`src/lib/theme.ts`](src/lib/theme.ts):

- **Surfaces:** warm paper background `#F4F1EA` with a soft red-tinted top wash (no dot-grid);
  white cards, rounded 14px, soft shadows, a 4px colored accent bar on top.
- **Type:** `Fraunces` (editorial serif) for headings + big numbers; `Inter` for body and
  uppercase tracked labels. (Loaded via `<link>` in `layout.tsx`.)
- **Palette (cinematic):** curtain-red `#CB4231` (primary), navy `#2B3A67`, teal `#0E8C7F`,
  amber `#D9952B`, violet `#6C56C9`. Numbers stay ink (`#1C1A16`) for readability; accents
  color the card top bars, section rules, and chart lines.

Components use inline styles reading from `theme.ts` (same convention as the sibling tool —
no Tailwind utility classes for the bespoke UI, no shadcn).

## Data layer — the one seam that matters

[`src/lib/data.ts`](src/lib/data.ts) is the **single source of truth** for what the page
renders. `getDashboardData()` is `async` and returns a typed `DashboardData`.

- GA4 + HubSpot numbers currently come from the `SEED` constant (the spec §7 June 16 values).
  Each metric carries `{ value, history }`; the latest point is real, the earlier chart
  points are **illustrative placeholders** flagged by the `seeded` field (the UI labels this).
- Meta comes from [`data/meta.json`](data/meta.json) (read at request time via `fs`, so the
  page is `force-dynamic`). The owner hand-edits this file and appends a dated `history`
  entry when updating.
- Form conversion rate = submissions ÷ GA4 page views (computed in `getDashboardData`).

**To update displayed Meta numbers:** edit `data/meta.json` (`landing_page_views`,
`last_updated`, and append to `history`), commit, redeploy.

## Phase 2 (deferred)

Insertion points are marked `TODO(phase 2)` in `data.ts`. The plan: replace `loadSeed()`
with a read from Neon Postgres that the cron-driven `/api/sync` route populates — keep the
same `{ value, history }` shape and **no caller changes are needed**.

1. **GA4** — Google Analytics Data API via a service account. Filter page paths
   `/atm-social/` and `/at-the-movies/`; pull `screenPageViews` + `activeUsers` by date.
2. **HubSpot** — Private App token; form views + submissions for form
   `d2248827-6c54-4792-bf25-697ed9292e15` (portal `43908455`). Form views may come from the
   Analytics API rather than the Forms API — verify.
3. **Store** — Neon Postgres table keeping dated history per metric.
4. **Cron** — `vercel.json` crons hitting `/api/sync` twice daily
   (`0 11 * * *` and `0 23 * * *` UTC = 6am/6pm Central in summer).

**Env vars** (set in Vercel, never commit; `.env*` is gitignored):
`GA4_PROPERTY_ID`, `GA4_SERVICE_ACCOUNT_KEY` (service-account JSON as a string),
`HUBSPOT_PRIVATE_APP_TOKEN`, plus the Neon connection string.

> Before relying on the live pulls, verify current GA4 metric names and the HubSpot
> form-view-vs-submission endpoints against current docs (spec §10). Sanity-check first-run
> numbers against the spec §7 June 16 values. Regenerate any tokens shared in plaintext.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + type-check
npm run lint     # eslint (one known App Router custom-font warning is expected)
vercel --prod --yes   # deploy to production (account: plafata)
```
