# ATM Dashboard — GA4 Channel Query Hardening
**For: Claude Code | Owner: Jolie (Lakepointe Church) | June 24, 2026**

Scope: three targeted fixes to `src/lib/ga4.ts` (and possibly `src/lib/channels.ts`).
This is a surgical change, not a refactor. Do **not** restructure the data layer, touch
the page UI, or alter the HubSpot/Meta/Neon code. Preserve all existing working behavior.

Work the three items **in order**. Items 1 and 2 are code changes. Item 3 is a
diagnostic that must run and report back **before** any code change is made for it.

---

## Item 1 — Scope all UTM channel queries to `utm_campaign=atm_2026`

**Problem:** The two UTM queries in `fetchGA4Data` (the `utmDailyResp` and `utmTotalsResp`
`runReport` calls) filter only on `pagePath CONTAINS 'at-the-movies'` plus per-channel
`sessionMedium` / `sessionSource`. They do **not** filter on campaign. Any session that
hits `/at-the-movies/` carrying a matching medium/source pair from a *different* campaign
(or no campaign) will be counted as ATM channel traffic. The generic mediums
(`email`, `organic_social`) are the most exposed.

**Change:** Add `sessionCampaign` to the dimension filter on both UTM queries so only
`atm_2026` traffic is returned.

- Add an `andGroup` to the `dimensionFilter` on both `utmDailyResp` and `utmTotalsResp`
  that combines the existing `pathFilter('at-the-movies')` with a new campaign filter:
  ```
  sessionCampaign EXACT 'atm_2026'
  ```
  (Use an exact string match, not CONTAINS — we want `atm_2026` only, not a hyphenated
  or otherwise-suffixed variant.)
- The page-level queries (`dailyResp`, `totalsResp`) should be **left unchanged** — those
  intentionally capture all page traffic including the no-UTM "Church Facing" slice.

**VERIFY BEFORE COMMITTING (hard rule):**
- Confirm the exact GA4 Data API dimension name for campaign. It is most likely
  `sessionCampaign`, but GA4 has renamed dimensions before. Confirm against current
  Google Analytics Data API docs **and** by returning real rows against the live property
  before relying on it.
- After adding the filter, confirm the channel totals for already-live channels
  (e.g. Podcast `youtube`/`podcast`) are unchanged or only trivially lower. A large drop
  would mean some legitimate ATM traffic carries a campaign value other than `atm_2026` —
  if so, STOP and report the actual campaign values seen, do not silently broaden the match.

---

## Item 2 — Single source of truth for UTM filter values

**Problem:** UTM filter values are declared in **two** places that can drift:
- `src/lib/ga4.ts` → `UTM_CHANNELS` (this is what the query actually uses)
- `src/lib/channels.ts` → each channel's `utmFilter` block (used for UI labels/metadata)

They already disagree: `channels.ts` declares `utmContent` for `podcast` (`atm`) and
`movieTheaters` (`movies`); `ga4.ts` ignores `utm_content` entirely. Both files'
comments claim to be the authoritative source. Only `ga4.ts` actually drives the query,
so `channels.ts`'s `utmFilter` is currently decorative — editing it changes nothing.

**Change:** Make one map authoritative and have the other derive from it. Preferred
direction (least risk): keep the per-channel definitions in `channels.ts` (it already
holds the richest metadata) and have `ga4.ts` build `UTM_CHANNELS` by reading from
`CHANNELS`, rather than maintaining a parallel hand-written object.

- In `ga4.ts`, replace the hand-written `UTM_CHANNELS` literal with a derivation from
  the imported `CHANNELS` map: for each channel that has a `utmFilter`, produce
  `{ medium: utmFilter.sessionMedium, source: utmFilter.sessionSource }`.
- Preserve the existing **medium-only** behavior for `metaFollowupEmail` (see Item 3 —
  do not change its matching semantics in this step). If the derivation would force a
  source onto it, handle that explicitly so its current behavior is preserved until
  Item 3 is resolved.
- Decide deliberately whether `utm_content` should be part of matching. Right now it is
  **not** matched in `ga4.ts`. If Podcast and Movie Theaters should match on content,
  that is a real query change with real effects — do NOT add it silently as part of this
  cleanup. If in doubt, keep content **out** of matching (preserve current behavior) and
  note it for Jolie to decide.

**Goal of this item:** editing a UTM value in one place changes both the query and the UI,
and there is exactly one authoritative definition per channel. No behavior change beyond
removing the duplication.

---

## Item 3 — Diagnose `metaFollowupEmail` medium-only matching (DIAGNOSTIC FIRST)

**Do not change code for this item until the diagnostic below is run and reported.**

**Concern:** `metaFollowupEmail` matches on `sessionMedium = 'email'` with **no source
constraint**. The inline comment explains this is intentional because HubSpot rewrites
`utm_source` to its own values (`hs_automation`, `hs_email`). That rationale may be
correct. The risk is that this channel will absorb **any** `utm_medium=email` session on
`/at-the-movies/` — including non-ATM email traffic, if any exists.

Note: once Item 1 lands (campaign scoped to `atm_2026`), this risk is **substantially
reduced** — only `atm_2026` + `medium=email` sessions will qualify. Re-evaluate the
concern *after* Item 1 is in place.

**Diagnostic to run (report results, do not act yet):**
1. Against the live GA4 property, query `sessionMedium`, `sessionSource`, `sessionCampaign`
   for `pagePath CONTAINS 'at-the-movies'` where `sessionMedium = 'email'`, over the
   campaign window (start `2026-06-10`).
2. Report the distinct `(sessionSource, sessionCampaign)` combinations and their page-view
   counts.

**Interpretation guide for Jolie:**
- If every `medium=email` row is `campaign=atm_2026` with sources limited to the expected
  HubSpot values (`hs_automation`, `hs_email`, possibly `email`) → medium-only matching is
  safe; **no code change needed**.
- If non-ATM campaigns or unexpected sources appear under `medium=email` → tighten
  `metaFollowupEmail` to an explicit source allow-list (e.g. match only when source is one
  of `email`, `hs_automation`, `hs_email`) rather than matching all `medium=email`.

Once Item 1 is in place, the campaign filter alone may make this moot. Report findings and
let Jolie decide before editing the matching logic.

---

## Out of scope (do not touch)
- Page-level queries (`dailyResp` / `totalsResp`) and the Church Facing slice.
- HubSpot, Meta, Neon, theme, and UI components.
- The `utm_source`/`utm_medium` naming convention (separate discussion, not a fix).
- The build spec / restructure spec docs (intentionally stale, not referenced going forward).

## Definition of done
- Items 1 and 2 implemented; build passes (`npm run build`), lint clean apart from the
  one known App-Router font warning.
- Item 1's campaign dimension name verified against live data, not just docs.
- Live-channel totals confirmed stable after Item 1 (no unexplained drop).
- Item 3 diagnostic run and results reported to Jolie; **no Item 3 code change** without
  her sign-off.
