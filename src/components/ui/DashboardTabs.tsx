'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { colors, fonts, shadow } from '@/lib/theme'

// Channel filter for the dashboard body. "All" (default) shows every section;
// picking a channel hides sections that aren't tagged with that category.
// Campaign Summary, Church Facing, and the footnotes are not channel-specific,
// so they stay outside the filter and are always visible.
export type ChannelTab = 'all' | 'paid' | 'text' | 'email' | 'social'

const TABS: { key: ChannelTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid Ads' },
  { key: 'text', label: 'Text' },
  { key: 'email', label: 'Email' },
  { key: 'social', label: 'Social' },
]

const ActiveTabContext = createContext<ChannelTab>('all')

export function DashboardTabs({ syncInfo, children }: { syncInfo?: ReactNode; children: ReactNode }) {
  const [active, setActive] = useState<ChannelTab>('all')

  return (
    <>
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', marginBottom: '36px',
      }}>
        <nav
          aria-label="Filter by channel"
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px',
            background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: '999px', padding: '5px', boxShadow: shadow.sm,
            width: 'fit-content',
          }}
        >
          {TABS.map(t => {
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                aria-pressed={isActive}
                style={{
                  fontFamily: fonts.sans, fontSize: '13px', fontWeight: 600,
                  letterSpacing: '0.02em', padding: '8px 18px', borderRadius: '999px',
                  border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                  background: isActive ? colors.orange : 'transparent',
                  color: isActive ? '#FFFFFF' : colors.label,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
        {syncInfo}
      </div>
      <ActiveTabContext.Provider value={active}>
        {children}
      </ActiveTabContext.Provider>
    </>
  )
}

/** Wrap a section with the channel(s) it belongs to; hidden unless "All" or a matching tab is active. */
export function FilterSection({ category, children }: { category: ChannelTab | ChannelTab[]; children: ReactNode }) {
  const active = useContext(ActiveTabContext)
  const categories = Array.isArray(category) ? category : [category]
  if (active !== 'all' && !categories.includes(active)) return null
  return <>{children}</>
}
