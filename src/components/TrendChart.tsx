'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { colors, fonts, shadow, toRgb } from '@/lib/theme'
import type { MetricPoint } from '@/lib/data'

export type Series = {
  /** unique key used as the dataKey on the merged dataset */
  key: string
  /** legend / tooltip label */
  label: string
  /** accent hex from the palette */
  color: string
  data: MetricPoint[]
}

// Merge multiple series (each a list of dated points) into the row-per-date
// shape Recharts wants: [{ date, <key1>: v, <key2>: v }, ...].
function mergeByDate(series: Series[]) {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const s of series) {
    for (const p of s.data) {
      const row = byDate.get(p.date) ?? { date: p.date }
      row[s.key] = p.value
      byDate.set(p.date, row)
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

// Format an ISO date (2026-06-16) as a short axis label (Jun 16).
function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '10px',
      padding: '10px 12px', fontFamily: fonts.sans, fontSize: '11.5px',
      boxShadow: shadow.md,
    }}>
      <div style={{ color: colors.label, marginBottom: 6, letterSpacing: '0.04em', fontWeight: 600 }}>
        {label ? shortDate(label) : ''}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16, fontWeight: 500 }}>
          <span>{p.name}</span>
          <span style={{ color: colors.ink, fontWeight: 600 }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({ series, height = 240 }: { series: Series[]; height?: number }) {
  const data = mergeByDate(series)
  const multi = series.length > 1
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date" tickFormatter={shortDate}
          tick={{ fill: colors.muted, fontFamily: fonts.sans, fontSize: 11 }}
          stroke={colors.borderStrong} tickLine={false}
        />
        <YAxis
          tick={{ fill: colors.muted, fontFamily: fonts.sans, fontSize: 11 }}
          stroke={colors.borderStrong} tickLine={false} width={44}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.borderStrong, strokeWidth: 1 }} />
        {multi && (
          <Legend
            wrapperStyle={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', paddingTop: 8 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color} strokeWidth={2}
            dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: s.color, stroke: `rgba(${toRgb(s.color)},0.3)`, strokeWidth: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
