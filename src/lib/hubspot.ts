const FORM_ID = 'd2248827-6c54-4792-bf25-697ed9292e15'
const BASE = `https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_ID}`

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
      results: unknown[]
      paging?: { next?: { after: string } }
    }

    total += data.results.length
    after = data.paging?.next?.after ?? null
  } while (after)

  return total
}
