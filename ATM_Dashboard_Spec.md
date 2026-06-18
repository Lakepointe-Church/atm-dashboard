# At the Movies Analytics Dashboard — Build Spec
**For: Claude Code | Owner: Jolie (Lakepointe Church) | June 2026**

---

## 1. Goal

A public web dashboard showing live-ish analytics for the **At the Movies** campaign, so the broader team can see how the campaign is performing in one place. Data refreshes automatically twice per day for the platforms that allow it; Meta is entered manually via a config file until app review clears.

---

## 2. Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts (trend lines over time)
- **Hosting:** Vercel
- **Repo:** GitHub (under Lakepointe-Church org, suggested name `atm-dashboard`)
- **Scheduling:** Vercel Cron Jobs

Match the existing house style used on the other Lakepointe tools: dark background, warm gold accent `#E8B84B`, dot-grid pattern. Clean and legible — this is for a non-technical team audience.

---

## 3. Data Sources & Auth Strategy

> **IMPORTANT:** Do NOT build a Meta Marketing API integration. The Meta app is pending App Review and cannot be used yet. Meta data is manual-entry via config file (see below). Architect the code so a Meta API pull can be dropped in later **without** restructuring the data layer.

### a) GA4 — Automated
- **Method:** Google Analytics Data API (GA4) via a **service account** (no app review required).
- **Auth:** Service account JSON key stored as a Vercel environment variable. The service account email must be granted **Viewer** access to the GA4 property by Jolie.
- **Property ID:** *(Jolie to provide — found in GA4 Admin → Property Settings)*
- **Metrics to pull, per page path:**
  - `screenPageViews` (page views)
  - `activeUsers`
  - Date dimension for trend charting
- **Page paths to filter:**
  - `/atm-social/`
  - `/at-the-movies/`
- **Verify before relying on it:** Confirm the exact GA4 Data API metric names (`screenPageViews`, `activeUsers`) against current Google documentation, since API metric names change.

### b) HubSpot — Automated
- **Method:** HubSpot Forms API + Analytics, via a **Private App token** (no app review required).
- **Auth:** Private App access token stored as a Vercel environment variable. Jolie generates this in HubSpot → Settings → Integrations → Private Apps, with read scopes for forms/analytics.
- **Form to track:**
  - **Form ID:** `d2248827-6c54-4792-bf25-697ed9292e15`
  - **Portal ID:** `43908455`
- **Metrics to pull:**
  - Form views
  - Form submissions
- **Verify before relying on it:** Confirm the correct HubSpot endpoint and required scopes for pulling form view + submission counts in current HubSpot API docs. Form-view counts in particular may come from the Analytics API rather than the Forms API — check which is correct.

### c) Meta Ads — Manual (config file)
- **Method:** A committed config file the owner edits by hand.
- **File:** `/data/meta.json`
- **Shape:**
  ```json
  {
    "last_updated": "2026-06-16",
    "landing_page_views": 1744,
    "note": "Manually entered from Meta Ads Manager. Replace with API once app review clears.",
    "history": [
      { "date": "2026-06-16", "landing_page_views": 1744 }
    ]
  }
  ```
- The `history` array feeds the Meta trend line. Owner appends a new dated entry when updating.

---

## 4. Architecture

```
[Vercel Cron — 2x daily]
   |
   v
[/api/sync route]  -- pulls GA4 + HubSpot --> writes to a cached data store
   |
   v
[Data store] <-- also reads /data/meta.json (manual)
   |
   v
[Dashboard page] -- renders numbers + trend charts
```

### Data store
Use a simple persisted store rather than a database. Recommended: write fetched results to a JSON file or use Vercel KV (whichever Claude Code finds more reliable on current Vercel). The store should keep a **dated history** of each metric so trend charts have something to plot over time.

> Note: Vercel serverless filesystems are ephemeral, so a flat JSON file written at runtime will not persist. Use **Vercel KV** (or a similar lightweight persistent store) for the auto-pulled GA4/HubSpot history. The Meta data stays as a committed repo file since it's edited by hand. Confirm the current recommended Vercel storage option before building.

---

## 5. Cron Schedule

- **Frequency:** Twice daily.
- **Suggested times:** 6:00 AM and 6:00 PM Central (adjust for Vercel's UTC cron — Central is UTC-5 in summer / DST, so `0 11 * * *` and `0 23 * * *`).
- Configure in `vercel.json` cron config pointing at `/api/sync`.

---

## 6. Dashboard Layout

Audience is the broader team — prioritize clarity over density. Public URL, no login.

### Section 1: Header
- Title: "At the Movies — Campaign Dashboard"
- Subtitle with campaign dates (July 11 – August 2)
- "Last updated" timestamp (most recent successful sync + Meta's manual `last_updated`)

### Section 2: Headline Numbers (cards)
Two groups:

**Ad Landing Page (atm-social)**
- GA4 Page Views
- GA4 Active Users
- HubSpot Form Submissions
- Form Conversion Rate (submissions ÷ GA4 page views, shown as %)
- Meta Landing Page Views (with a small "manual" tag)

**Member Page (at-the-movies)**
- GA4 Page Views
- GA4 Active Users

### Section 3: Trend Charts (Recharts line charts)
- Page Views over time (both pages, two lines)
- Active Users over time (both pages)
- Form Submissions over time (atm-social)
- Each chart plots the dated history from the data store.

### Section 4: Footnotes
Short, plain-language data caveats (carry these over — they matter for how the team reads the numbers):
- atm-social is distributed only via Meta ads, so its traffic ≈ ad traffic.
- HubSpot form views run higher than GA4 page views due to differences in how each tool tracks; GA4 is the more reliable traffic figure.
- Meta numbers are entered manually until API access is approved.
- No UTM parameters are on the ads currently, so per-creative breakdown isn't available in GA4.

---

## 7. Known Starting Values (for seeding / sanity-checking)

As of June 16, 2026:

| Metric | Page | Value |
|--------|------|-------|
| GA4 Page Views | atm-social | 3,256 |
| GA4 Active Users | atm-social | 2,321 |
| GA4 Page Views | at-the-movies | 1,575 |
| GA4 Active Users | at-the-movies | 853 |
| HubSpot Form Views | atm-social | 4,947 |
| HubSpot Form Submissions | atm-social | 159 |
| Meta Landing Page Views | atm-social | 1,744 |

Use these to confirm the live API pulls return numbers in the same ballpark on first run.

---

## 8. Environment Variables (set in Vercel)

- `GA4_PROPERTY_ID`
- `GA4_SERVICE_ACCOUNT_KEY` (the service account JSON, as a string)
- `HUBSPOT_PRIVATE_APP_TOKEN`

Do not commit any of these to the repo. The Meta config file (`/data/meta.json`) is safe to commit — it contains no secrets.

> Reminder for owner: any API keys or tokens previously shared in plaintext during past sessions should be regenerated before use.

---

## 9. Build Order (suggested)

1. Scaffold Next.js + Tailwind, deploy a blank page to Vercel to confirm the pipeline works.
2. Build the static dashboard UI with the June 16 hardcoded values, so the team can see the layout.
3. Add `/data/meta.json` and wire the Meta cards/chart to read from it.
4. Add the HubSpot Private App integration; verify against known values.
5. Add the GA4 service account integration; verify against known values.
6. Add the persistent store + dated history.
7. Add the Vercel cron job hitting `/api/sync`.
8. Final pass: footnotes, last-updated timestamps, mobile responsiveness.

---

## 10. Things to Verify in Current Docs (do not assume)

- GA4 Data API metric names and the service-account auth flow.
- HubSpot endpoint + scopes for form views vs. submissions (may span two APIs).
- Current recommended Vercel persistent storage option (KV or otherwise).
- Vercel cron syntax in `vercel.json`.
