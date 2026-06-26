const ROCK_DATASET_URL =
  'https://rock.lakepointe.church/api/v2/models/persisteddatasets/6'

// The persisted dataset returns the church's ENTIRE keyword catalog (130+ keys:
// give, group, podcast, marriage, easter, …). We scope to the ATM 2026 campaign
// keywords only. Add a keyword here when the campaign gains another one — that is
// the single edit required; everything downstream iterates whatever is present.
const CAMPAIGN_KEYWORDS = ['atm', 'movies'] as const

export type SmsKeyword = {
  keyword: string
  total: number
  new: number
  unique: number
}

export type SmsData = {
  keywords: SmsKeyword[]
  // TODO: cross-keyword deduplication — a person who texted both ATM and MOVIES
  // counts toward each keyword's `unique` independently. A combined deduplicated
  // unique total requires Rock to expose that count; the data definition is not
  // yet settled. Do not sum `unique` across keywords and call it "unique people."
}

export async function fetchRockSmsData(): Promise<SmsData> {
  const token = process.env.ROCK_API_TOKEN
  if (!token) throw new Error('[Rock] ROCK_API_TOKEN is not set')

  const res = await fetch(ROCK_DATASET_URL, {
    headers: { 'Authorization-Token': token, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(
      `[Rock] HTTP ${res.status} ${res.statusText} from persisted dataset endpoint`
    )
  }

  const body: unknown = await res.json()

  if (typeof body !== 'object' || body === null || !('resultData' in body)) {
    throw new Error(
      `[Rock] Response missing resultData: ${JSON.stringify(body).slice(0, 200)}`
    )
  }

  // Rock returns resultData as a JSON-ENCODED STRING, not a nested object.
  const rawResult = (body as { resultData: unknown }).resultData
  if (typeof rawResult !== 'string') {
    throw new Error(
      `[Rock] Expected resultData to be a JSON string, got ${typeof rawResult}`
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawResult)
  } catch (err) {
    throw new Error(`[Rock] resultData is not valid JSON: ${(err as Error).message}`)
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('[Rock] Parsed resultData is not an object')
  }

  const all = parsed as Record<string, unknown>
  const keywords: SmsKeyword[] = []

  for (const keyword of CAMPAIGN_KEYWORDS) {
    const raw = all[keyword]
    if (raw === undefined) continue // not present yet — renders as placeholder upstream
    if (
      typeof raw !== 'object' ||
      raw === null ||
      typeof (raw as Record<string, unknown>).total !== 'number' ||
      typeof (raw as Record<string, unknown>).new !== 'number' ||
      typeof (raw as Record<string, unknown>).unique !== 'number'
    ) {
      throw new Error(
        `[Rock] Malformed entry for keyword "${keyword}": ${JSON.stringify(raw)}`
      )
    }
    const k = raw as { total: number; new: number; unique: number }
    keywords.push({ keyword, total: k.total, new: k.new, unique: k.unique })
  }

  return { keywords }
}
