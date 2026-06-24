import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { Metric, MetricPoint } from './data'
import { CHANNELS } from './channels'

function getClient() {
  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('GA4_SERVICE_ACCOUNT_KEY not set')
  return new BetaAnalyticsDataClient({ credentials: JSON.parse(keyJson) })
}

export type GA4PageMetrics = { pageViews: Metric; activeUsers: Metric }

export type GA4Result = {
  atmSocial: GA4PageMetrics
  atTheMovies: GA4PageMetrics
  channels: {
    podcast: GA4PageMetrics
    movieTheaters: GA4PageMetrics
    metaFollowupEmail: GA4PageMetrics
    eNews: GA4PageMetrics
    kidsNewsletter: GA4PageMetrics
    invite: GA4PageMetrics
    organicSocialLinktree: GA4PageMetrics
    organicSocialGroups: GA4PageMetrics
  }
  lastUpdated: string
}

const PAGE_KEYS = {
  atmSocial: 'atm-social',
  atTheMovies: 'at-the-movies',
} as const

// Derived from CHANNELS (channels.ts is the single source of truth for UTM values).
// utm_content is intentionally excluded — not yet part of GA4 query matching.
const UTM_CHANNELS: Record<string, { medium: string; source?: string }> = Object.fromEntries(
  Object.entries(CHANNELS)
    .filter(([, def]) => def.utmFilter)
    .map(([key, def]) => [key, { medium: def.utmFilter!.sessionMedium, source: def.utmFilter!.sessionSource }])
)

type ChannelKey = 'podcast' | 'movieTheaters' | 'metaFollowupEmail' | 'eNews' | 'kidsNewsletter' | 'invite' | 'organicSocialLinktree' | 'organicSocialGroups'

const pathFilter = (value: string) => ({
  filter: {
    fieldName: 'pagePath',
    stringFilter: { matchType: 'CONTAINS' as const, value },
  },
})

const campaignFilter = (value: string) => ({
  filter: {
    fieldName: 'sessionCampaignName',
    stringFilter: { matchType: 'EXACT' as const, value },
  },
})

export async function fetchGA4Data(startDate = '2026-06-10'): Promise<GA4Result> {
  const client = getClient()
  const property = `properties/${process.env.GA4_PROPERTY_ID}`

  const sharedFilter = {
    orGroup: {
      expressions: [pathFilter('atm-social'), pathFilter('at-the-movies')],
    },
  }

  // Four queries in parallel:
  //  [0] daily page+path breakdown (page-level history)
  //  [1] totals by page (accurate cumulative counts)
  //  [2] daily at-the-movies UTM breakdown (channel history)
  //  [3] totals at-the-movies UTM breakdown (accurate channel totals)
  const [dailyResp, totalsResp, utmDailyResp, utmTotalsResp] = await Promise.all([
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: sharedFilter,
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: sharedFilter,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'sessionMedium' }, { name: 'sessionSource' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: {
        andGroup: { expressions: [pathFilter('at-the-movies'), campaignFilter('atm_2026')] },
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'sessionMedium' }, { name: 'sessionSource' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: {
        andGroup: { expressions: [pathFilter('at-the-movies'), campaignFilter('atm_2026')] },
      },
    }),
  ])

  // ── Page-level history ───────────────────────────────────────────────────

  const history: Record<string, { date: string; pageViews: number; activeUsers: number }[]> = {
    atmSocial: [],
    atTheMovies: [],
  }

  for (const row of dailyResp[0].rows ?? []) {
    const raw = row.dimensionValues?.[0]?.value ?? ''
    const pagePath = row.dimensionValues?.[1]?.value ?? ''
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    const pageViews = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const activeUsers = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    if (pagePath.includes('atm-social')) {
      history.atmSocial.push({ date, pageViews, activeUsers })
    } else if (pagePath.includes('at-the-movies')) {
      history.atTheMovies.push({ date, pageViews, activeUsers })
    }
  }

  const totals: Record<string, { pageViews: number; activeUsers: number }> = {
    atmSocial: { pageViews: 0, activeUsers: 0 },
    atTheMovies: { pageViews: 0, activeUsers: 0 },
  }

  for (const row of totalsResp[0].rows ?? []) {
    const pagePath = row.dimensionValues?.[0]?.value ?? ''
    const pageViews = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const activeUsers = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    if (pagePath.includes('atm-social')) {
      totals.atmSocial.pageViews += pageViews
      totals.atmSocial.activeUsers += activeUsers
    } else if (pagePath.includes('at-the-movies')) {
      totals.atTheMovies.pageViews += pageViews
      totals.atTheMovies.activeUsers += activeUsers
    }
  }

  function buildMetric(
    page: keyof typeof PAGE_KEYS,
    metric: 'pageViews' | 'activeUsers'
  ): Metric {
    const hist: MetricPoint[] = history[page].map((h) => ({ date: h.date, value: h[metric] }))
    return { value: totals[page][metric], history: hist }
  }

  // ── UTM channel history ──────────────────────────────────────────────────

  const utmHistory: Record<ChannelKey, { date: string; pageViews: number; activeUsers: number }[]> = {
    podcast: [], movieTheaters: [], metaFollowupEmail: [], eNews: [], kidsNewsletter: [], invite: [], organicSocialLinktree: [], organicSocialGroups: [],
  }
  const utmTotals: Record<ChannelKey, { pageViews: number; activeUsers: number }> = {
    podcast:               { pageViews: 0, activeUsers: 0 },
    movieTheaters:         { pageViews: 0, activeUsers: 0 },
    metaFollowupEmail:     { pageViews: 0, activeUsers: 0 },
    eNews:                 { pageViews: 0, activeUsers: 0 },
    kidsNewsletter:        { pageViews: 0, activeUsers: 0 },
    invite:                { pageViews: 0, activeUsers: 0 },
    organicSocialLinktree: { pageViews: 0, activeUsers: 0 },
    organicSocialGroups:   { pageViews: 0, activeUsers: 0 },
  }

  for (const row of utmDailyResp[0].rows ?? []) {
    const raw = row.dimensionValues?.[0]?.value ?? ''
    const medium = row.dimensionValues?.[1]?.value ?? ''
    const source = row.dimensionValues?.[2]?.value ?? ''
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    const pageViews = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const activeUsers = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    for (const [key, filter] of Object.entries(UTM_CHANNELS) as [ChannelKey, { medium: string; source?: string }][]) {
      if (medium === filter.medium && (filter.source === undefined || source === filter.source)) {
        utmHistory[key].push({ date, pageViews, activeUsers })
      }
    }
  }

  for (const row of utmTotalsResp[0].rows ?? []) {
    const medium = row.dimensionValues?.[0]?.value ?? ''
    const source = row.dimensionValues?.[1]?.value ?? ''
    const pageViews = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const activeUsers = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    for (const [key, filter] of Object.entries(UTM_CHANNELS) as [ChannelKey, { medium: string; source?: string }][]) {
      if (medium === filter.medium && (filter.source === undefined || source === filter.source)) {
        utmTotals[key].pageViews += pageViews
        utmTotals[key].activeUsers += activeUsers
      }
    }
  }

  function buildChannelMetric(key: ChannelKey, metric: 'pageViews' | 'activeUsers'): Metric {
    const hist: MetricPoint[] = utmHistory[key].map(h => ({ date: h.date, value: h[metric] }))
    return { value: utmTotals[key][metric], history: hist }
  }

  return {
    atmSocial: {
      pageViews: buildMetric('atmSocial', 'pageViews'),
      activeUsers: buildMetric('atmSocial', 'activeUsers'),
    },
    atTheMovies: {
      pageViews: buildMetric('atTheMovies', 'pageViews'),
      activeUsers: buildMetric('atTheMovies', 'activeUsers'),
    },
    channels: {
      podcast:               { pageViews: buildChannelMetric('podcast', 'pageViews'),               activeUsers: buildChannelMetric('podcast', 'activeUsers') },
      movieTheaters:         { pageViews: buildChannelMetric('movieTheaters', 'pageViews'),         activeUsers: buildChannelMetric('movieTheaters', 'activeUsers') },
      metaFollowupEmail:     { pageViews: buildChannelMetric('metaFollowupEmail', 'pageViews'),     activeUsers: buildChannelMetric('metaFollowupEmail', 'activeUsers') },
      eNews:                 { pageViews: buildChannelMetric('eNews', 'pageViews'),                 activeUsers: buildChannelMetric('eNews', 'activeUsers') },
      kidsNewsletter:        { pageViews: buildChannelMetric('kidsNewsletter', 'pageViews'),        activeUsers: buildChannelMetric('kidsNewsletter', 'activeUsers') },
      invite:                { pageViews: buildChannelMetric('invite', 'pageViews'),                activeUsers: buildChannelMetric('invite', 'activeUsers') },
      organicSocialLinktree: { pageViews: buildChannelMetric('organicSocialLinktree', 'pageViews'), activeUsers: buildChannelMetric('organicSocialLinktree', 'activeUsers') },
      organicSocialGroups:   { pageViews: buildChannelMetric('organicSocialGroups', 'pageViews'),   activeUsers: buildChannelMetric('organicSocialGroups', 'activeUsers') },
    },
    lastUpdated: new Date().toISOString().split('T')[0],
  }
}
