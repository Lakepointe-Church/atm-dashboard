// Design tokens — Lakepointe brand-light.
// Single source of truth for surfaces, the LP palette, text hierarchy, and shadows.
// Pure constants — no React/DOM imports.

export const colors = {
  // Surfaces (brand-light: LP Taupe base, white cards)
  bg:          '#DED7CC', // LP Taupe — page background
  bgAlt:       '#D0C9BE',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F8F6F3',
  border:      'rgba(50,50,50,0.13)',
  borderStrong:'rgba(50,50,50,0.22)',

  // Lakepointe brand palette
  orange: '#F04B28', // LP Orange — primary pop (use sparingly)
  slate:  '#7AA3AA', // LP Slate — secondary complement
  lpGray: '#323232', // LP Dark Gray — structure / tertiary accent

  // Text hierarchy (dark on light)
  ink:    '#323232',
  body:   '#4a4a4a',
  label:  '#666666',
  muted:  '#888888',
  faint:  '#AAAAAA',
} as const

export const fonts = {
  display: '"Gotham","Futura","Avenir","Century Gothic","Helvetica Neue",Helvetica,Calibri,system-ui,sans-serif',
  sans:    '"Gotham","Futura","Avenir","Century Gothic","Helvetica Neue",Helvetica,Calibri,system-ui,sans-serif',
} as const

export const shadow = {
  sm:  '0 1px 2px rgba(50,50,50,0.06), 0 1px 3px rgba(50,50,50,0.05)',
  md:  '0 2px 4px rgba(50,50,50,0.06), 0 8px 20px rgba(50,50,50,0.07)',
  lg:  '0 6px 16px rgba(50,50,50,0.10), 0 16px 40px rgba(50,50,50,0.10)',
} as const

export const CARD_BG = colors.surface

export const rgbMap: Record<string, string> = {
  [colors.orange]: '240,75,40',
  [colors.slate]:  '122,163,170',
  [colors.lpGray]: '50,50,50',
}

export function toRgb(hex: string): string {
  return rgbMap[hex] ?? rgbMap[colors.orange]
}
