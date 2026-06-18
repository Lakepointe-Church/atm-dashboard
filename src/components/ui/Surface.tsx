import type { CSSProperties, ReactNode } from 'react'
import { colors, CARD_BG, shadow } from '@/lib/theme'

// Panel container: white surface, soft border + shadow, rounded corners.
// `padding` and any extra `style` keys override the defaults.
export function Surface({ children, padding = '24px', style, className }: {
  children: ReactNode
  padding?: CSSProperties['padding']
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: CARD_BG,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        boxShadow: shadow.sm,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
