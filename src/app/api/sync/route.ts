import { NextResponse } from 'next/server'
import { ensureSchema, upsertMetrics } from '@/lib/db'
import { fetchGA4Data } from '@/lib/ga4'
import { fetchHubspotSubmissionCount } from '@/lib/hubspot'
import { hasTiktokCreds, fetchTiktokData } from '@/lib/tiktok'
import { hasMetaCreds, fetchMetaData } from '@/lib/meta'
import { fetchRockSmsData } from '@/lib/rock'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await ensureSchema()

    const today = new Date().toISOString().split('T')[0]

    const [ga4, formSubmissions] = await Promise.all([
      fetchGA4Data(),
      fetchHubspotSubmissionCount(),
    ])

    const metrics = {
      atm_social_page_views:                    ga4.atmSocial.pageViews.value,
      atm_social_active_users:                  ga4.atmSocial.activeUsers.value,
      at_the_movies_page_views:                 ga4.atTheMovies.pageViews.value,
      at_the_movies_active_users:               ga4.atTheMovies.activeUsers.value,
      form_submissions:                         formSubmissions,
      podcast_page_views:                       ga4.channels.podcast.pageViews.value,
      podcast_active_users:                     ga4.channels.podcast.activeUsers.value,
      movie_theaters_page_views:                ga4.channels.movieTheaters.pageViews.value,
      movie_theaters_active_users:              ga4.channels.movieTheaters.activeUsers.value,
      meta_followup_email_page_views:           ga4.channels.metaFollowupEmail.pageViews.value,
      meta_followup_email_active_users:         ga4.channels.metaFollowupEmail.activeUsers.value,
      e_news_page_views:                        ga4.channels.eNews.pageViews.value,
      e_news_active_users:                      ga4.channels.eNews.activeUsers.value,
      kids_newsletter_page_views:               ga4.channels.kidsNewsletter.pageViews.value,
      kids_newsletter_active_users:             ga4.channels.kidsNewsletter.activeUsers.value,
      invite_page_views:                        ga4.channels.invite.pageViews.value,
      invite_active_users:                      ga4.channels.invite.activeUsers.value,
      organic_social_linktree_page_views:       ga4.channels.organicSocialLinktree.pageViews.value,
      organic_social_linktree_active_users:     ga4.channels.organicSocialLinktree.activeUsers.value,
      organic_social_groups_page_views:         ga4.channels.organicSocialGroups.pageViews.value,
      organic_social_groups_active_users:       ga4.channels.organicSocialGroups.activeUsers.value,
    }

    await upsertMetrics(today, metrics)

    // TikTok: canonical write path, snake_case tiktok_* keys. Spend stored in
    // cents (metric_history.value is INTEGER). Isolated so a TikTok failure is
    // loud but doesn't roll back the GA4/HubSpot writes above.
    let tiktok: Record<string, number> | null = null
    let tiktokError: string | null = null
    if (hasTiktokCreds()) {
      try {
        const tt = await fetchTiktokData()
        tiktok = {
          tiktok_spend_cents:        Math.round(tt.spend * 100),
          tiktok_impressions:        tt.impressions,
          tiktok_clicks:             tt.clicks,
          tiktok_landing_page_views: tt.landingPageViews,
          tiktok_video_views:        tt.videoViews,
          tiktok_video_views_6s:     tt.videoViews6s,
          tiktok_video_views_p100:   tt.videoViewsP100,
        }
        await upsertMetrics(today, tiktok)
      } catch (err) {
        console.error('[sync] TikTok error:', err)
        tiktokError = String(err)
      }
    }

    // Meta: isolated so a Meta failure doesn't roll back the writes above. Spend
    // stored in cents (metric_history.value is INTEGER), same convention as TikTok.
    let meta: Record<string, number> | null = null
    let metaError: string | null = null
    if (hasMetaCreds()) {
      try {
        const md = await fetchMetaData()
        meta = {
          meta_spend_cents:         Math.round((md.totalAmountSpent ?? 0) * 100),
          meta_landing_page_views:  md.landingPageViews,
          meta_video_plays_3s:      md.videoPlays3s ?? 0,
        }
        await upsertMetrics(today, meta)
      } catch (err) {
        console.error('[sync] Meta error:', err)
        metaError = String(err)
      }
    }

    // Rock SMS: isolated, same reasoning. Keys are per-keyword since the
    // campaign keyword set (CAMPAIGN_KEYWORDS in rock.ts) can grow.
    let sms: Record<string, number> | null = null
    let smsError: string | null = null
    try {
      const smsData = await fetchRockSmsData()
      sms = {}
      for (const k of smsData.keywords) {
        sms[`sms_${k.keyword}_total`] = k.total
        sms[`sms_${k.keyword}_new`] = k.new
        sms[`sms_${k.keyword}_unique`] = k.unique
      }
      if (Object.keys(sms).length > 0) await upsertMetrics(today, sms)
    } catch (err) {
      console.error('[sync] Rock SMS error:', err)
      smsError = String(err)
    }

    return NextResponse.json({
      ok: !tiktokError && !metaError && !smsError,
      date: today,
      metrics,
      tiktok, tiktokError,
      meta, metaError,
      sms, smsError,
    })
  } catch (err) {
    console.error('[sync] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
