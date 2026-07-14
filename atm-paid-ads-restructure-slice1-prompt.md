# ATM Dashboard — Paid Ads Restructure (Slice 1 of 3)

**Role:** You are implementing a presentation-layer restructure of the ATM 2026 campaign dashboard. This is **Slice 1** of a three-slice plan. Slice 2 (TikTok Ads section, TikTok Marketing API) and Slice 3 (YouTube Ads, Google Ads API — currently blocked upstream) are **out of scope here** — do not build them. This slice only regroups existing, already-working metrics into a new structure. **No metric definitions change in this slice.** You are moving cards and charts, not redefining how anything is measured.

**Architect:** Jolie. You implement; she gates each vertical slice. Show before you commit — see "Gates" below.

---

## Why this restructure

Currently the dashboard has a "Meta Ads" section that mixes two kinds of metric:
1. **Campaign-wide metrics** that belong to no single ad platform because all paid ads drive to the same landing pages/forms (GA4 page-path traffic, HubSpot form submissions, follow-up email).
2. **Platform-specific metrics** that come from Meta's own API (Meta landing page views, per-creative impressions/clicks/spend/cost-per-lead).

We are separating these. Campaign-wide metrics move up into a new shared **"Paid Ads"** block. Platform-specific metrics stay in a per-platform section (Meta Ads today; TikTok Ads next, YouTube Ads later). This makes the structure honest and lets new platforms slot in cleanly.

---

## Target structure (top to bottom)

### 1. "Paid Ads" shared block (NEW — section header: "Paid Ads")

Campaign-wide cards, moved out of the current Meta Ads section. These are measured **exactly as they are today** — same queries, same sources, same filters. Only their location/grouping changes.

Cards in this block:
- **GA4 Page Views** — page-path pull (`atm-social` / `at-the-movies`), total landing-page traffic. UNCHANGED query.
- **GA4 Active Users** — page-path pull, total. UNCHANGED query.
- **Form Submissions** — HubSpot (`form_submissions`). UNCHANGED.
- **Form Conversion** — `form submissions ÷ GA4 page views`. Numerator and denominator now both live in this block, so the denominator is unambiguous. Keep the existing subtitle ("submissions ÷ page views"). UNCHANGED formula.
- **Follow-up Email Views** — existing `meta_followup_email_page_views`. UNCHANGED.
- **Follow-up Email Users** — existing `meta_followup_email_active_users`. UNCHANGED.

> NOTE on labels: the follow-up email cards currently sit under "Meta Ads" and read "HubSpot freebie · utm_medium=email". They are moving to the shared block. Keep the same data and subtitle; do not rescope the underlying query in this slice. (There is a separate, known concern that the `utm_medium=email` filter may be broad — that is tracked elsewhere and is NOT part of this slice. Do not change the filter.)

### 2. Per-platform sections

#### Meta Ads (section header: "Meta Ads")
Platform-specific metrics only — everything that comes from the Meta API or is genuinely Meta-attributed. Moves OUT of this section: the six campaign-wide cards above. Stays IN this section:
- **Meta Landing Page Views** (Meta API — `meta.ts`). This is Meta's own attribution and is a DIFFERENT metric from the shared "GA4 Page Views." Add/keep a short subtitle clarifying the source (e.g. "Meta API") so a viewer does not read it as the same thing as the shared GA4 page views.
- **Cost per Lead** (Meta — total spend ÷ submissions, as today).
- The **per-creative table** (impressions, outbound clicks, landing page views, leads, cost/lead, amount spent, cost/LPV) — UNCHANGED.
- The Meta trend chart(s) that are genuinely Meta-attributed (e.g. Meta Landing Page Views over time) stay here.

#### TikTok Ads / YouTube Ads
**Do NOT build these in this slice.** If it is trivial to drop in a visually-consistent **placeholder section shell** (header + "Coming soon / awaiting data" state) that matches the existing "coming" channel styling already in the dashboard, you may — but only as an empty placeholder. No data wiring. TikTok is the next section to be filled (Slice 2, spec exists separately); YouTube follows later. If a placeholder adds any real complexity, skip entirely.

### 3. Consolidated GA4 charts (shared)

The shared GA4 charts (Page Views, Active Users) belong with the shared block conceptually. Keep them as **single-line / total** charts — they reflect total landing-page traffic, not per-platform splits. Do not split these by platform in this slice.

> FORWARD-LOOKING CONSTRAINT (read, do not implement yet): In Slice 2+, platform-specific charts may show multiple platform lines. The Lakepointe brand rule is that **orange is the only pop color and must be rationed** — it stays the focal series. The sanctioned second color is **slate (`#7AA3AA`)**; a third series must use a neutral, never a new bright hue. Structure any chart components you touch so that adding a second/third series later does not require introducing off-brand colors. Do not add platform lines now.

---

## Hard rules (non-negotiable)

1. **No metric redefinition.** Every number must measure exactly what it measures today. This slice is regrouping only. If you find yourself changing a query, a filter, a date range, or a formula — STOP and flag it; that is out of scope.
2. **Loud failure over silent zeros.** Preserve existing failure behavior. A failed/absent data pull must render as "awaiting data" or surface the error — never coerce to `0`. Do not introduce any `?? 0` or `catch → 0` patterns. If you see the restructure tempting you toward silent zeros, flag it.
3. **Canonical read path.** Do not bypass existing read/dedup helpers with new raw queries. Cards in the new block read from the same source they read from today.
4. **Brand.** Apply the Lakepointe brand skill (brand-light — this is the executive-facing ATM dashboard). Orange stays rationed and reserved for the focal KPI / accents; neutrals carry structure. Do not introduce competing bright colors. Reuse the existing `theme.ts` tokens already in the project.
5. **Source-of-truth files.** `channels.ts` remains the authoritative UTM config; `theme.ts` remains the design-token source. Do not duplicate values out of them.

---

## Gates (show before commit)

Work in this order and PAUSE for Jolie's review at each gate before continuing or committing:

- **Gate A — Discovery.** Locate the component(s) that render the current Meta Ads section, its cards, table, and charts. Report back the file/component names and how the six campaign-wide cards are currently wired, BEFORE moving anything. Confirm your understanding of what moves vs. stays.
- **Gate B — Shared block.** Implement the new "Paid Ads" shared block with the six moved cards. Show the rendered result. Do not yet touch the Meta section's remaining contents beyond removing the moved cards.
- **Gate C — Meta section cleanup.** Confirm the Meta Ads section now shows only platform-specific metrics + the per-creative table, with the clarifying subtitle on Meta Landing Page Views. Show the result.
- **Gate D — Charts + final.** Confirm shared GA4 charts are positioned sensibly with the shared block and remain single-line. Show the full restructured page. Only commit after Jolie approves.

At each gate: show, do not assume. Jolie decides before anything is written to the repo.

---

## Explicitly out of scope for Slice 1
- Any TikTok Marketing API / TikTok data wiring (Slice 2 — separate spec).
- Any Google Ads API / YouTube data wiring (Slice 3 — blocked on Google MCC setup).
- Any change to the `utm_medium=email` follow-up filter.
- Moving Meta's GA4 pull to a UTM basis (decided against — page-path stays).
- Any new metric, formula, or query.
