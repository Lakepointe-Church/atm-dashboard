import { neon } from '@neondatabase/serverless'

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
  return neon(process.env.DATABASE_URL)
}

/** Idempotent — safe to call on every sync. */
export async function ensureSchema() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS metric_history (
      date    DATE NOT NULL,
      metric  TEXT NOT NULL,
      value   INTEGER NOT NULL,
      PRIMARY KEY (date, metric)
    )
  `
}

export type HistoryRow = { date: string; metric: string; value: number }

export async function getHistory(): Promise<HistoryRow[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT date::text, metric, value
    FROM metric_history
    ORDER BY date ASC
  `
  return rows as unknown as HistoryRow[]
}

export async function upsertMetrics(date: string, metrics: Record<string, number>) {
  const sql = getDb()
  for (const [metric, value] of Object.entries(metrics)) {
    await sql`
      INSERT INTO metric_history (date, metric, value)
      VALUES (${date}, ${metric}, ${value})
      ON CONFLICT (date, metric) DO UPDATE SET value = EXCLUDED.value
    `
  }
}
