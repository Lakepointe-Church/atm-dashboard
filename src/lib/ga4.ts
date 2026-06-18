import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { Metric, MetricPoint } from './data'

function getClient() {
  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('GA4_SERVICE_ACCOUNT_KEY not set')
  return new BetaAnalyticsDataClient({ credentials: JSON.parse(keyJson) })
}

export type GA4PageMetrics = { pageViews: Metric; activeUsers: Metric }
export type GA4Result = {
  atmSocial: GA4PageMetrics
  atTheMovies: GA4PageMetrics
  lastUpdated: string
}

const PAGE_KEYS = {
  atmSocial: 'atm-social',
  atTheMovies: 'at-the-movies',
} as const

const pathFilter = (value: string) => ({
  filter: {
    fieldName: 'pagePath',
    stringFilter: { matchType: 'CONTAINS' as const, value },
  },
})

export async function fetchGA4Data(startDate = '2026-06-01'): Promise<GA4Result> {
  const client = getClient()
  const property = `properties/${process.env.GA4_PROPERTY_ID}`

  const sharedFilter = {
    orGroup: {
      expressions: [pathFilter('atm-social'), pathFilter('at-the-movies')],
    },
  }

  // Two queries in parallel: daily breakdown for history + totals for accurate unique counts
  const [dailyResp, totalsResp] = await Promise.all([
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
  ])

  // Daily rows → per-page history arrays
  const history: Record<string, { date: string; pageViews: number; activeUsers: number }[]> = {
    atmSocial: [],
    atTheMovies: [],
  }

  for (const row of dailyResp[0].rows ?? []) {
    const raw = row.dimensionValues?.[0]?.value ?? ''
    const pagePath = row.dimensionValues?.[1]?.value ?? ''
    // GA4 date format: YYYYMMDD → YYYY-MM-DD
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    const pageViews = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const activeUsers = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    if (pagePath.includes('atm-social')) {
      history.atmSocial.push({ date, pageViews, activeUsers })
    } else if (pagePath.includes('at-the-movies')) {
      history.atTheMovies.push({ date, pageViews, activeUsers })
    }
  }

  // Total rows → accurate cumulative values
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

  return {
    atmSocial: {
      pageViews: buildMetric('atmSocial', 'pageViews'),
      activeUsers: buildMetric('atmSocial', 'activeUsers'),
    },
    atTheMovies: {
      pageViews: buildMetric('atTheMovies', 'pageViews'),
      activeUsers: buildMetric('atTheMovies', 'activeUsers'),
    },
    lastUpdated: new Date().toISOString().split('T')[0],
  }
}
