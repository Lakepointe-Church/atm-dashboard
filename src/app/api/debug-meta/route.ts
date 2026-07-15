import { NextResponse } from 'next/server'
import { metaTimeRange, resolveCampaignFilter } from '@/lib/meta'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID
  if (!token || !accountId) return NextResponse.json({ error: 'Meta creds not set' }, { status: 500 })

  const campaignFilter = await resolveCampaignFilter()
  const timeRange = metaTimeRange()

  const url = `${GRAPH_BASE}/act_${accountId}/insights?${new URLSearchParams({
    access_token: token,
    fields: 'ad_id,ad_name,impressions,reach',
    level: 'ad',
    time_range: timeRange,
    filtering: campaignFilter,
    limit: '500',
  })}`

  // Campaign-level window totals (reach here is de-duplicated across ads).
  const totalsUrl = `${GRAPH_BASE}/act_${accountId}/insights?${new URLSearchParams({
    access_token: token,
    fields: 'impressions,reach',
    time_range: timeRange,
    filtering: campaignFilter,
  })}`

  const [res, totalsRes] = await Promise.all([fetch(url), fetch(totalsUrl)])
  const json = await res.json() as { data?: { ad_id: string; ad_name: string }[]; error?: { message: string } }
  const totalsJson = await totalsRes.json() as { data?: unknown[]; error?: { message: string } }

  if (json.error) return NextResponse.json({ error: json.error.message }, { status: 500 })

  return NextResponse.json({ totals: totalsJson.data ?? totalsJson.error ?? [], ads: json.data ?? [] })
}
