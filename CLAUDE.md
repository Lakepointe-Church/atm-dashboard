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
  replacing manual `data/meta.json` updates. Originally filtered to "ATM 2026" only;
  as of July 15, 2026 it also includes the "Brand Awareness - Video Views" campaign.
  All three data sources are now fully automatic — no manual updates required.
- **Paid ads KPI expansion — July 14, 2026 (committed, awaiting prod deploy).**
  (1) **Meta Reach** — KPI card in Meta Ads + per-ad column in the creatives table.
  The table footer / KPI show the campaign-level de-duplicated total from a separate
  lifetime insights query, never the sum of rows (see Meta row below). (2) **Cost per
  Video Play** cards in Paid Ads (combined Meta+TikTok spend ÷ combined video views,
  partial-data rule: awaiting unless both platforms report), Meta Ads (spend ÷ 3-sec
  plays), and TikTok Ads (spend ÷ 6-sec views). (3) `/api/sync` now also stores
  `meta_*` and `sms_*` metrics in Neon. Inspection routes live at
  `/api/debug-{meta,hubspot,utm,tiktok,rock}` (fixed queries, no secrets in code).

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
| **Meta landing page views** | Live | `src/lib/meta.ts` — System User token via `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID`. Resolves campaign IDs whose names contain "ATM 2026" or "Brand Awareness - Video Views" (see `CAMPAIGN_NAME_MATCHES`), then calls `act_{id}/insights` with `filtering` on `campaign.id IN [...]` — Meta's filtering ANDs conditions, so two name CONTAINs can't express an OR. All queries use a fixed reporting window via `time_range` — **June 10, 2026 → today** (`META_START_DATE`), matching GA4/HubSpot; without it, Brand Awareness (running since Mar 9) would pull in pre-campaign history. Fetches daily breakdown + per-ad creative stats (incl. per-ad reach) + a separate window totals query for campaign-wide **reach** — reach is de-duplicated unique people, so per-ad/daily values must NOT be summed (sum ≈ 761k vs true ~408k as of Jul 14, 2026). Returns the full windowed history on every request (no Neon needed). Falls back to `data/meta.json` if API fails (reach renders "awaiting", never 0). |
| **TikTok Ads** | Live | `src/lib/tiktok.ts` — long-lived advertiser token via `TIKTOK_ACCESS_TOKEN` + `TIKTOK_ADVERTISER_ID`. Calls `report/integrated/get/` (v1.3, host `business-api.tiktok.com`, `Access-Token` header, `report_type=BASIC`) filtered by campaign_id `1869425945879842` ("ATM 2026" Smart+). Errors key off JSON `code` (0=ok), never HTTP status; non-zero throws with `message`+`request_id`. Scopes are **report-only** — `advertiser/info`, `campaign/get`, `ad/get` all return `code 40001` (so no account timezone or per-ad public URL via API; tz **confirmed UTC-06:00 fixed, no DST**, from the Ads Manager date picker — verified Jun 30, 2026 totals match exactly). `conversion` deliberately NOT surfaced (pixel-event optimization artifact, not leads). `stat_time_day` capped at 30-day spans → history chunked. On failure the section renders "awaiting data", never zeros. Sync stores `tiktok_*` keys (spend as cents). |
| **Neon history** | Live | `src/lib/db.ts` + `DATABASE_URL` (set via Vercel Storage → `neon-atm`). `/api/sync` upserts one row per metric per day — GA4/HubSpot metrics plus `meta_*` (spend as cents, landing views, 3-sec plays) and per-keyword `sms_*` counts; Meta and Rock SMS writes are isolated so one source failing doesn't roll back the others. Dashboard uses Neon history arrays when populated; falls back to GA4 direct history + `data/hubspot.json` when empty. |

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
| `TIKTOK_ACCESS_TOKEN` | Long-lived TikTok advertiser token ("Lakepointe Church Ads" app; report-only scopes). No refresh flow — on auth error, re-authorize. Sensitive — won't come through `vercel env pull`. |
| `TIKTOK_ADVERTISER_ID` | `7296191293187932161`. Sensitive. |
| `TIKTOK_AD_APP_ID` | TikTok app ID. Sensitive. |

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
