import { NextResponse } from 'next/server'
import { ensureSchema, upsertMetrics } from '@/lib/db'
import { fetchGA4Data } from '@/lib/ga4'
import { fetchHubspotSubmissionCount } from '@/lib/hubspot'

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

    return NextResponse.json({ ok: true, date: today, metrics })
  } catch (err) {
    console.error('[sync] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
