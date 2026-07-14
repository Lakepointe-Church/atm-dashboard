# At the Movies Dashboard — Channel Restructure Spec
**For: Claude Code | Owner: Jolie (Lakepointe Church) | June 23, 2026**

---

## Purpose of This Update

Restructure the existing dashboard from a **page-based** layout (Ad Landing Page / Member Page) to a **channel-based** layout. The team thinks in terms of *where traffic comes from*, not which URL it hits. Each channel gets its own section containing all of its relevant metrics, each with a trend-over-time chart.

This is a reorganization of the existing app, not a rebuild. Keep the current stack (Next.js 14, Tailwind, Recharts, Vercel), the existing GA4 + HubSpot integrations, the Meta manual-config approach, and the house style (dark bg, gold `#E8B84B` accent).

---

## Core Concept: Two Pages, Many Channels

There are two real web pages in the campaign:

- **atm-social** — the Meta ad landing page. Only Meta ads drive here.
- **at-the-movies** — the member-facing page. This is ALSO the destination for Podcast, Movie Theaters, Email, and Organic Social traffic, separated by UTM.

So most channels are **UTM-filtered slices of the at-the-movies page**, not separate pages.

> **Critical dependency:** Per-channel breakdowns only work if each channel's links carry a distinct UTM. GA4 separates channels by `utm_source` / `utm_medium` / `utm_content`. Channels without a UTM cannot be isolated. The Texts metric is the exception — it comes from Rock's CTA Keyword report, not GA4.

### Page → Channel mapping (FINAL UTM VALUES)

All campaign links point to `https://lakepointe.church/at-the-movies/` and use `utm_campaign=atm_2026`.

| Channel | Data source | GA4 filter (exact match) |
|---|---|---|
| Church Facing | at-the-movies page | sessions with NO campaign UTM (direct/organic member traffic) |
| Meta Ad | atm-social page | entire page (all atm-social traffic) |
| Podcast | at-the-movies page | `utm_medium=podcast` AND `utm_source=youtube` |
| Movie Theaters | at-the-movies page | `utm_medium=theaters` AND `utm_source=video` |
| Email | at-the-movies page | `utm_medium=email` AND `utm_source=email` |
| Organic Social — Linktree | at-the-movies page | `utm_medium=organic_social` AND `utm_source=social` |
| Organic Social — Groups | at-the-movies page | `utm_medium=organic_social` AND `utm_source=groups` |

Note: the two Organic Social channels share `utm_medium=organic_social` and are distinguished by `utm_source` (`social` for Linktree, `groups` for Facebook groups).

> Build the channel filters to read from a single config map (e.g. `data/channels.js`) keyed on the exact source/medium pairs above, so values can be adjusted in one place without touching query logic.

> **Campaign name consistency:** all links must use `utm_campaign=atm_2026` (underscore). Confirm no live links use a hyphenated `atm-2026` variant — GA4 treats them as separate campaigns.

---

## Layout

### 1. Campaign Summary Strip (NEW — top of page)
A single row of campaign-wide totals, before any channel detail. For at-a-glance scanning by non-analytics team members.
- Total Page Views (all channels combined)
- Total Form Submissions
- Total Texts (ATM + MOVIES keywords combined) — *placeholder until Rock data lands*
- Total Meta Spend
- Last sync timestamp

### 2. Channel Sections (in this order)

Each channel is a titled section/card containing its metrics. Metrics that are not yet available show a clear **"Data coming"** placeholder state (greyed card, label, no fake numbers).

---

#### Channel: Church Facing
*Source: at-the-movies page · direct/organic member traffic (no campaign UTM)*
- Page Views — GA4 + trend chart
- Active Users — GA4 + trend chart

---

#### Channel: Meta Ad
*Source: atm-social page · all traffic*
- Page Views — GA4 + trend chart
- Active Users — GA4 + trend chart
- Form Submissions — HubSpot + trend chart
- Form Conversion Rate — (submissions ÷ page views)
- Meta Landing Page Views — manual (meta.json) + trend chart
- Meta Ad Creatives — existing manual table (keep as-is: impressions, outbound clicks, LPV, spend, cost/LPV)
- Cost per Lead — (total spend ÷ HubSpot submissions)

---

#### Channel: Podcast — *Data coming*
*Source: at-the-movies page (`utm_medium=podcast` + `utm_source=youtube`) + Rock keyword "ATM"*
- Texts Sent (ATM keyword) — Rock CTA Keyword report + trend chart — **placeholder**
- Page Views — GA4 (UTM-filtered) + trend chart — **placeholder until UTM traffic appears**

---

#### Channel: Movie Theaters — *Data coming*
*Source: at-the-movies page (`utm_medium=theaters` + `utm_source=video`) + Rock keyword "MOVIES"*
- Texts Sent (MOVIES keyword) — Rock CTA Keyword report + trend chart — **placeholder**
- Page Views — GA4 (UTM-filtered) + trend chart — **placeholder until UTM traffic appears**

---

#### Channel: Email — *Data coming*
*Source: at-the-movies page (`utm_medium=email` + `utm_source=email`)*
- Page Views — GA4 (UTM-filtered) + trend chart — **placeholder until UTM traffic appears**

---

#### Channel: Organic Social — *Data coming*
*Source: at-the-movies page, UTM-filtered. Both share `utm_medium=organic_social`, split by `utm_source`.*
- Page Views from Linktree (`utm_source=social`) — GA4 (UTM-filtered) + trend chart — **placeholder**
- Page Views from Facebook Groups (`utm_source=groups`) — GA4 (UTM-filtered) + trend chart — **placeholder**

---

### 3. "How to read these numbers" footnotes (keep + expand)
Carry over the existing footnotes and add:
- Each channel below Meta Ad is a UTM-filtered slice of the at-the-movies page. Channels show real data only once their links carry the correct UTM.
- "Church Facing" = at-the-movies traffic with no campaign UTM (direct/organic member visits).
- Text counts come from Rock's CTA Keyword report (ATM and MOVIES keywords), pulled separately from web analytics.

---

## Placeholder Pattern (important)

For every "Data coming" metric, render a real card in its correct channel position, visually distinct (muted/greyed), labeled **"Data coming"** with a one-line note on what it's waiting on (e.g. "Awaiting Rock API access" or "Awaiting UTM setup"). This keeps the final layout visible and stable now, so adding live data later is a drop-in — no layout shift.

Drive placeholder vs. live state from a per-metric `status` flag in config (`live` | `coming`), so flipping a metric on is a one-line change.

---

## Data Sources Summary

| Source | Status | Method |
|---|---|---|
| GA4 (both pages, UTM-filtered) | live | existing service-account API pull |
| HubSpot form data | live | existing private-app token pull |
| Meta creatives + landing views | live (manual) | existing `data/meta.json` |
| Rock CTA Keyword report (ATM + MOVIES) | pending | ticket submitted to Rock team; will be API pull or scheduled export — **do not build yet, leave as placeholder** |
| UTM-filtered channel views | pending | needs UTMs live on Podcast/Theater/Email/Organic links first |

---

## Build Notes / Verify

- Confirm GA4 Data API supports filtering by `sessionSource` / `sessionMedium` / UTM dimensions for the per-channel queries — verify dimension names against current GA4 docs before building.
- Keep all UTM values in one config map so they're editable without touching query code.
- Don't hardcode the Rock integration yet — placeholder only until the ticket resolves and we know whether it's API or export.
- Preserve existing working integrations; this is a layout + query reorganization, not a teardown.
