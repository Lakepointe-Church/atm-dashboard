# At the Movies — Campaign Dashboard

Public, team-facing analytics dashboard for Lakepointe Church's **At the Movies**
campaign (runs **July 11 – August 2, 2026**). Shows GA4 + HubSpot + Meta numbers for the
ad landing page (`atm-social`) and the member page (`at-the-movies`), with trend charts.

Full product spec: [`ATM_Dashboard_Spec.md`](ATM_Dashboard_Spec.md).

## Status

- **Phase 1 — DONE & shipped.** Static dashboard rendering the June 16, 2026 known values,
  with Meta wired from a committed JSON file. Fully deployable with **no secrets**.
- **Phase 2 — DONE & shipped.** Live GA4 + HubSpot pulls, Neon Postgres history store,
  `/api/sync` route, and twice-daily Vercel cron. All three data sources are live as of
  June 19, 2026. See [data sources](#data-sources) below for per-source details.
- **Meta API — DONE & shipped (June 22, 2026).** Live Meta Marketing API integration
  replacing manual `data/meta.json` updates. Filtered to "ATM 2026" campaign only.
  All three data sources are now fully automatic — no manual updates required.

## Live

- **Production:** https://atm-dashboard-jet.vercel.app (public, no login)
- **GitHub:** https://github.com/Lakepointe-Church/atm-dashboard (public)
- **Vercel project:** `atm-dashboard` under account **`plafata`** (`plafatas-projects`) —
  note this is a personal account, not an org/team. Deploy with `vercel --prod --yes`.

## Data sources

| Source | Status | How it works |
|--------|--------|-------------|
| **GA4** | Live | `src/lib/ga4.ts` — service account auth via `GA4_SERVICE_ACCOUNT_KEY` + `GA4_PROPERTY_ID`. Two queries per load: daily breakdown (history) + totals. Filters `CONTAINS atm-social` and `CONTAINS at-the-movies`. Note: a malformed GA4 path `/at-the-https:/...` also matches — fixed by summing instead of overwriting. |
| **HubSpot form submissions** | Live | `src/lib/hubspot.ts` — Service Key bearer token via `HUBSPOT_PRIVATE_APP_TOKEN`. Paginates `form-integrations/v1/submissions/forms/{formId}` (50/page) to count total; no `total` field in response. Form ID: `d2248827-6c54-4792-bf25-697ed9292e15`, Portal: `43908455`. |
| **Meta landing page views** | Live | `src/lib/meta.ts` — System User token via `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID`. Calls `act_{id}/insights` with `filtering` scoped to campaign name `CONTAIN "ATM 2026"`. Fetches daily breakdown + per-ad creative stats. Returns full lifetime history on every request (no Neon needed). Falls back to `data/meta.json` if API fails. |
| **Neon history** | Live | `src/lib/db.ts` + `DATABASE_URL` (set via Vercel Storage → `neon-atm`). `/api/sync` upserts one row per metric per day. Dashboard uses Neon history arrays when populated; falls back to GA4 direct history + `data/hubspot.json` when empty. |

**Cron:** `vercel.json` runs `/api/sync` at `0 11 * * *` and `0 23 * * *` UTC (6am/6pm Central).
**First sync:** June 19, 2026 — 4,941 atm-social views / 356 form submissions.

**Meta numbers are now automatic** — no manual updates needed. `data/meta.json` remains as a fallback only.
**To update HubSpot history manually:** edit `data/hubspot.json`, commit, `vercel --prod --yes` (only needed if the HubSpot API goes down).

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

- **GA4** — `src/lib/ga4.ts` fetches live page views + active users for both page paths.
- **HubSpot** — `src/lib/hubspot.ts` fetches live form submission count; history from Neon.
- **Meta** — `src/lib/meta.ts` fetches live from Meta Marketing API. Falls back to [`data/meta.json`](data/meta.json) if creds missing or API errors.
- **History** — [`src/lib/db.ts`](src/lib/db.ts) reads from Neon (`metric_history` table).
  Falls back to GA4 direct history + `data/hubspot.json` when Neon is empty.
- Form conversion rate = submissions ÷ GA4 page views (computed in `getDashboardData`).

## Phase 3 (next)

- **HubSpot form views** — not yet tracked. `form-integrations/v1/submissions` only gives
  submission count. Form views may need the Analytics API — needs investigation.
- **HubSpot daily history** — Neon accumulates daily snapshots going forward from June 19.
  Pre-June-19 history lives in `data/hubspot.json` (manually entered from CSV).

## Env vars

All set in Vercel (never committed). `.env*` is gitignored.

| Var | Purpose |
|-----|---------|
| `GA4_PROPERTY_ID` | `270933483` |
| `GA4_SERVICE_ACCOUNT_KEY` | Full service account JSON (single line). Project: `lakepointe-social-dashboard`. SA email: `atm-dashboard@lakepointe-social-dashboard.iam.gserviceaccount.com` |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot Service Key (`pat-na1-...`). Created via Legacy Apps → Private in portal `43908455`. Scopes: `crm.objects.contacts.read`, `forms`. |
| `DATABASE_URL` | Neon connection string. Set automatically via Vercel Storage → `neon-atm`. Sensitive — not available via `vercel env pull`. |
| `META_ACCESS_TOKEN` | System User token from Business Manager → LP Campaign Reader system user. Sensitive — Production + Preview only. |
| `META_AD_ACCOUNT_ID` | Numeric ad account ID (without `act_` prefix). Production + Preview only. |

> **Local dev note:** `DATABASE_URL` is a Sensitive var and won't come through `vercel env pull`.
> The dashboard falls back gracefully to live GA4/HubSpot + seed history when it's absent.
> To set it locally, get the connection string directly from neon.tech or the Vercel env vars page.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + type-check
npm run lint     # eslint (one known App Router custom-font warning is expected)
vercel --prod --yes   # deploy to production (account: plafata)
```
