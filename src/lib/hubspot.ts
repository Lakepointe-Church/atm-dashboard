const FORM_ID = 'd2248827-6c54-4792-bf25-697ed9292e15'
const BASE = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_ID}`

// Only count ATM 2026 submissions — exclude Easter and any prior campaigns.
const ATM_START_MS = new Date('2026-06-10T00:00:00Z').getTime()

export async function fetchHubspotSubmissionCount(): Promise<number> {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN
  if (!token) throw new Error('HUBSPOT_PRIVATE_APP_TOKEN not set')

  const headers = { Authorization: `Bearer ${token}` }
  let total = 0
  let after: string | null = null

  do {
    const url = new URL(BASE)
    url.searchParams.set('limit', '50')
    if (after) url.searchParams.set('after', after)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) throw new Error(`HubSpot API error: ${res.status} ${res.statusText}`)

    const data = await res.json() as {
      results: { submittedAt: number }[]
      paging?: { next?: { after: string } }
    }

    for (const submission of data.results) {
      if (submission.submittedAt >= ATM_START_MS) total++
    }

    after = data.paging?.next?.after ?? null
  } while (after)

  return total
}
