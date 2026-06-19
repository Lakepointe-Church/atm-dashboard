import { getDashboardData, type MetaCreative } from '@/lib/data'
import { colors, fonts, shadow } from '@/lib/theme'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Surface } from '@/components/ui/Surface'
import { TrendChart } from '@/components/TrendChart'

export const dynamic = 'force-dynamic'

const CAMPAIGN_DATES = 'July 11 – August 2'

const FOOTNOTES = [
  "atm-social is distributed only via Meta ads, so its traffic ≈ ad traffic.",
  "HubSpot form views run higher than GA4 page views due to differences in how each tool tracks; GA4 is the more reliable traffic figure.",
  "Meta numbers are entered manually until API access is approved. Update data/meta.json and redeploy to refresh creative stats.",
  "UTM parameters are now in place for all ads (utm_content=vid2/img1/img2/img3). VID 1 predates UTM setup and has no content tag.",
  "Cost per lead = total Meta ad spend ÷ HubSpot form submissions. Outbound clicks require enabling that column in Meta Ads Manager → Columns.",
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

      {/* ── Meta Ad Creatives ──────────────────────────────── */}
      {d.meta.creatives.length > 0 && (
        <section className="fade-up-2" style={{ marginBottom: '48px' }}>
          <SectionHeader
            title="Meta Ad Creatives"
            sub={`lifetime to ${prettyDate(d.meta.lastUpdated)} · manual entry · sorted by landing page views`}
            accent={colors.amber}
            marginBottom="16px"
          />
          <MetaCreativesTable
            creatives={d.meta.creatives}
            totalAmountSpent={d.meta.totalAmountSpent}
            formSubmissions={d.atmSocial.formSubmissions.value}
          />
        </section>
      )}

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

function MetaCreativesTable({ creatives, totalAmountSpent, formSubmissions }: {
  creatives: MetaCreative[]
  totalAmountSpent: number | null
  formSubmissions: number
}) {
  const active = creatives.filter(c => c.status === 'active')
  const totalImpressions = active.reduce((s, c) => s + (c.impressions ?? 0), 0)
  const totalLPV = active.reduce((s, c) => s + (c.landingPageViews ?? 0), 0)
  const costPerLead = totalAmountSpent && formSubmissions > 0
    ? totalAmountSpent / formSubmissions
    : null

  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th style={{
      fontFamily: fonts.sans, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: colors.label, padding: '10px 14px',
      textAlign: right ? 'right' : 'left', borderBottom: `1px solid ${colors.border}`,
      whiteSpace: 'nowrap',
    }}>{children}</th>
  )

  const TD = ({ children, right, muted, bold }: { children: React.ReactNode; right?: boolean; muted?: boolean; bold?: boolean }) => (
    <td style={{
      fontFamily: fonts.sans, fontSize: '13px', padding: '11px 14px',
      textAlign: right ? 'right' : 'left',
      color: muted ? colors.muted : bold ? colors.ink : colors.body,
      fontWeight: bold ? 600 : 400,
      fontVariantNumeric: 'tabular-nums',
    }}>{children}</td>
  )

  const fmtCurrency = (n: number | null) => n != null ? `$${n.toFixed(2)}` : '—'
  const fmtNum = (n: number | null) => n != null ? n.toLocaleString('en-US') : '—'

  return (
    <Surface padding="0">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: colors.surfaceAlt }}>
              <TH>Creative</TH>
              <TH>Impressions</TH>
              <TH right>Outbound Clicks</TH>
              <TH right>Landing Page Views</TH>
              <TH right>Amount Spent</TH>
              <TH right>Cost / LPV</TH>
            </tr>
          </thead>
          <tbody>
            {creatives.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                <TD>
                  <span style={{ fontWeight: 600, color: colors.ink }}>{c.name}</span>
                  {c.utmContent && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: colors.muted, fontFamily: 'monospace' }}>
                      utm_content={c.utmContent}
                    </span>
                  )}
                </TD>
                <TD right>{fmtNum(c.impressions)}</TD>
                <TD right muted={c.outboundClicks == null}>{fmtNum(c.outboundClicks)}</TD>
                <TD right>{fmtNum(c.landingPageViews)}</TD>
                <TD right>{fmtCurrency(c.amountSpent)}</TD>
                <TD right muted={c.costPerLpv == null}>{fmtCurrency(c.costPerLpv)}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${colors.borderStrong}`, background: colors.surfaceAlt }}>
              <TD bold>Total (active ads)</TD>
              <TD right bold>{totalImpressions.toLocaleString('en-US')}</TD>
              <TD right muted>—</TD>
              <TD right bold>{totalLPV.toLocaleString('en-US')}</TD>
              <TD right bold>{fmtCurrency(totalAmountSpent)}</TD>
              <TD right muted>—</TD>
            </tr>
          </tfoot>
        </table>
      </div>
      {costPerLead != null && (
        <div style={{
          padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
          fontFamily: fonts.sans, fontSize: '13px', color: colors.body,
          display: 'flex', gap: '24px', flexWrap: 'wrap',
        }}>
          <span>
            <span style={{ color: colors.label, fontWeight: 600, textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.08em' }}>Cost per Lead </span>
            <span style={{ fontFamily: fonts.display, fontSize: '20px', fontWeight: 600, color: colors.ink }}>
              {fmtCurrency(costPerLead)}
            </span>
            <span style={{ color: colors.muted, fontSize: '11.5px', marginLeft: '6px' }}>
              total spend ÷ {formSubmissions.toLocaleString('en-US')} HubSpot submissions
            </span>
          </span>
        </div>
      )}
    </Surface>
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
