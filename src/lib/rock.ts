const ROCK_DATASET_URL =
  'https://rock.lakepointe.church/api/v2/models/persisteddatasets/6'

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

  if (
    typeof body !== 'object' ||
    body === null ||
    !('resultData' in body) ||
    typeof (body as { resultData: unknown }).resultData !== 'object' ||
    (body as { resultData: unknown }).resultData === null
  ) {
    throw new Error(
      `[Rock] Unexpected response shape: ${JSON.stringify(body).slice(0, 200)}`
    )
  }

  const resultData = (body as { resultData: Record<string, unknown> }).resultData
  const keywords: SmsKeyword[] = []

  for (const [keyword, raw] of Object.entries(resultData)) {
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
