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
      atm_social_page_views:       ga4.atmSocial.pageViews.value,
      atm_social_active_users:     ga4.atmSocial.activeUsers.value,
      at_the_movies_page_views:    ga4.atTheMovies.pageViews.value,
      at_the_movies_active_users:  ga4.atTheMovies.activeUsers.value,
      form_submissions:            formSubmissions,
    }

    await upsertMetrics(today, metrics)

    return NextResponse.json({ ok: true, date: today, metrics })
  } catch (err) {
    console.error('[sync] error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
