import { getDashboardData } from '@/lib/data'
import { colors, fonts } from '@/lib/theme'
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
      <header className="fade-up" style={{ marginBottom: '40px' }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.18em',
          color: colors.gold, textTransform: 'uppercase', marginBottom: '12px',
        }}>
          Lakepointe Church · Campaign Analytics
        </div>
        <h1 style={{
          fontFamily: fonts.display, fontSize: '52px', letterSpacing: '0.02em',
          color: colors.textStrong, lineHeight: 1, marginBottom: '12px',
        }}>
          At the Movies — Campaign Dashboard
        </h1>
        <div style={{ fontFamily: fonts.sans, fontSize: '15px', color: colors.label, marginBottom: '14px' }}>
          Campaign dates: {CAMPAIGN_DATES}
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: '11px', color: colors.footer, letterSpacing: '0.04em' }}>
          Last sync: {prettyDate(d.lastUpdated)}
          <span style={{ color: colors.faint }}> · </span>
          Meta updated manually: {prettyDate(d.meta.lastUpdated)}
          {d.seeded && (
            <>
              <span style={{ color: colors.faint }}> · </span>
              <span style={{ color: colors.gold }}>seeded preview — automated syncs not yet live</span>
            </>
          )}
        </div>
      </header>

      {/* ── Headline numbers ───────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '20px' }}>
        <SectionHeader title="Ad Landing Page — atm-social" sub="Traffic driven by Meta ads" marginBottom="14px" />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '14px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.atmSocial.pageViews.value)} color={colors.gold} />
          <StatCard label="GA4 Active Users" value={fmt(d.atmSocial.activeUsers.value)} color={colors.blue} />
          <StatCard label="Form Submissions" value={fmt(d.atmSocial.formSubmissions.value)} sub="HubSpot" color={colors.teal} />
          <StatCard label="Form Conversion" value={`${d.atmSocial.conversionRate.toFixed(1)}%`} sub="submissions ÷ page views" color={colors.purple} />
          <StatCard label="Meta Landing Views" value={fmt(d.meta.landingPageViews)} sub="manual entry" color={colors.coral} />
        </div>
      </section>

      <section className="fade-up-2" style={{ marginBottom: '44px' }}>
        <SectionHeader title="Member Page — at-the-movies" sub="Lakepointe member-facing page" marginBottom="14px" />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '14px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.atTheMovies.pageViews.value)} color={colors.gold} />
          <StatCard label="GA4 Active Users" value={fmt(d.atTheMovies.activeUsers.value)} color={colors.blue} />
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
          <ChartPanel title="Page Views">
            <TrendChart series={[
              { key: 'atmSocial', label: 'atm-social', color: colors.gold, data: d.atmSocial.pageViews.history },
              { key: 'atTheMovies', label: 'at-the-movies', color: colors.blue, data: d.atTheMovies.pageViews.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Active Users">
            <TrendChart series={[
              { key: 'atmSocial', label: 'atm-social', color: colors.gold, data: d.atmSocial.activeUsers.history },
              { key: 'atTheMovies', label: 'at-the-movies', color: colors.blue, data: d.atTheMovies.activeUsers.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Form Submissions — atm-social">
            <TrendChart series={[
              { key: 'submissions', label: 'submissions', color: colors.teal, data: d.atmSocial.formSubmissions.history },
            ]} />
          </ChartPanel>

          <ChartPanel title="Meta Landing Page Views — manual">
            <TrendChart series={[
              { key: 'meta', label: 'landing views', color: colors.coral, data: d.meta.history },
            ]} />
          </ChartPanel>
        </div>
      </section>

      {/* ── Footnotes ──────────────────────────────────────── */}
      <section className="fade-up-4">
        <SectionHeader title="How to read these numbers" marginBottom="12px" />
        <Surface padding="20px 24px">
          <ul style={{ listStyle: 'none', display: 'grid', gap: '10px' }}>
            {FOOTNOTES.map((note, i) => (
              <li key={i} style={{
                fontFamily: fonts.sans, fontSize: '13px', color: colors.text,
                lineHeight: 1.55, paddingLeft: '18px', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: colors.gold }}>•</span>
                {note}
              </li>
            ))}
          </ul>
        </Surface>
      </section>
    </main>
  )
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Surface padding="20px 20px 12px">
      <div style={{
        fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.14em',
        color: colors.muted, textTransform: 'uppercase', marginBottom: '14px',
      }}>
        {title}
      </div>
      {children}
    </Surface>
  )
}
