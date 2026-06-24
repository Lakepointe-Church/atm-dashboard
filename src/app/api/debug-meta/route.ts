import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID
  if (!token || !accountId) return NextResponse.json({ error: 'Meta creds not set' }, { status: 500 })

  const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

  const insightsRes = await fetch(`${GRAPH_BASE}/act_${accountId}/insights?${new URLSearchParams({
    access_token: token,
    fields: 'ad_id,ad_name',
    level: 'ad',
    date_preset: 'maximum',
    filtering: JSON.stringify([{ field: 'campaign.name', operator: 'CONTAIN', value: 'ATM 2026' }]),
    limit: '100',
  })}`)
  const insightsJson = await insightsRes.json() as { data?: { ad_id: string; ad_name: string }[]; error?: unknown }
  if (insightsJson.error) return NextResponse.json({ error: insightsJson.error }, { status: 500 })

  const adIds = (insightsJson.data ?? []).map(r => r.ad_id)
  const adNames = Object.fromEntries((insightsJson.data ?? []).map(r => [r.ad_id, r.ad_name]))

  const batchRes = await fetch(
    `${GRAPH_BASE}/?ids=${adIds.join(',')}&fields=creative{effective_object_story_id,template_url,object_type,asset_feed_spec,product_set_id}&access_token=${token}`
  )
  const batchJson = await batchRes.json() as Record<string, { creative?: Record<string, unknown> }>

  const result = Object.fromEntries(
    Object.entries(batchJson).map(([adId, data]) => [
      `${adNames[adId] ?? adId} (${adId})`,
      data.creative,
    ])
  )

  return NextResponse.json(result)
}
