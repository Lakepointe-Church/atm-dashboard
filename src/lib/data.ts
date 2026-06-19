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
import { fetchHubspotSubmissionCount } from './hubspot'
import { getHistory } from './db'

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

/** One ad creative's lifetime stats, from Meta Ads Manager. */
export type MetaCreative = {
  id: string
  name: string
  status: 'active' | 'off'
  utmContent: string | null
  impressions: number | null
  outboundClicks: number | null
  landingPageViews: number | null
  amountSpent: number | null
  costPerLpv: number | null
}

/** The Meta (manual) data, read from /data/meta.json. */
export type MetaData = {
  lastUpdated: string
  landingPageViews: number
  totalAmountSpent: number | null
  note: string
  history: MetricPoint[]
  creatives: MetaCreative[]
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

// --- HubSpot (manual config file until Private App access is approved) -----

async function getHubspot(): Promise<Metric> {
  const file = path.join(process.cwd(), 'data', 'hubspot.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    form_submissions: number
    history: { date: string; form_submissions: number }[]
  }
  const history = raw.history.map((h) => ({ date: h.date, value: h.form_submissions }))

  if (process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    try {
      const liveTotal = await fetchHubspotSubmissionCount()
      return { value: liveTotal, history }
    } catch (err) {
      console.error('[HubSpot] falling back to hubspot.json:', err)
    }
  }

  return { value: raw.form_submissions, history }
}

// --- Meta (manual config file) ---------------------------------------------

function getMeta(): MetaData {
  const file = path.join(process.cwd(), 'data', 'meta.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    last_updated: string
    landing_page_views: number
    total_amount_spent?: number
    note: string
    history: { date: string; landing_page_views: number }[]
    creatives?: {
      id: string
      name: string
      status: 'active' | 'off'
      utm_content: string | null
      impressions: number | null
      outbound_clicks: number | null
      landing_page_views: number | null
      amount_spent: number | null
      cost_per_lpv: number | null
    }[]
  }
  return {
    lastUpdated: raw.last_updated,
    landingPageViews: raw.landing_page_views,
    totalAmountSpent: raw.total_amount_spent ?? null,
    note: raw.note,
    history: raw.history.map((h) => ({ date: h.date, value: h.landing_page_views })),
    creatives: (raw.creatives ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      utmContent: c.utm_content,
      impressions: c.impressions,
      outboundClicks: c.outbound_clicks,
      landingPageViews: c.landing_page_views,
      amountSpent: c.amount_spent,
      costPerLpv: c.cost_per_lpv,
    })),
  }
}

// --- Neon history ----------------------------------------------------------

function buildMetricFromRows(
  rows: { date: string; value: number }[],
  liveValue: number
): Metric {
  return { value: liveValue, history: rows.map(r => ({ date: r.date, value: r.value })) }
}

// Merge GA4 daily history (full range) with Neon snapshots (recent only).
// Neon wins on dates where both have data; GA4 fills the gaps.
function mergeHistory(ga4: MetricPoint[], neon: MetricPoint[]): MetricPoint[] {
  const neonMap = new Map(neon.map(p => [p.date, p.value]))
  const merged = ga4.map(p => ({ date: p.date, value: neonMap.get(p.date) ?? p.value }))
  const ga4Dates = new Set(ga4.map(p => p.date))
  for (const p of neon) {
    if (!ga4Dates.has(p.date)) merged.push(p)
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date))
}

async function loadNeonHistory(): Promise<{
  atmSocial: { pageViews: MetricPoint[]; activeUsers: MetricPoint[]; formSubmissions: MetricPoint[] }
  atTheMovies: { pageViews: MetricPoint[]; activeUsers: MetricPoint[] }
  lastUpdated: string
} | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const rows = await getHistory()
    if (rows.length === 0) return null

    const byMetric: Record<string, MetricPoint[]> = {}
    for (const r of rows) {
      if (!byMetric[r.metric]) byMetric[r.metric] = []
      byMetric[r.metric].push({ date: r.date, value: r.value })
    }

    const lastUpdated = rows[rows.length - 1].date
    return {
      atmSocial: {
        pageViews:       byMetric['atm_social_page_views']      ?? [],
        activeUsers:     byMetric['atm_social_active_users']    ?? [],
        formSubmissions: byMetric['form_submissions']           ?? [],
      },
      atTheMovies: {
        pageViews:   byMetric['at_the_movies_page_views']   ?? [],
        activeUsers: byMetric['at_the_movies_active_users'] ?? [],
      },
      lastUpdated,
    }
  } catch (err) {
    console.error('[Neon] history load failed, falling back:', err)
    return null
  }
}

// --- Public API ------------------------------------------------------------

export async function getDashboardData(): Promise<DashboardData> {
  const meta = getMeta()

  if (hasGA4Creds()) {
    const [ga4, formSubmissions, neon] = await Promise.all([
      fetchGA4Data(),
      getHubspot(),
      loadNeonHistory(),
    ])

    // Merge GA4 daily history (full date range) with Neon snapshots (June 19+).
    // GA4 always provides the complete history; Neon overrides on dates it has synced.
    const atmSocial = {
      pageViews:       buildMetricFromRows(neon ? mergeHistory(ga4.atmSocial.pageViews.history,       neon.atmSocial.pageViews)       : ga4.atmSocial.pageViews.history,       ga4.atmSocial.pageViews.value),
      activeUsers:     buildMetricFromRows(neon ? mergeHistory(ga4.atmSocial.activeUsers.history,     neon.atmSocial.activeUsers)     : ga4.atmSocial.activeUsers.history,     ga4.atmSocial.activeUsers.value),
      formSubmissions: buildMetricFromRows(neon ? mergeHistory(formSubmissions.history,               neon.atmSocial.formSubmissions) : formSubmissions.history,               formSubmissions.value),
    }
    const atTheMovies = {
      pageViews:   buildMetricFromRows(neon ? mergeHistory(ga4.atTheMovies.pageViews.history,   neon.atTheMovies.pageViews)   : ga4.atTheMovies.pageViews.history,   ga4.atTheMovies.pageViews.value),
      activeUsers: buildMetricFromRows(neon ? mergeHistory(ga4.atTheMovies.activeUsers.history, neon.atTheMovies.activeUsers) : ga4.atTheMovies.activeUsers.history, ga4.atTheMovies.activeUsers.value),
    }

    const pageViews = atmSocial.pageViews.value
    const submissions = atmSocial.formSubmissions.value
    const conversionRate = pageViews > 0 ? (submissions / pageViews) * 100 : 0

    return {
      atmSocial: { ...atmSocial, conversionRate },
      atTheMovies,
      meta,
      lastUpdated: neon?.lastUpdated ?? ga4.lastUpdated,
      seeded: false,
    }
  }

  const { data, lastUpdated, seeded } = loadSeed()
  const formSubmissions = await getHubspot()
  const pageViews = data.atmSocial.pageViews.value
  const submissions = formSubmissions.value
  const conversionRate = pageViews > 0 ? (submissions / pageViews) * 100 : 0

  return {
    atmSocial: { ...data.atmSocial, formSubmissions, conversionRate },
    atTheMovies: data.atTheMovies,
    meta,
    lastUpdated,
    seeded,
  }
}
