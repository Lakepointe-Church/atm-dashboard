// Design tokens — single source of truth for the ATM dashboard look & feel.
// Deliberately distinct from the CIP (community-demographic-tool) dark theme:
// this is a LIGHT, editorial dashboard — warm paper background, white cards with
// soft shadows, a serif display face, and a cinematic accent palette.
// Pure constants (no React/DOM imports) so they're usable anywhere.

export const colors = {
  // Surfaces (light)
  bg:          '#F4F1EA', // warm paper
  bgAlt:       '#EEEAE0',
  surface:     '#FFFFFF',
  surfaceAlt:  '#FBFAF6',
  border:      '#E7E1D5',
  borderStrong:'#D8D1C1',

  // Accent palette — cinematic
  red:    '#CB4231', // primary (curtain red)
  navy:   '#2B3A67',
  teal:   '#0E8C7F',
  amber:  '#D9952B',
  violet: '#6C56C9',

  // Ink / text (dark on light)
  ink:    '#1C1A16', // strongest — headings, big numbers
  body:   '#45413A', // body copy
  label:  '#6E6759', // labels / captions
  muted:  '#8B8475', // secondary captions (passes AA on paper)
  faint:  '#A69E8D', // separators / faintest text
} as const

export const fonts = {
  display: "'Fraunces', Georgia, 'Times New Roman', serif", // headings + big numbers
  sans:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", // body + labels
} as const

// Soft elevation shadows for the light surfaces.
export const shadow = {
  sm:  '0 1px 2px rgba(28,26,22,0.05), 0 1px 3px rgba(28,26,22,0.04)',
  md:  '0 2px 4px rgba(28,26,22,0.04), 0 8px 20px rgba(28,26,22,0.05)',
  lg:  '0 6px 16px rgba(28,26,22,0.08), 0 16px 40px rgba(28,26,22,0.08)',
} as const

// Flat surface background for panels/cards.
export const CARD_BG = colors.surface

// Comma-separated RGB strings for rgba() composition (accent tints).
export const rgbMap: Record<string, string> = {
  [colors.red]:    '203,66,49',
  [colors.navy]:   '43,58,103',
  [colors.teal]:   '14,140,127',
  [colors.amber]:  '217,149,43',
  [colors.violet]: '108,86,201',
}

// Returns the comma-separated RGB for a hex from the palette (defaults to red).
export function toRgb(hex: string): string {
  return rgbMap[hex] ?? rgbMap[colors.red]
}
