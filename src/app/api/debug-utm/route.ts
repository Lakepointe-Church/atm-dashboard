import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY
  if (!keyJson) return NextResponse.json({ error: 'GA4_SERVICE_ACCOUNT_KEY not set' }, { status: 500 })

  const client = new BetaAnalyticsDataClient({ credentials: JSON.parse(keyJson) })
  const property = `properties/${process.env.GA4_PROPERTY_ID}`

  const [totalsResp, dailyResp] = await Promise.all([
    client.runReport({
      property,
      dateRanges: [{ startDate: '2026-06-10', endDate: 'today' }],
      dimensions: [{ name: 'sessionMedium' }, { name: 'sessionSource' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: {
        filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: 'at-the-movies' } },
      },
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '2026-06-10', endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'sessionMedium' }, { name: 'sessionSource' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      dimensionFilter: {
        filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: 'at-the-movies' } },
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  ])

  const totals = (totalsResp[0].rows ?? []).map(r => ({
    medium: r.dimensionValues?.[0]?.value,
    source: r.dimensionValues?.[1]?.value,
    pageViews: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
    activeUsers: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
  }))

  const daily = (dailyResp[0].rows ?? []).map(r => {
    const raw = r.dimensionValues?.[0]?.value ?? ''
    return {
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      medium: r.dimensionValues?.[1]?.value,
      source: r.dimensionValues?.[2]?.value,
      pageViews: parseInt(r.metricValues?.[0]?.value ?? '0', 10),
      activeUsers: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
    }
  })

  const channels = {
    podcast:               { medium: 'podcast',         source: 'youtube'  },
    movieTheaters:         { medium: 'theaters',        source: 'video'    },
    metaFollowupEmail:     { medium: 'email',           source: undefined  },
    eNews:                 { medium: 'e_news',          source: 'email'    },
    kidsNewsletter:        { medium: 'kids_newsletter', source: 'email'    },
    invite:                { medium: 'stand_alone_1',   source: 'email'    },
    organicSocialLinktree: { medium: 'organic_social',  source: 'social'   },
    organicSocialGroups:   { medium: 'organic_social',  source: 'groups'   },
  }

  const matched: Record<string, { pageViews: number; activeUsers: number }> = {}
  for (const [key, filter] of Object.entries(channels)) {
    const rows = totals.filter(r =>
      r.medium === filter.medium && (filter.source === undefined || r.source === filter.source)
    )
    matched[key] = {
      pageViews: rows.reduce((s, r) => s + r.pageViews, 0),
      activeUsers: rows.reduce((s, r) => s + r.activeUsers, 0),
    }
  }

  return NextResponse.json({ totals, daily, matched }, { status: 200 })
}
