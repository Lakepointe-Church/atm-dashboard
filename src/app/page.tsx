import { getDashboardData } from '@/lib/data'
import { colors, fonts, shadow } from '@/lib/theme'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Surface } from '@/components/ui/Surface'
import { TrendChart } from '@/components/TrendChart'

export const dynamic = 'force-dynamic'

const CAMPAIGN_DATES = 'July 11 – August 2'

const FOOTNOTES = [
  'atm-social is distributed only via Meta ads, so its traffic ≈ ad traffic.',
  'HubSpot form views run higher than GA4 page views due to differences in how each tool tracks; GA4 is the more reliable traffic figure.',
  'Meta numbers are entered manually until API access is approved.',
  'No UTM parameters are on the ads currently, so per-creative breakdown isn’t available in GA4.',
]

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

function prettyDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const GRID_4 = 'repeat(auto-fit, minmax(180px, 1fr))'
const GRID_2 = 'repeat(auto-fit, minmax(320px, 1fr))'

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <main style={{
      position: 'relative', zIndex: 1, maxWidth: '1120px', margin: '0 auto',
      padding: '48px 24px 80px',
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="fade-up" style={{ marginBottom: '44px' }}>
        <div style={{
          fontFamily: fonts.sans, fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
          color: colors.red, textTransform: 'uppercase', marginBottom: '14px',
        }}>
          Lakepointe Church · Campaign Analytics
        </div>
        <h1 style={{
          fontFamily: fonts.display, fontWeight: 600, fontSize: '54px', letterSpacing: '-0.02em',
          color: colors.ink, lineHeight: 1.04, marginBottom: '14px', maxWidth: '16ch',
        }}>
          At the Movies
        </h1>
        <div style={{ fontFamily: fonts.sans, fontSize: '15px', color: colors.body, marginBottom: '18px' }}>
          Campaign performance · {CAMPAIGN_DATES}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 14px',
          fontFamily: fonts.sans, fontSize: '12px', color: colors.label,
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: '999px', padding: '8px 16px', boxShadow: shadow.sm,
        }}>
          <span>Last sync <strong style={{ color: colors.body, fontWeight: 600 }}>{prettyDate(d.lastUpdated)}</strong></span>
          <span style={{ color: colors.faint }}>·</span>
          <span>Meta updated <strong style={{ color: colors.body, fontWeight: 600 }}>{prettyDate(d.meta.lastUpdated)}</strong></span>
          {d.seeded && (
            <>
              <span style={{ color: colors.faint }}>·</span>
              <span style={{ color: colors.red, fontWeight: 600 }}>Seeded preview — syncs not yet live</span>
            </>
          )}
        </div>
      </header>

      {/* ── Headline numbers ───────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '24px' }}>
        <SectionHeader title="Ad Landing Page" sub="atm-social · traffic driven by Meta ads" marginBottom="16px" />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.atmSocial.pageViews.value)} color={colors.red} />
          <StatCard label="GA4 Active Users" value={fmt(d.atmSocial.activeUsers.value)} color={colors.navy} />
          <StatCard label="Form Submissions" value={fmt(d.atmSocial.formSubmissions.value)} sub="HubSpot" color={colors.teal} />
          <StatCard label="Form Conversion" value={`${d.atmSocial.conversionRate.toFixed(1)}%`} sub="submissions ÷ page views" color={colors.violet} />
          <StatCard label="Meta Landing Views" value={fmt(d.meta.landingPageViews)} sub="manual entry" color={colors.amber} />
        </div>
      </section>

      <section className="fade-up-2" style={{ marginBottom: '48px' }}>
        <SectionHeader title="Member Page" sub="at-the-movies · Lakepointe member-facing page" accent={colors.navy} marginBottom="16px" />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.atTheMovies.pageViews.value)} color={colors.red} />
          <StatCard label="GA4 Active Users" value={fmt(d.atTheMovies.activeUsers.value)} color={colors.navy} />
        </div>
      </section>

      {/* ── Trend charts ───────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Trends Over Time"
          sub={d.seeded ? 'Pre–Jun 16 points are illustrative placeholders until automated history accrues' : undefined}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Page Views" accent={colors.red}>
            <TrendChart series={[
              { key: 'atmSocial', label: 'atm-social', color: colors.red, data: d.atmSocial.pageViews.history },
              { key: 'atTheMovies', label: 'at-the-movies', color: colors.navy, data: d.atTheMovies.pageViews.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Active Users" accent={colors.navy}>
            <TrendChart series={[
              { key: 'atmSocial', label: 'atm-social', color: colors.red, data: d.atmSocial.activeUsers.history },
              { key: 'atTheMovies', label: 'at-the-movies', color: colors.navy, data: d.atTheMovies.activeUsers.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Form Submissions — atm-social" accent={colors.teal}>
            <TrendChart series={[
              { key: 'submissions', label: 'submissions', color: colors.teal, data: d.atmSocial.formSubmissions.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Meta Landing Page Views — manual" accent={colors.amber}>
            <TrendChart series={[
              { key: 'meta', label: 'landing views', color: colors.amber, data: d.meta.history },
            ]} />
          </ChartPanel>
        </div>
      </section>

      {/* ── Footnotes ──────────────────────────────────────── */}
      <section className="fade-up-4">
        <SectionHeader title="How to read these numbers" accent={colors.amber} marginBottom="14px" />
        <Surface padding="22px 26px">
          <ul style={{ listStyle: 'none', display: 'grid', gap: '12px' }}>
            {FOOTNOTES.map((note, i) => (
              <li key={i} style={{
                fontFamily: fonts.sans, fontSize: '13.5px', color: colors.body,
                lineHeight: 1.55, paddingLeft: '20px', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, top: '1px', color: colors.red, fontWeight: 700 }}>•</span>
                {note}
              </li>
            ))}
          </ul>
        </Surface>
      </section>
    </main>
  )
}

function ChartPanel({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <Surface padding="20px 22px 14px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
        <div style={{
          fontFamily: fonts.sans, fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em',
          color: colors.body, textTransform: 'uppercase',
        }}>
          {title}
        </div>
      </div>
      {children}
    </Surface>
  )
}
