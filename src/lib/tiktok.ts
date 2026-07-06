import type { MetricPoint, TiktokData, TiktokCreative } from './data'

// ── TikTok Marketing API v1.3 — ATM 2026 Smart+ campaign ─────────────────────
// Verified in Phase 0 (Gate A): Smart+ data surfaces through the standard
// integrated BASIC report at AUCTION_AD / AUCTION_CAMPAIGN levels. advertiser/info
// and campaign/get are NOT granted to our app — reporting is. So we identify the
// campaign by its ID (below), confirmed the only active campaign on the account.
//
// CRITICAL: TikTok returns HTTP 200 even on app-level errors. The real status is
// the top-level JSON `code` (0 = success). Every failure throws with `message` +
// `request_id` — never swallowed, never coerced to 0.

const HOST = 'https://business-api.tiktok.com'
const V = '/open_api/v1.3'

// The only active campaign on the account — "ATM 2026" (confirmed Gate A).
const ATM_CAMPAIGN_ID = '1869425945879842'

// Wide floor — the API returns zero rows for days before the flight launched, so
// an over-wide start is harmless and avoids guessing the exact TikTok start date.
const FLIGHT_START = '2026-06-01'

// stat_time_day reports cap at a 30-day span per request (verified: code 40002).
const MAX_DAY_SPAN = 30

// Native metric field names — all verified present & populated in Phase 0.
const METRICS = [
  'spend', 'impressions', 'clicks', 'total_landing_page_view',
  'video_play_actions', 'video_watched_6s', 'video_views_p100',
] as const

export function hasTiktokCreds(): boolean {
  return !!(process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_ADVERTISER_ID)
}

function campaignFilter(): string {
  return JSON.stringify([
    { field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([ATM_CAMPAIGN_ID]) },
  ])
}

interface Envelope {
  code: number
  message: string
  request_id: string
  data?: { list?: ReportRow[]; page_info?: { page: number; total_page: number } }
}
interface ReportRow {
  dimensions: Record<string, string>
  metrics: Record<string, string>
}

function num(v: string | undefined): number {
  const n = parseFloat(v ?? '0')
  return Number.isFinite(n) ? n : 0
}

// TikTok reports in the ad account's timezone. Confirmed against Ads Manager as
// a FIXED UTC-06:00 offset (it does NOT observe US daylight saving — verified on
// the Jun 30 date picker). So we compute "today" at that fixed offset rather than
// via America/Chicago, which would be UTC-05:00 in summer and drift an hour from
// the account's midnight boundary. (advertiser/info, which would return the tz,
// is scope-blocked — this offset comes from the UI.)
const ACCOUNT_UTC_OFFSET_HOURS = -6

function today(): string {
  const shifted = new Date(Date.now() + ACCOUNT_UTC_OFFSET_HOURS * 3_600_000)
  return shifted.toISOString().split('T')[0]
}

/** One integrated-report call. Throws loudly on any non-zero `code`. */
async function reportPage(
  params: Record<string, string>,
  page: number,
): Promise<Envelope> {
  const token = process.env.TIKTOK_ACCESS_TOKEN!
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID!
  const qs = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    page: String(page),
    ...params,
  }).toString()

  const res = await fetch(`${HOST}${V}/report/integrated/get/?${qs}`, {
    headers: { 'Access-Token': token },
  })
  const json = (await res.json()) as Envelope
  if (json.code !== 0) {
    const auth = json.code === 40001 || /token|auth|expire|grant/i.test(json.message)
    const prefix = auth ? 'TikTok auth expired — re-authorization required' : 'TikTok API'
    throw new Error(`${prefix} (code ${json.code}): ${json.message} [request_id ${json.request_id}]`)
  }
  return json
}

/** Page through an integrated report, returning every row. */
async function report(params: Record<string, string>): Promise<ReportRow[]> {
  const rows: ReportRow[] = []
  let page = 1
  for (;;) {
    const json = await reportPage(params, page)
    rows.push(...(json.data?.list ?? []))
    const info = json.data?.page_info
    if (!info || page >= info.total_page) break
    page += 1
  }
  return rows
}

/** Split [start, end] into ≤30-day windows (inclusive) for stat_time_day pulls. */
function dayWindows(start: string, end: string): [string, string][] {
  const windows: [string, string][] = []
  const endMs = new Date(end + 'T00:00:00Z').getTime()
  let curMs = new Date(start + 'T00:00:00Z').getTime()
  const DAY = 86_400_000
  while (curMs <= endMs) {
    const winEndMs = Math.min(curMs + (MAX_DAY_SPAN - 1) * DAY, endMs)
    windows.push([
      new Date(curMs).toISOString().split('T')[0],
      new Date(winEndMs).toISOString().split('T')[0],
    ])
    curMs = winEndMs + DAY
  }
  return windows
}

export async function fetchTiktokData(): Promise<TiktokData> {
  const end = today()
  const metricsJson = JSON.stringify(METRICS)
  const filtering = campaignFilter()

  // Campaign lifetime totals (no day dimension → single row, no span cap).
  const totalsRows = await report({
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id']),
    metrics: metricsJson,
    start_date: FLIGHT_START,
    end_date: end,
    filtering,
    page_size: '10',
  })
  const t = totalsRows[0]?.metrics ?? {}

  // Per-ad lifetime stats, one row per ad_id (creative × ad group).
  const adRows = await report({
    data_level: 'AUCTION_AD',
    dimensions: JSON.stringify(['ad_id']),
    metrics: JSON.stringify(['ad_name', 'adgroup_name', ...METRICS]),
    start_date: FLIGHT_START,
    end_date: end,
    filtering,
    page_size: '100',
  })

  // Daily campaign history (chunked ≤30 days), used for the cumulative LPV chart.
  const dailyRows: ReportRow[] = []
  for (const [ws, we] of dayWindows(FLIGHT_START, end)) {
    dailyRows.push(...await report({
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['stat_time_day']),
      metrics: JSON.stringify(['total_landing_page_view']),
      start_date: ws,
      end_date: we,
      filtering,
      page_size: '60',
    }))
  }

  let runningLpv = 0
  const history: MetricPoint[] = dailyRows
    .map(r => ({ date: (r.dimensions.stat_time_day ?? '').slice(0, 10), value: num(r.metrics.total_landing_page_view) }))
    .filter(p => p.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => { runningLpv += p.value; return { date: p.date, value: runningLpv } })

  const creatives: TiktokCreative[] = adRows.map(row => {
    const m = row.metrics
    const spent = num(m.spend)
    const lpv = num(m.total_landing_page_view)
    return {
      id: row.dimensions.ad_id ?? 'unknown',
      name: m.ad_name ?? 'Unknown',
      adgroupName: m.adgroup_name ?? null,
      impressions: Math.round(num(m.impressions)),
      clicks: Math.round(num(m.clicks)),
      landingPageViews: Math.round(lpv),
      amountSpent: parseFloat(spent.toFixed(2)),
      costPerLpv: lpv > 0 ? parseFloat((spent / lpv).toFixed(2)) : null,
      videoViews: Math.round(num(m.video_play_actions)),
      videoViews6s: Math.round(num(m.video_watched_6s)),
      videoViewsP100: Math.round(num(m.video_views_p100)),
    }
  })

  const lastDate = history.at(-1)?.date ?? end

  return {
    lastUpdated: lastDate,
    spend: parseFloat(num(t.spend).toFixed(2)),
    impressions: Math.round(num(t.impressions)),
    clicks: Math.round(num(t.clicks)),
    landingPageViews: Math.round(num(t.total_landing_page_view)),
    videoViews: Math.round(num(t.video_play_actions)),
    videoViews6s: Math.round(num(t.video_watched_6s)),
    videoViewsP100: Math.round(num(t.video_views_p100)),
    history,
    creatives,
    note: 'Live from TikTok Marketing API (v1.3, ATM 2026 Smart+ campaign).',
  }
}
