## Code Review: atm-dashboard (production, main branch as of 2026-07-08)

Reviewed directly from the connected local folder (`src/`, `data/`, `vercel.json`) — no GitHub connector was used. Scope: data layer (`lib/ga4.ts`, `hubspot.ts`, `meta.ts`, `tiktok.ts`, `db.ts`, `data.ts`), API routes (`api/sync`, `api/debug-*`), and `page.tsx`.

### Summary

Solid, well-commented data layer with good fallback discipline (every external source degrades to a cached/seed value instead of crashing or silently zeroing). The two things that need attention before the campaign goes live July 11 are (1) unauthenticated production API routes that expose internal data and can be used to burn third-party API quota, and (2) the page has zero caching, so every visitor fans out to 6 external APIs on every load — risky under real campaign traffic.

### Critical Issues

| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| 1 | `src/app/api/debug-rock/route.ts` | 23–39 | Publicly reachable, no auth. Returns the **entire Rock persisted dataset** (per `rock.ts`'s own comment: "130+ keys — give, group, podcast, marriage, easter…"), not just ATM keywords. Anyone with the URL sees church-wide SMS keyword data. Also leaks the first 4 characters of `ROCK_API_TOKEN` (`startsWith`). | 🔴 Critical |
| 2 | `src/app/api/debug-hubspot/route.ts`, `debug-meta/route.ts`, `debug-tiktok/route.ts`, `debug-utm/route.ts` | all | Same pattern: no auth check at all, on a public no-login domain. They expose raw ad IDs/names, submission timestamps, and internal debugging detail that shouldn't ship to prod. | 🔴 Critical |
| 3 | `src/app/api/sync/route.ts` | 9 | No auth/secret check on the sync endpoint. `vercel.json` configures cron but never sets/reads a `CRON_SECRET` — meaning anyone can hit `/api/sync` directly and trigger on-demand GA4 + HubSpot + TikTok API calls. Repeated calls could exhaust GA4/TikTok quota or rack up API usage outside your control. | 🔴 Critical |
| 4 | `src/app/page.tsx` | 9 | `export const dynamic = 'force-dynamic'` — the page has **no caching or revalidation**. Every visitor triggers live calls to GA4, HubSpot, Meta, TikTok, Neon, and Rock in the request path. Combined with #3, this is a real availability/cost risk once the campaign drives real traffic (July 11–Aug 2). | 🔴 Critical |

### Suggestions

| # | File | Line | Suggestion | Category |
|---|------|------|------------|----------|
| 1 | `src/lib/meta.ts` | 6–13, 150 | `PERMALINK_OVERRIDES` keys (`'Ad 1 - IMG 1'`, `'Ad 2 - IMG 2'`, etc.) don't match the ad names currently returned by the API (live page shows `"Ad 1 - Static Image 1"`, `"Ad 4 - At The Movies Promo Video"`, etc.). This lookup table is dead code — it never matches and silently falls through to `fetchPermalinks()`. Either update the keys or delete the table. | Correctness |
| 2 | `src/lib/meta.ts` | 148 | `status: 'active'` is hardcoded for every creative row — the `'off'` branch of the type is never produced. If any ad is actually paused in Ads Manager, the dashboard will still label it active. | Correctness |
| 3 | `src/lib/tiktok.ts` | 133–168 | `totalsRows`, `adRows`, and the chunked `dailyRows` loop are all fetched **sequentially** (`await` one after another) rather than in parallel via `Promise.all`. Given this runs on every uncached page load, this is avoidable latency. | Performance |
| 4 | `src/lib/db.ts` | 33–42 | `upsertMetrics` awaits one `INSERT` per metric in a loop — ~20 round trips per sync instead of one batched multi-row insert. Works fine at current volume but won't scale gracefully if more metrics are added. | Performance |
| 5 | `src/lib/data.ts` | 419–503 | The GA4-available branch and the seed-fallback branch duplicate the `conversionRate`/`costPerLead` calculation almost verbatim. Worth extracting into a shared helper to avoid the two drifting apart later. | Maintainability |
| 6 | `src/lib/meta.ts` | 44–48, 70 | Meta access token is passed as a `access_token` query-string parameter rather than an `Authorization` header. This is a documented pattern for the Graph API, but it does mean the token can end up in server logs or any tooling that logs outgoing request URLs — worth double-checking Vercel's function logs don't capture full fetch URLs. | Security (verify) |
| 7 | `src/lib/meta.ts`, `src/lib/tiktok.ts` | various | Several `fetch()` calls parse `.json()` without checking `res.ok` first (unlike `hubspot.ts`, which does). If an upstream returns an HTML error page, `.json()` throws a less-useful parse error instead of a clear HTTP-status error. Caught upstream by the fallback logic either way, so low impact — just noisier logs. | Robustness |

### What Looks Good

- Every external data source (GA4, HubSpot, Meta, TikTok, Rock, Neon) has a clear, intentional fallback path and never silently coerces a failed fetch into a `0` — this is called out explicitly in comments and respected in the code. That discipline is the right call for a numbers-facing dashboard.
- Neon's tagged-template `sql` usage in `db.ts` is parameterized correctly — no SQL injection surface.
- TikTok's error handling correctly distinguishes HTTP 200-with-app-level-failure (`code !== 0`) from a real success, which is easy to get wrong with this API.
- `.gitignore` correctly excludes all `.env*` files — no secrets are committed to git (though see note below on the local `.env.local`).

### Verdict

**Request changes before July 11.** The auth gap on `/api/sync` and the `debug-*` routes is the priority — either add a shared-secret check (e.g., validate a header against a `SYNC_SECRET` env var, checked in each route) or remove/gate the debug routes entirely before the campaign drives real public traffic. The `force-dynamic` + no-cache pattern on the homepage is the second priority; even a short `revalidate` window (e.g., 60–300s via Next's ISR) would cut external API calls dramatically without materially hurting freshness for a dashboard that already only syncs twice a day.

---
*Note: a `.env.local` file exists locally in the project folder. It's correctly git-ignored, but flagging since it contradicts "no credentials saved locally" — worth confirming it's not sitting on any machine it doesn't need to be on.*
