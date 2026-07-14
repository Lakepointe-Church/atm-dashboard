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
import { hasMetaCreds, fetchMetaData } from './meta'
import { hasTiktokCreds, fetchTiktokData } from './tiktok'
import { fetchRockSmsData, type SmsData } from './rock'

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
  adsetName: string | null
  status: 'active' | 'off'
  utmContent: string | null
  permalink: string | null
  impressions: number | null
  /** Lifetime unique people reached by this ad. null when unavailable (fallback). */
  reach: number | null
  outboundClicks: number | null
  landingPageViews: number | null
  leads: number | null
  amountSpent: number | null
  costPerLpv: number | null
  costPerLead: number | null
  /** 3-second video plays (actions[].video_view). null when unavailable (fallback). */
  videoPlays3s: number | null
}

/** The Meta (manual) data, read from /data/meta.json. */
export type MetaData = {
  lastUpdated: string
  landingPageViews: number
  totalAmountSpent: number | null
  /**
   * Total 3-second video plays across all ATM ads (Meta actions[].video_view).
   * null = live API pull failed / creds absent (fell back to meta.json, which
   * has no video data) → card renders awaiting, never 0. A real 0 is a number.
   */
  videoPlays3s: number | null
  /**
   * Campaign-wide unique people reached (de-duplicated by Meta — NOT the sum of
   * per-ad reach, which double-counts people who saw multiple ads). null =
   * fallback/awaiting, never rendered as 0.
   */
  reach: number | null
  note: string
  history: MetricPoint[]
  creatives: MetaCreative[]
}

/**
 * One TikTok ad's lifetime stats, from the TikTok Marketing API v1.3 integrated
 * report. Keyed on ad_id (Smart+ replicates the same creative across ad groups,
 * so ad_name can repeat — ad_id is the unique row key). null = metric absent
 * (awaiting); a stored 0 is a confirmed real zero.
 */
export type TiktokCreative = {
  id: string                    // ad_id
  name: string                  // ad_name
  adgroupName: string | null    // adgroup_name (Meta's "Ad Set" analog)
  impressions: number | null
  clicks: number | null
  landingPageViews: number | null   // total_landing_page_view
  amountSpent: number | null        // spend
  costPerLpv: number | null         // derived spend ÷ LPV; null if LPV 0/absent
  videoViews: number | null         // video_play_actions
  videoViews6s: number | null       // video_watched_6s
  videoViewsP100: number | null     // video_views_p100
}

/**
 * TikTok Ads data (live from TikTok Marketing API v1.3). Platform-native only —
 * no GA4/HubSpot numbers here. `conversion`/`cost_per_conversion` are
 * deliberately NOT surfaced (pixel-event optimization artifact, not a lead
 * count — see Gate A decisions). null TiktokData = pull failed / creds absent →
 * section renders "awaiting data".
 */
export type TiktokData = {
  lastUpdated: string
  spend: number
  impressions: number
  clicks: number
  landingPageViews: number
  videoViews: number            // video_play_actions
  videoViews6s: number          // video_watched_6s
  videoViewsP100: number        // video_views_p100
  history: MetricPoint[]        // cumulative landing page views by day
  creatives: TiktokCreative[]
  note: string
}

/** Campaign-wide totals for the summary strip. */
export type SummaryData = {
  totalPageViews: number
  totalFormSubmissions: number
  totalMetaSpend: number | null
}

/** GA4 page views + active users for a single UTM-filtered channel. */
export type ChannelMetrics = { pageViews: Metric; activeUsers: Metric }

/** Everything the dashboard renders. */
export type DashboardData = {
  /** Campaign-wide at-a-glance totals (all channels combined). */
  summary: SummaryData
  /** Member-facing page (at-the-movies) — direct/organic member traffic. */
  churchFacing: PageMetrics
  /** Ad landing page (atm-social) — Meta Ad channel. */
  metaAd: PageMetrics & {
    formSubmissions: Metric
    /** submissions ÷ GA4 page views, as a 0–100 percentage. */
    conversionRate: number
    /** total Meta spend ÷ HubSpot submissions; null until both are available. */
    costPerLead: number | null
  }
  /** UTM-filtered slices of the at-the-movies page, one per campaign channel. */
  utmChannels: {
    podcast: ChannelMetrics
    movieTheaters: ChannelMetrics
    metaFollowupEmail: ChannelMetrics
    eNews: ChannelMetrics
    kidsNewsletter: ChannelMetrics
    invite: ChannelMetrics
    organicSocialLinktree: ChannelMetrics
    organicSocialGroups: ChannelMetrics
  }
  /** Meta Ads data (live API or fallback meta.json). */
  meta: MetaData
  /** TikTok Ads data (live API). null = fetch failed or creds absent → awaiting. */
  tiktok: TiktokData | null
  /** SMS keyword counts from Rock CTA Keyword report. null = fetch failed or token absent. */
  sms: SmsData | null
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
      ['2026-06-10', 2410], ['2026-06-12', 2780],
      ['2026-06-14', 3050], ['2026-06-16', 3256],
    ]),
    activeUsers: metric([
      ['2026-06-10', 1720], ['2026-06-12', 1985],
      ['2026-06-14', 2180], ['2026-06-16', 2321],
    ]),
    formSubmissions: metric([
      ['2026-06-10', 112], ['2026-06-12', 131],
      ['2026-06-14', 147], ['2026-06-16', 159],
    ]),
  },
  atTheMovies: {
    pageViews: metric([
      ['2026-06-10', 1110], ['2026-06-12', 1290],
      ['2026-06-14', 1450], ['2026-06-16', 1575],
    ]),
    activeUsers: metric([
      ['2026-06-10', 590], ['2026-06-12', 700],
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

// --- Meta (live API when creds available, else committed meta.json) ---------

async function getMeta(): Promise<MetaData> {
  if (hasMetaCreds()) {
    try {
      return await fetchMetaData()
    } catch (err) {
      console.error('[Meta] API fetch failed, falling back to meta.json:', err)
    }
  }

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
    // meta.json has no video or reach data — awaiting, not a real 0.
    videoPlays3s: null,
    reach: null,
    note: raw.note,
    history: raw.history.map((h) => ({ date: h.date, value: h.landing_page_views })),
    creatives: (raw.creatives ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      adsetName: null,
      status: c.status,
      utmContent: c.utm_content,
      permalink: null,
      impressions: c.impressions,
      reach: null,
      outboundClicks: c.outbound_clicks,
      landingPageViews: c.landing_page_views,
      leads: null,
      amountSpent: c.amount_spent,
      costPerLpv: c.cost_per_lpv,
      costPerLead: null,
      videoPlays3s: null,
    })),
  }
}

// --- TikTok (live API; null when creds absent or the pull fails) ------------

async function getTiktok(): Promise<TiktokData | null> {
  if (!hasTiktokCreds()) return null
  try {
    return await fetchTiktokData()
  } catch (err) {
    // Loud, but non-fatal to the page: a failed pull renders as "awaiting data",
    // never as zeros. The thrown error carries message + request_id.
    console.error('[TikTok] API fetch failed, rendering awaiting state:', err)
    return null
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

type NeonChannelPoints = { pageViews: MetricPoint[]; activeUsers: MetricPoint[] }

async function loadNeonHistory(): Promise<{
  atmSocial: { pageViews: MetricPoint[]; activeUsers: MetricPoint[]; formSubmissions: MetricPoint[] }
  atTheMovies: { pageViews: MetricPoint[]; activeUsers: MetricPoint[] }
  channels: {
    podcast: NeonChannelPoints
    movieTheaters: NeonChannelPoints
    metaFollowupEmail: NeonChannelPoints
    eNews: NeonChannelPoints
    kidsNewsletter: NeonChannelPoints
    invite: NeonChannelPoints
    organicSocialLinktree: NeonChannelPoints
    organicSocialGroups: NeonChannelPoints
  }
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

    const ch = (pvKey: string, auKey: string): NeonChannelPoints => ({
      pageViews:   byMetric[pvKey] ?? [],
      activeUsers: byMetric[auKey] ?? [],
    })

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
      channels: {
        podcast:               ch('podcast_page_views',                 'podcast_active_users'),
        movieTheaters:         ch('movie_theaters_page_views',          'movie_theaters_active_users'),
        metaFollowupEmail:     ch('meta_followup_email_page_views',     'meta_followup_email_active_users'),
        eNews:                 ch('e_news_page_views',                  'e_news_active_users'),
        kidsNewsletter:        ch('kids_newsletter_page_views',         'kids_newsletter_active_users'),
        invite:                ch('invite_page_views',                  'invite_active_users'),
        organicSocialLinktree: ch('organic_social_linktree_page_views', 'organic_social_linktree_active_users'),
        organicSocialGroups:   ch('organic_social_groups_page_views',   'organic_social_groups_active_users'),
      },
      lastUpdated,
    }
  } catch (err) {
    console.error('[Neon] history load failed, falling back:', err)
    return null
  }
}

function buildChannel(
  ga4: ChannelMetrics,
  neon: NeonChannelPoints | null
): ChannelMetrics {
  return {
    pageViews:   buildMetricFromRows(neon ? mergeHistory(ga4.pageViews.history,   neon.pageViews)   : ga4.pageViews.history,   ga4.pageViews.value),
    activeUsers: buildMetricFromRows(neon ? mergeHistory(ga4.activeUsers.history, neon.activeUsers) : ga4.activeUsers.history, ga4.activeUsers.value),
  }
}

function buildUtmChannels(
  g: { podcast: ChannelMetrics; movieTheaters: ChannelMetrics; metaFollowupEmail: ChannelMetrics; eNews: ChannelMetrics; kidsNewsletter: ChannelMetrics; invite: ChannelMetrics; organicSocialLinktree: ChannelMetrics; organicSocialGroups: ChannelMetrics },
  n: { podcast: NeonChannelPoints; movieTheaters: NeonChannelPoints; metaFollowupEmail: NeonChannelPoints; eNews: NeonChannelPoints; kidsNewsletter: NeonChannelPoints; invite: NeonChannelPoints; organicSocialLinktree: NeonChannelPoints; organicSocialGroups: NeonChannelPoints } | null
) {
  return {
    podcast:               buildChannel(g.podcast,               n?.podcast               ?? null),
    movieTheaters:         buildChannel(g.movieTheaters,         n?.movieTheaters         ?? null),
    metaFollowupEmail:     buildChannel(g.metaFollowupEmail,     n?.metaFollowupEmail     ?? null),
    eNews:                 buildChannel(g.eNews,                 n?.eNews                 ?? null),
    kidsNewsletter:        buildChannel(g.kidsNewsletter,        n?.kidsNewsletter        ?? null),
    invite:                buildChannel(g.invite,                n?.invite                ?? null),
    organicSocialLinktree: buildChannel(g.organicSocialLinktree, n?.organicSocialLinktree ?? null),
    organicSocialGroups:   buildChannel(g.organicSocialGroups,   n?.organicSocialGroups   ?? null),
  }
}

// --- Public API ------------------------------------------------------------

export async function getDashboardData(): Promise<DashboardData> {
  const [meta, tiktok] = await Promise.all([getMeta(), getTiktok()])

  if (hasGA4Creds()) {
    const [ga4, formSubmissions, neon, sms] = await Promise.all([
      fetchGA4Data(),
      getHubspot(),
      loadNeonHistory(),
      fetchRockSmsData().catch(err => { console.error(err); return null }),
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
    const costPerLead = meta.totalAmountSpent != null && submissions > 0
      ? meta.totalAmountSpent / submissions : null

    return {
      summary: {
        totalPageViews: atmSocial.pageViews.value + atTheMovies.pageViews.value,
        totalFormSubmissions: submissions,
        totalMetaSpend: meta.totalAmountSpent,
      },
      churchFacing: atTheMovies,
      metaAd: { ...atmSocial, conversionRate, costPerLead },
      utmChannels: buildUtmChannels(ga4.channels, neon?.channels ?? null),
      sms,
      meta,
      tiktok,
      lastUpdated: neon?.lastUpdated ?? ga4.lastUpdated,
      seeded: false,
    }
  }

  const { data, lastUpdated, seeded } = loadSeed()
  const [formSubmissions, sms] = await Promise.all([
    getHubspot(),
    fetchRockSmsData().catch(err => { console.error(err); return null }),
  ])
  const pageViews = data.atmSocial.pageViews.value
  const submissions = formSubmissions.value
  const conversionRate = pageViews > 0 ? (submissions / pageViews) * 100 : 0
  const costPerLead = meta.totalAmountSpent != null && submissions > 0
    ? meta.totalAmountSpent / submissions : null

  const emptyMetric = (): Metric => ({ value: 0, history: [] })
  const emptyChannel = (): ChannelMetrics => ({ pageViews: emptyMetric(), activeUsers: emptyMetric() })

  return {
    summary: {
      totalPageViews: data.atmSocial.pageViews.value + data.atTheMovies.pageViews.value,
      totalFormSubmissions: submissions,
      totalMetaSpend: meta.totalAmountSpent,
    },
    churchFacing: data.atTheMovies,
    metaAd: { ...data.atmSocial, formSubmissions, conversionRate, costPerLead },
    utmChannels: {
      podcast: emptyChannel(),
      movieTheaters: emptyChannel(),
      metaFollowupEmail: emptyChannel(),
      eNews: emptyChannel(),
      kidsNewsletter: emptyChannel(),
      invite: emptyChannel(),
      organicSocialLinktree: emptyChannel(),
      organicSocialGroups: emptyChannel(),
    },
    sms,
    meta,
    tiktok,
    lastUpdated,
    seeded,
  }
}
