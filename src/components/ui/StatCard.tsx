'use client'

import { useState } from 'react'
import { colors, fonts, shadow, toRgb } from '@/lib/theme'

// Light editorial stat card: white surface, soft shadow, a colored accent bar
// across the top, an uppercase tracked label, and a large serif number in ink.
// Accent `color` drives the top bar + hover border tint (value stays ink for
// readability on the light surface).
// `loading` shows a pulse skeleton (relies on the global `@keyframes pulse`).
// `compact` uses tighter padding + smaller numbers (dense metric rows).
export function StatCard({ label, value, sub, color, loading, compact }: {
  label: string
  value: string
  sub?: string
  color: string
  loading?: boolean
  compact?: boolean
}) {
  const [hov, setHov] = useState(false)
  const d = compact
    ? { padding: '20px 22px 18px', labelMb: '10px', value: '40px', skel: '34px', sub: '11px', subMt: '8px' }
    : { padding: '24px 24px 22px', labelMb: '12px', value: '46px', skel: '40px', sub: '12px', subMt: '10px' }
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        background: colors.surface,
        border: `1px solid ${hov ? `rgba(${toRgb(color)},0.55)` : colors.border}`,
        borderRadius: '14px',
        padding: d.padding,
        boxShadow: hov ? shadow.lg : shadow.sm,
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* accent bar across the top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
        background: color, opacity: hov ? 1 : 0.85, transition: 'opacity 0.2s ease',
      }} />
      <div style={{ fontFamily: fonts.sans, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: colors.label, textTransform: 'uppercase', marginBottom: d.labelMb }}>{label}</div>
      {loading
        ? <div style={{ height: d.skel, width: '60%', background: colors.bgAlt, borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        : <div style={{ fontFamily: fonts.display, fontSize: d.value, fontWeight: 700, letterSpacing: '0em', color: colors.ink, lineHeight: 1 }}>{value}</div>
      }
      {sub && <div style={{ fontFamily: fonts.sans, fontSize: d.sub, color: colors.muted, marginTop: d.subMt, letterSpacing: '0.01em' }}>{sub}</div>}
    </div>
  )
}
