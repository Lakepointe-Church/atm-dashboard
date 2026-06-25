import type { CSSProperties } from 'react'
import { colors, fonts } from '@/lib/theme'

// Editorial section header: a short colored accent rule + a serif title, with an
// optional sub line in muted sans. `accent` colors the rule (defaults to red).
export function SectionHeader({ title, sub, accent = colors.orange, marginBottom = '16px', style }: {
  title: string
  sub?: string
  accent?: string
  marginBottom?: CSSProperties['marginBottom']
  style?: CSSProperties
}) {
  return (
    <div style={{ marginBottom, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: sub ? '5px' : 0 }}>
        <span style={{ display: 'inline-block', width: '22px', height: '3px', borderRadius: '2px', background: accent }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '20px', letterSpacing: '0em', color: colors.ink, lineHeight: 1.1 }}>{title}</div>
      </div>
      {sub && <div style={{ fontFamily: fonts.sans, fontSize: '12.5px', color: colors.muted, letterSpacing: '0.01em', paddingLeft: '32px' }}>{sub}</div>}
    </div>
  )
}
