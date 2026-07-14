import { NextResponse } from 'next/server'

const FORM_ID = 'd2248827-6c54-4792-bf25-697ed9292e15'
const BASE = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_ID}`

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN
  if (!token) return NextResponse.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 })

  const headers = { Authorization: `Bearer ${token}` }
  const ATM_START_MS = new Date('2026-06-10T00:00:00Z').getTime()

  let totalAll = 0
  let totalAtm = 0
  let oldestDate: string | null = null
  let after: string | null = null

  do {
    const url = new URL(BASE)
    url.searchParams.set('limit', '50')
    if (after) url.searchParams.set('after', after)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) return NextResponse.json({ error: `HubSpot ${res.status}` }, { status: 500 })

    const data = await res.json() as {
      results: { submittedAt: number }[]
      paging?: { next?: { after: string } }
    }

    for (const s of data.results) {
      totalAll++
      if (s.submittedAt >= ATM_START_MS) totalAtm++
      const d = new Date(s.submittedAt).toISOString().split('T')[0]
      if (!oldestDate || d < oldestDate) oldestDate = d
    }

    after = data.paging?.next?.after ?? null
  } while (after)

  return NextResponse.json({
    totalAllTime: totalAll,
    totalAtmOnly: totalAtm,
    preAtmEaster: totalAll - totalAtm,
    atmCutoffDate: '2026-06-10',
    oldestSubmission: oldestDate,
  })
}
