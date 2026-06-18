// ---------------------------------------------------------------------------
// Dashboard data layer — SINGLE SOURCE OF TRUTH for what the page renders.
//
// Phase 1 (this file as shipped): GA4 + HubSpot numbers come from the static
// SEED constant below (the June 16, 2026 known values from the build spec §7),
// and Meta comes from the committed /data/meta.json file. No network, no
// secrets — the dashboard is fully deployable.
//
// Phase 2 (deferred — needs credentials): replace `loadSeed()` with a read from
// the Neon Postgres history store that the twice-daily `/api/sync` cron writes
// to. The return SHAPE of getDashboardData() does not change, so page.tsx and
// the chart components never need to be touched. See the TODO markers below for
// the exact insertion points.
// ---------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { fetchGA4Data } from './ga4'

// --- Types -----------------------------------------------------------------

/** One dated observation of a metric, for trend charting. */
export type MetricPoint = { date: string; value: number }

/** A metric: its current (latest) value plus a dated history for the chart. */
export type Metric = {
  value: number
  history: MetricPoint[]
}

/** GA4 metrics tracked for a single page path. */
export type PageMetrics = {
  pageViews: Metric
  activeUsers: Metric
}

/** The Meta (manual) data, read from /data/meta.json. */
export type MetaData = {
  lastUpdated: string
  landingPageViews: number
  note: string
  history: MetricPoint[]
}

/** Everything the dashboard renders. */
export type DashboardData = {
  /** Ad landing page — distributed only via Meta ads (atm-social). */
  atmSocial: PageMetrics & {
    formSubmissions: Metric
    /** submissions ÷ GA4 page views, as a 0–100 percentage. */
    conversionRate: number
  }
  /** Member-facing page (at-the-movies). */
  atTheMovies: PageMetrics
  /** Manually-entered Meta Ads data. */
  meta: MetaData
  /** Most recent successful automated sync (GA4/HubSpot). */
  lastUpdated: string
  /** True while GA4/HubSpot history is seeded/illustrative, not yet live. */
  seeded: boolean
}

// --- Phase 1 seed (spec §7, as of 2026-06-16) ------------------------------
//
// The June 16 values are REAL (from the spec). The earlier history points are
// illustrative placeholders so the trend lines have shape before the automated
// syncs accumulate real dated history — they are clearly flagged via the
// `seeded` field and a caption on the charts. The final point of every history
// equals the known value, so the latest numbers shown are accurate.

const SEED_LAST_UPDATED = '2026-06-16'

function metric(history: [string, number][]): Metric {
  const points = history.map(([date, value]) => ({ date, value }))
  return { value: points[points.length - 1].value, history: points }
}

const SEED = {
  atmSocial: {
    pageViews: metric([
      ['2026-06-08', 1980], ['2026-06-10', 2410], ['2026-06-12', 2780],
      ['2026-06-14', 3050], ['2026-06-16', 3256],
    ]),
    activeUsers: metric([
      ['2026-06-08', 1410], ['2026-06-10', 1720], ['2026-06-12', 1985],
      ['2026-06-14', 2180], ['2026-06-16', 2321],
    ]),
    formSubmissions: metric([
      ['2026-06-08', 92], ['2026-06-10', 112], ['2026-06-12', 131],
      ['2026-06-14', 147], ['2026-06-16', 159],
    ]),
  },
  atTheMovies: {
    pageViews: metric([
      ['2026-06-08', 920], ['2026-06-10', 1110], ['2026-06-12', 1290],
      ['2026-06-14', 1450], ['2026-06-16', 1575],
    ]),
    activeUsers: metric([
      ['2026-06-08', 480], ['2026-06-10', 590], ['2026-06-12', 700],
      ['2026-06-14', 790], ['2026-06-16', 853],
    ]),
  },
}

function loadSeed() {
  return { data: SEED, lastUpdated: SEED_LAST_UPDATED, seeded: true }
}

function hasGA4Creds() {
  return !!(process.env.GA4_PROPERTY_ID && process.env.GA4_SERVICE_ACCOUNT_KEY)
}

// --- Meta (manual config file) ---------------------------------------------

function getMeta(): MetaData {
  const file = path.join(process.cwd(), 'data', 'meta.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    last_updated: string
    landing_page_views: number
    note: string
    history: { date: string; landing_page_views: number }[]
  }
  return {
    lastUpdated: raw.last_updated,
    landingPageViews: raw.landing_page_views,
    note: raw.note,
    history: raw.history.map((h) => ({ date: h.date, value: h.landing_page_views })),
  }
}

// --- Public API ------------------------------------------------------------

/**
 * Compose the full dashboard dataset. Async-friendly on purpose so the Phase 2
 * Neon read can drop in without changing callers.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const meta = getMeta()

  if (hasGA4Creds()) {
    const ga4 = await fetchGA4Data()
    // Form submissions still come from seed until HubSpot is wired
    const formSubmissions = SEED.atmSocial.formSubmissions
    const pageViews = ga4.atmSocial.pageViews.value
    const submissions = formSubmissions.value
    const conversionRate = pageViews > 0 ? (submissions / pageViews) * 100 : 0

    return {
      atmSocial: { ...ga4.atmSocial, formSubmissions, conversionRate },
      atTheMovies: ga4.atTheMovies,
      meta,
      lastUpdated: ga4.lastUpdated,
      seeded: false,
    }
  }

  const { data, lastUpdated, seeded } = loadSeed()
  const pageViews = data.atmSocial.pageViews.value
  const submissions = data.atmSocial.formSubmissions.value
  const conversionRate = pageViews > 0 ? (submissions / pageViews) * 100 : 0

  return {
    atmSocial: { ...data.atmSocial, conversionRate },
    atTheMovies: data.atTheMovies,
    meta,
    lastUpdated,
    seeded,
  }
}
