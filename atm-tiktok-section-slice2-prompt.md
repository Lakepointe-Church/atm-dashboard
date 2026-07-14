# ATM Dashboard — TikTok Ads Section (Slice 2)

**Role:** You are implementing the TikTok Ads section of the ATM 2026 campaign dashboard. This is **Slice 2** of the paid-ads plan. It depends on **Slice 1** (the "Paid Ads" shared block + per-platform section restructure) being committed first — verify that structure exists in the codebase before starting. If it does not, STOP and flag it; do not build TikTok into the old layout.

**Architect:** Jolie. You implement; she gates each phase. Show before commit at every gate.

---

## Context

The dashboard already has a Meta Ads section fed by `meta.ts` (Meta Marketing API). This slice adds a **TikTok Ads** section below it, fed by the **TikTok Marketing API v1.3**, showing TikTok's platform-native ad metrics and a per-creative (per-ad) table, mirroring the Meta section's role.

**Campaign facts (confirmed):**
- Lakepointe's TikTok campaigns for ATM 2026 are **Smart+** campaigns.
- The developer app ("Lakepointe Church Ads") is approved with scopes: **Upgraded Smart+ Report**, **Ad Insight Report**, **Ad Account Management**.
- Auth is complete. A long-lived access token exists.

**Environment variables (already set in Vercel — use these exact names):**
- `TIKTOK_AD_APP_ID` — the app ID
- `TIKTOK_ACCESS_TOKEN` — long-lived advertiser access token (no refresh flow; see note below)
- `TIKTOK_ADVERTISER_ID` — the advertiser account, `7296191293187932161`

**Token lifecycle note:** The token-exchange response contained no `refresh_token` and no `expires_in`, implying a long-lived token with no refresh machinery needed. This is inferred, not documented — if any call returns an auth/expiry error (`code` != 0 with an auth message), surface it loudly as "TikTok auth expired — re-authorization required" rather than retrying silently. Do NOT build a refresh flow.

---

## CRITICAL API BEHAVIOR — read before writing any fetch code

1. **TikTok returns HTTP 200 even for application-level errors.** The real status is the top-level JSON `code` field: `0` = success, anything else = failure. ALL error handling MUST key off `code`, never the HTTP status. A non-zero `code` must throw/surface with the `message` and `request_id` included — never be swallowed, never coerce metrics to 0.
2. **Response envelope:** `{ code, message, request_id, data }`. Log `request_id` on every failure (needed for TikTok support tickets).
3. **Auth header:** requests carry the access token in an `Access-Token` header (verify exact header name in the docs during Phase 0).
4. **API host:** `https://business-api.tiktok.com` (v1.3 paths). NOT `open.tiktokapis.com` (that is the consumer/content API).
5. **Pagination:** list endpoints page; check for `page_info` and set page size appropriately (verify parameter name in docs).

---

## VERIFIED-ONLY DATA RULE (non-negotiable)

**No endpoint path, parameter name, report type, dimension name, or metric field name may be written into code from memory — yours or anyone's.** TikTok unified campaign management under Smart+ in 2026 and sunset legacy endpoints (after Mar 31, 2026); tutorial content and model memory are stale. Every identifier must come from either (a) the live v1.3 reporting documentation, or (b) the actual response of a test call made in Phase 0. If the docs and a test response disagree, the test response wins and the discrepancy gets reported.

---

## Phase 0 — Empirical discovery (GATE: report findings before ANY dashboard code)

Goal: establish, from live calls, exactly how ATM Smart+ campaign data surfaces and what the real field names are.

1. **Smoke-test auth:** call the advertiser-info or equivalent lightweight endpoint (find it in the current docs — Ad Account Management scope covers `/advertiser/info/` and `/oauth2/advertiser/get/`-style endpoints) with `TIKTOK_ACCESS_TOKEN` and `TIKTOK_ADVERTISER_ID`. Confirm `code: 0` and that the advertiser resolves to the Lakepointe account.
2. **Locate the reporting endpoint(s)** in the current v1.3 docs for the scopes we hold. Determine specifically: does Smart+ campaign performance surface through the standard/integrated report, the "Upgraded Smart+ Report" surface, or both? (Our scope selection assumed the Smart+ report is load-bearing for Smart+ campaigns — that was an inference from naming; Phase 0 exists to confirm or refute it.)
3. **Pull a small test report** for the ATM campaign window (campaign start 2026-06-10 or later; TikTok ads went live late June — if the exact TikTok flight start is needed, ask Jolie rather than guessing) at day grain, ad level if available, with whatever default/available metrics the endpoint exposes.
4. **Print and report:** the raw request (endpoint, params) and the raw response — actual dimension names, actual metric field names, how creatives/ads are identified (ad_id? ad_name?), and whether spend/impressions/clicks/conversions/video metrics are present. List which metrics from the target table (below) have direct equivalents, which need derivation, and which don't exist.
5. **STOP. Present findings to Jolie.** The metric mapping for Phases 1–2 gets locked from these findings, not from assumptions.

---

## Target section design (locked decisions from Jolie)

**Hybrid table** (same philosophy as the planned YouTube section):
- **Shared-comparable columns** (mirror Meta's table where equivalents exist): creative/ad name, grouping (ad group/campaign), impressions, clicks, conversions/leads, cost per lead/result, amount spent, cost-per-landing-page-view-equivalent *if TikTok exposes an LPV-like metric — do not force it; leave the column out or "awaiting mapping" if no honest equivalent exists*.
- **TikTok-native columns:** video/engagement metrics per what Phase 0 finds available (e.g. video views, view-through metrics — the specific choices get made by Jolie from the Phase 0 findings list, not preselected).

**Section cards:** platform-native totals (spend, impressions, clicks, conversions + whatever video totals are chosen). Do NOT include GA4 metrics in this section — GA4 lives in the shared "Paid Ads" block (Slice 1). Add a short source subtitle on cards (e.g. "TikTok Marketing API") consistent with how Meta's cards are labeled.

**Charts:** if a TikTok trend chart is added, it is platform-native data only. Respect the brand chart-color rule below.

---

## Build phases after discovery

**Phase 1 — Ingest (`tiktok.ts`):**
- New `lib/tiktok.ts` mirroring the structural pattern of `meta.ts`: `hasTiktokCreds()` guard, fetch functions, typed return shape.
- All requests: check `code === 0`; on failure throw with `message` + `request_id`. No `?? 0`, no `catch → 0` — a failed pull is a thrown error that renders as an error/awaiting state upstream.
- Filter to the ATM campaign(s). How to identify them (campaign name contains "ATM"? campaign ID allowlist?) gets confirmed with Jolie at the Phase 0 gate using real campaign names from the test pull.
- Wire into the existing sync route (`route.ts`) alongside GA4/HubSpot pulls, storing through the existing canonical write path (`upsertMetrics`) — do not invent a parallel storage path. Follow the existing metric-key naming convention (snake_case, platform-prefixed, e.g. `tiktok_*` keys matching the pattern of existing keys).
- Per-run token behavior: use `TIKTOK_ACCESS_TOKEN` directly; no refresh.

**Phase 2 — Section UI:**
- TikTok Ads section rendered below Meta Ads in the per-platform stack from Slice 1.
- Placeholder-first: the section renders immediately with "awaiting data" states wherever data is absent; live numbers drop in as the ingest lands. Missing row = awaiting data; stored zero = confirmed real zero.
- Reuse the existing card/table/section components from the Meta section rather than duplicating.
- Brand (brand-light, `theme.ts` tokens only): orange is rationed — it stays the focal accent; slate is the sanctioned second color; any additional series/accents use neutrals. No new colors.

**Phase 3 — Verification pass:**
- Compare the section's rendered totals for a sample day against TikTok Ads Manager UI for the same day/window. Report deltas rather than reconciling silently — attribution-window or timezone differences are findings for Jolie, not things to paper over. (Check what timezone the reporting API returns — verify in docs — vs. the dashboard's date handling.)

---

## Gates
- **Gate A (after Phase 0):** findings report — real endpoints, real field names, Smart+ report question answered, metric-equivalence list. Jolie locks the mapping and native-metric choices.
- **Gate B (after Phase 1):** show a successful ingest run's stored rows (or the loud failure if creds/data misbehave). No UI yet.
- **Gate C (after Phase 2):** show the rendered section with live + placeholder states.
- **Gate D (after Phase 3):** show the Ads-Manager comparison. Only then final commit.

## Out of scope
- YouTube/Google Ads (Slice 3 — blocked on MCC).
- Any change to the shared "Paid Ads" block, Meta section, GA4 queries, or the follow-up email filter.
- Refresh-token machinery (long-lived token; loud failure on auth errors instead).
- Cross-keyword/cross-platform dedup or attribution logic.
