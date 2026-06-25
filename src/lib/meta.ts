import type { MetaData, MetaCreative, MetricPoint } from './data'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

// Manually confirmed post URLs — these override whatever the API resolves.
const PERMALINK_OVERRIDES: Record<string, string> = {
  'Ad 1 - IMG 1': 'https://www.facebook.com/permalink.php?story_fbid=1453154153524816&id=142188242493004',
  'Ad 2 - IMG 2': 'https://www.facebook.com/100064907341239/posts/1453154153524816/',
  'Ad 3 - IMG 3': 'https://www.facebook.com/100064907341239/posts/1449610037212561/',
  'Ad 4 - VID 1': 'https://www.facebook.com/100064907341239/posts/1453213133518918/',
  'Ad 6 - VID 2': 'https://www.facebook.com/100064907341239/posts/1453154326858132/',
  'Ad 7 - VID 3': 'https://www.facebook.com/100064907341239/posts/1453851853455046/',
}

export function hasMetaCreds(): boolean {
  return !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID)
}

interface RawRow {
  impressions?: string
  spend?: string
  outbound_clicks?: { action_type: string; value: string }[]
  actions?: { action_type: string; value: string }[]
  date_start?: string
  ad_id?: string
  ad_name?: string
  adset_name?: string
}

function findAction(
  arr: { action_type: string; value: string }[] | undefined,
  type: string
): number {
  if (!arr) return 0
  const hit = arr.find(a => a.action_type === type)
  return hit ? Math.round(parseFloat(hit.value)) : 0
}

async function queryInsights(extraParams: Record<string, string>): Promise<RawRow[]> {
  const token = process.env.META_ACCESS_TOKEN!
  const accountId = process.env.META_AD_ACCOUNT_ID!
  const rows: RawRow[] = []

  let url: string | null = `${GRAPH_BASE}/act_${accountId}/insights?${new URLSearchParams({
    access_token: token,
    limit: '500',
    ...extraParams,
  })}`

  while (url) {
    const res = await fetch(url)
    const json = (await res.json()) as {
      data?: RawRow[]
      error?: { message: string; code: number }
      paging?: { next?: string }
    }
    if (json.error) throw new Error(`Meta API (${json.error.code}): ${json.error.message}`)
    rows.push(...(json.data ?? []))
    url = json.paging?.next ?? null
  }

  return rows
}

async function fetchPermalinks(adIds: string[], accountId: string): Promise<Record<string, string>> {
  if (!adIds.length) return {}
  const token = process.env.META_ACCESS_TOKEN!
  // VIDEO type has a real post permalink. SHARE type (Advantage+ PLACEMENT format)
  // uses a template dark post — fall back to Ads Manager URL instead.
  const url = `${GRAPH_BASE}/?ids=${adIds.join(',')}&fields=creative{effective_object_story_id,object_type}&access_token=${token}`
  const amsBase = `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_ids=`
  try {
    const res = await fetch(url)
    const json = await res.json() as Record<string, {
      creative?: { effective_object_story_id?: string; object_type?: string }
    }>
    const out: Record<string, string> = {}
    for (const [adId, data] of Object.entries(json)) {
      if (data.creative?.object_type === 'VIDEO') {
        const storyId = data.creative?.effective_object_story_id
        if (storyId) {
          const idx = storyId.indexOf('_')
          if (idx !== -1) {
            const pageId = storyId.slice(0, idx)
            const postId = storyId.slice(idx + 1)
            out[adId] = `https://www.facebook.com/permalink.php?story_fbid=${postId}&id=${pageId}`
            continue
          }
        }
      }
      out[adId] = `${amsBase}${adId}`
    }
    return out
  } catch {
    return {}
  }
}

export async function fetchMetaData(): Promise<MetaData> {
  const campaignFilter = JSON.stringify([
    { field: 'campaign.name', operator: 'CONTAIN', value: 'ATM 2026' },
  ])

  const [dailyRows, adRows] = await Promise.all([
    queryInsights({
      fields: 'impressions,spend,actions,outbound_clicks',
      time_increment: '1',
      date_preset: 'maximum',
      filtering: campaignFilter,
    }),
    queryInsights({
      fields: 'ad_id,ad_name,adset_name,impressions,spend,actions,outbound_clicks',
      level: 'ad',
      date_preset: 'maximum',
      filtering: campaignFilter,
    }),
  ])

  // Build cumulative history to match the shape of data/meta.json
  let running = 0
  const history: MetricPoint[] = dailyRows
    .sort((a, b) => (a.date_start ?? '').localeCompare(b.date_start ?? ''))
    .map(row => {
      running += findAction(row.actions, 'landing_page_view')
      return { date: row.date_start ?? '', value: running }
    })

  const totalLpv = running
  const totalSpend = dailyRows.reduce((s, r) => s + parseFloat(r.spend ?? '0'), 0)
  const lastDate = dailyRows.at(-1)?.date_start ?? new Date().toISOString().split('T')[0]

  const adIds = adRows.map(r => r.ad_id).filter(Boolean) as string[]
  const permalinks = await fetchPermalinks(adIds, process.env.META_AD_ACCOUNT_ID!)

  const creatives: MetaCreative[] = adRows.map(row => {
    const lpv = findAction(row.actions, 'landing_page_view')
    const clicks = findAction(row.outbound_clicks, 'outbound_click')
    const spent = parseFloat(row.spend ?? '0')
    const id = row.ad_id ?? 'unknown'
    return {
      id,
      name: row.ad_name ?? 'Unknown',
      adsetName: row.adset_name ?? null,
      status: 'active',
      utmContent: null,
      permalink: PERMALINK_OVERRIDES[row.ad_name ?? ''] ?? permalinks[id] ?? null,
      impressions: parseInt(row.impressions ?? '0', 10),
      outboundClicks: clicks,
      landingPageViews: lpv,
      amountSpent: parseFloat(spent.toFixed(2)),
      costPerLpv: lpv > 0 ? parseFloat((spent / lpv).toFixed(2)) : null,
    }
  })

  return {
    lastUpdated: lastDate,
    landingPageViews: totalLpv,
    totalAmountSpent: parseFloat(totalSpend.toFixed(2)),
    note: 'Live from Meta Marketing API.',
    history,
    creatives,
  }
}
