import { NextResponse } from 'next/server'

const ROCK_DATASET_URL =
  'https://rock.lakepointe.church/api/v2/models/persisteddatasets/6'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.ROCK_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'ROCK_API_TOKEN not set' }, { status: 500 })
  }

  // Surface token shape WITHOUT leaking the value — helps catch stray
  // whitespace or a pasted "curl ..." string vs. a bare token.
  const tokenInfo = {
    length: token.length,
    startsWith: token.slice(0, 4),
    looksLikeCurl: /curl|https?:|Authorization/i.test(token),
    hasWhitespace: /\s/.test(token),
  }

  const res = await fetch(ROCK_DATASET_URL, {
    headers: { 'Authorization-Token': token, Accept: 'application/json' },
    cache: 'no-store',
  })

  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 500)
  }

  return NextResponse.json(
    { status: res.status, ok: res.ok, tokenInfo, body },
    { status: res.ok ? 200 : 502 }
  )
}
