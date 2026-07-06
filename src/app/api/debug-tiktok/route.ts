import { NextResponse } from 'next/server'

// ── Phase 0 discovery route (read-only) ──────────────────────────────────────
// Mirrors debug-meta: runs server-side where the Sensitive TikTok creds live.
// Query-param driven so we can probe info → campaigns → report without redeploys.
//
//   /api/debug-tiktok?action=info
//   /api/debug-tiktok?action=campaigns
//   /api/debug-tiktok?action=report&data_level=AUCTION_AD
//        &dimensions=ad_id,stat_time_day
//        &metrics=spend,impressions,clicks
//        &start=2026-06-10&end=2026-07-06&report_type=BASIC
//
// TikTok returns HTTP 200 even on app-level errors — the real status is the
// top-level JSON `code` (0 = success). This route surfaces the whole envelope
// raw (code/message/request_id/data) so we never swallow anything.

const HOST = 'https://business-api.tiktok.com'
const V = '/open_api/v1.3'

export const dynamic = 'force-dynamic'

function creds() {
  const token = process.env.TIKTOK_ACCESS_TOKEN
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID
  const appId = process.env.TIKTOK_AD_APP_ID
  return { token, advertiserId, appId }
}

async function ttGet(path: string, params: Record<string, string>, token: string) {
  const qs = new URLSearchParams(params).toString()
  const url = `${HOST}${V}${path}?${qs}`
  const res = await fetch(url, { headers: { 'Access-Token': token } })
  const json = await res.json()
  return {
    request: { url: `${HOST}${V}${path}?${qs}`, httpStatus: res.status },
    response: json,
  }
}

export async function GET(req: Request) {
  const { token, advertiserId, appId } = creds()
  if (!token || !advertiserId) {
    return NextResponse.json(
      { error: 'TikTok creds not set', hasToken: !!token, hasAdvertiserId: !!advertiserId, hasAppId: !!appId },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') ?? 'info'

  try {
    if (action === 'info') {
      const fields = url.searchParams.get('fields')
        ?? 'name,advertiser_account_type,status,currency,timezone,display_timezone,country,role'
      const out = await ttGet('/advertiser/info/', {
        advertiser_ids: JSON.stringify([advertiserId]),
        fields: JSON.stringify(fields.split(',')),
      }, token)
      return NextResponse.json({ action, ...out })
    }

    if (action === 'campaigns') {
      const out = await ttGet('/campaign/get/', {
        advertiser_id: advertiserId,
        page_size: url.searchParams.get('page_size') ?? '50',
        fields: JSON.stringify([
          'campaign_id', 'campaign_name', 'objective_type', 'campaign_type',
          'operation_status', 'secondary_status', 'budget', 'budget_mode',
          'create_time', 'is_smart_performance_campaign',
        ]),
      }, token)
      return NextResponse.json({ action, ...out })
    }

    if (action === 'ad') {
      // Probe for any public/preview URL per ad. Requires ad-management scope.
      const out = await ttGet('/ad/get/', {
        advertiser_id: advertiserId,
        page_size: '10',
        fields: JSON.stringify([
          'ad_id', 'ad_name', 'ad_format', 'landing_page_url', 'cpp_url',
          'tiktok_item_id', 'identity_id', 'video_id', 'is_aco',
          'dark_post_status', 'playable_url', 'creative_type', 'smart_plus_ad_id',
        ]),
        filtering: JSON.stringify({ campaign_ids: ['1869425945879842'] }),
      }, token)
      return NextResponse.json({ action, ...out })
    }

    if (action === 'report') {
      const dimensions = (url.searchParams.get('dimensions') ?? 'ad_id,stat_time_day').split(',')
      const metrics = (url.searchParams.get('metrics')
        ?? 'spend,impressions,clicks,conversion,cpc,cpm,ctr,conversion_rate,cost_per_conversion,video_play_actions,video_watched_2s,video_watched_6s,video_views_p25,video_views_p50,video_views_p75,video_views_p100,reach').split(',')
      const params: Record<string, string> = {
        advertiser_id: advertiserId,
        report_type: url.searchParams.get('report_type') ?? 'BASIC',
        data_level: url.searchParams.get('data_level') ?? 'AUCTION_AD',
        dimensions: JSON.stringify(dimensions),
        metrics: JSON.stringify(metrics),
        start_date: url.searchParams.get('start') ?? '2026-06-10',
        end_date: url.searchParams.get('end') ?? new Date().toISOString().split('T')[0],
        page_size: url.searchParams.get('page_size') ?? '20',
      }
      const filtering = url.searchParams.get('filtering')
      if (filtering) params.filtering = filtering
      const out = await ttGet('/report/integrated/get/', params, token)
      return NextResponse.json({ action, sentParams: params, ...out })
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ action, error: String(err) }, { status: 500 })
  }
}
