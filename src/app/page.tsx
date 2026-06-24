import { getDashboardData, type MetaCreative } from '@/lib/data'
import { colors, fonts, shadow } from '@/lib/theme'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Surface } from '@/components/ui/Surface'
import { TrendChart } from '@/components/TrendChart'

export const dynamic = 'force-dynamic'

const CAMPAIGN_DATES = 'July 11 – August 2'

const FOOTNOTES = [
  'atm-social is distributed only via Meta ads, so its traffic ≈ ad traffic.',
  'Each channel below Meta Ads is a UTM-filtered slice of the at-the-movies page. Channels show real data only once their links carry the correct UTM (utm_campaign=atm_2026).',
  '"Church Facing" = at-the-movies traffic with no campaign UTM (direct/organic member visits).',
  'HubSpot form views run higher than GA4 page views due to differences in how each tool tracks; GA4 is the more reliable traffic figure.',
  'Meta numbers are pulled live from the Meta Marketing API, filtered to the ATM 2026 campaign. data/meta.json remains as a fallback only.',
  'UTM parameters are in place for all ads (utm_content=vid2/img1/img2/img3). VID 1 predates UTM setup and has no content tag.',
  'Text counts come from Rock\'s CTA Keyword report (ATM and MOVIES keywords), pulled separately from web analytics.',
  'Cost per lead = total Meta ad spend ÷ HubSpot form submissions.',
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

      {/* ── Campaign Summary Strip ──────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader title="Campaign Summary" sub="All channels · at-a-glance totals" marginBottom="16px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <StatCard label="Total Page Views" value={fmt(d.summary.totalPageViews)} sub="all channels" color={colors.red} compact />
          <StatCard label="Form Submissions" value={fmt(d.summary.totalFormSubmissions)} sub="HubSpot" color={colors.teal} compact />
          <PlaceholderCard label="Total Texts" note="Awaiting Rock API" compact />
          {d.summary.totalMetaSpend != null
            ? <StatCard label="Meta Spend" value={`$${fmt(Math.round(d.summary.totalMetaSpend))}`} sub="Meta API" color={colors.amber} compact />
            : <PlaceholderCard label="Meta Spend" note="Awaiting Meta data" compact />
          }
        </div>
      </section>

      {/* ── Church Facing ──────────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Church Facing"
          sub="at-the-movies · direct/organic member traffic (no campaign UTM)"
          accent={colors.navy}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px', marginBottom: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.churchFacing.pageViews.value)} color={colors.navy} />
          <StatCard label="GA4 Active Users" value={fmt(d.churchFacing.activeUsers.value)} color={colors.navy} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Page Views" accent={colors.navy}>
            <TrendChart series={[{ key: 'pageViews', label: 'page views', color: colors.navy, data: d.churchFacing.pageViews.history }]} />
          </ChartPanel>
          <ChartPanel title="Active Users" accent={colors.navy}>
            <TrendChart series={[{ key: 'activeUsers', label: 'active users', color: colors.navy, data: d.churchFacing.activeUsers.history }]} />
          </ChartPanel>
        </div>
      </section>

      {/* ── Meta Ad ────────────────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Meta Ads"
          sub="atm-social · all traffic"
          accent={colors.red}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.metaAd.pageViews.value)} color={colors.red} />
          <StatCard label="GA4 Active Users" value={fmt(d.metaAd.activeUsers.value)} color={colors.navy} />
          <StatCard label="Form Submissions" value={fmt(d.metaAd.formSubmissions.value)} sub="HubSpot" color={colors.teal} />
          <StatCard label="Form Conversion" value={`${d.metaAd.conversionRate.toFixed(1)}%`} sub="submissions ÷ page views" color={colors.violet} />
          <StatCard label="Meta Landing Views" value={fmt(d.meta.landingPageViews)} sub="Meta API" color={colors.amber} />
          {d.metaAd.costPerLead != null && (
            <StatCard label="Cost per Lead" value={`$${d.metaAd.costPerLead.toFixed(2)}`} sub="total spend ÷ submissions" color={colors.amber} />
          )}
          <StatCard label="Follow-up Email Views" value={fmt(d.utmChannels.metaFollowupEmail.pageViews.value)} sub="HubSpot freebie · utm_medium=email" color={colors.red} />
          <StatCard label="Follow-up Email Users" value={fmt(d.utmChannels.metaFollowupEmail.activeUsers.value)} sub="HubSpot freebie · utm_medium=email" color={colors.red} />
        </div>

        {d.meta.creatives.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <MetaCreativesTable creatives={d.meta.creatives} totalAmountSpent={d.meta.totalAmountSpent} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Page Views" accent={colors.red}>
            <TrendChart series={[{ key: 'pageViews', label: 'page views', color: colors.red, data: d.metaAd.pageViews.history }]} />
          </ChartPanel>
          <ChartPanel title="Active Users" accent={colors.navy}>
            <TrendChart series={[{ key: 'activeUsers', label: 'active users', color: colors.navy, data: d.metaAd.activeUsers.history }]} />
          </ChartPanel>
          <ChartPanel title="Form Submissions" accent={colors.teal}>
            <TrendChart series={[{ key: 'submissions', label: 'submissions', color: colors.teal, data: d.metaAd.formSubmissions.history }]} />
          </ChartPanel>
          <ChartPanel title="Meta Landing Page Views" accent={colors.amber}>
            <TrendChart series={[{ key: 'meta', label: 'landing views', color: colors.amber, data: d.meta.history }]} />
          </ChartPanel>
        </div>
        {d.seeded && (
          <div style={{ fontFamily: fonts.sans, fontSize: '12px', color: colors.muted, marginTop: '10px', paddingLeft: '4px' }}>
            Pre–Jun 16 trend points are illustrative placeholders until automated history accrues.
          </div>
        )}
      </section>

      {/* ── Podcast ────────────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Podcast"
          sub="at-the-movies · utm_medium=podcast · utm_source=youtube · utm_content=atm"
          accent={colors.teal}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <PlaceholderCard label="Texts Sent — ATM keyword" note="Awaiting Rock API access" />
          <StatCard label="GA4 Page Views" value={fmt(d.utmChannels.podcast.pageViews.value)} color={colors.teal} />
          <StatCard label="GA4 Active Users" value={fmt(d.utmChannels.podcast.activeUsers.value)} color={colors.teal} />
        </div>
      </section>

      {/* ── Movie Theaters ─────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Movie Theaters"
          sub="at-the-movies · utm_medium=theaters · utm_source=video · utm_content=movies"
          accent={colors.amber}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <PlaceholderCard label="Texts Sent — MOVIES keyword" note="Awaiting Rock API access" />
          <StatCard label="GA4 Page Views" value={fmt(d.utmChannels.movieTheaters.pageViews.value)} color={colors.amber} />
          <StatCard label="GA4 Active Users" value={fmt(d.utmChannels.movieTheaters.activeUsers.value)} color={colors.amber} />
        </div>
      </section>

      {/* ── Email ──────────────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Email"
          sub="at-the-movies · utm_source=email · split by utm_medium"
          accent={colors.violet}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '16px', alignItems: 'stretch' }}>
          {/* Chart — explicitly placed at column 3, spanning all 3 rows */}
          <div style={{ gridColumn: '3', gridRow: '1 / 4', display: 'flex', flexDirection: 'column' }}>
            <Surface padding="20px 22px 14px" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: colors.violet }} />
                <div style={{ fontFamily: fonts.sans, fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: colors.body, textTransform: 'uppercase' }}>
                  Email Channels — Page Views
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <TrendChart
                  height={280}
                  series={[
                    { key: 'eNews',          label: 'E News',          color: colors.violet, data: d.utmChannels.eNews.pageViews.history },
                    { key: 'kidsNewsletter', label: 'Kids Newsletter', color: colors.teal,   data: d.utmChannels.kidsNewsletter.pageViews.history },
                    { key: 'invite',         label: 'Invite',          color: colors.amber,  data: d.utmChannels.invite.pageViews.history },
                  ]}
                />
              </div>
            </Surface>
          </div>
          {/* Row 1: E News */}
          <StatCard label="E News Page Views"   value={fmt(d.utmChannels.eNews.pageViews.value)}   sub="utm_medium=e_news" color={colors.violet} />
          <StatCard label="E News Active Users" value={fmt(d.utmChannels.eNews.activeUsers.value)} sub="utm_medium=e_news" color={colors.violet} />
          {/* Row 2: Kids Newsletter */}
          <StatCard label="Kids Newsletter Page Views"   value={fmt(d.utmChannels.kidsNewsletter.pageViews.value)}   sub="utm_medium=kids_newsletter" color={colors.teal} />
          <StatCard label="Kids Newsletter Active Users" value={fmt(d.utmChannels.kidsNewsletter.activeUsers.value)} sub="utm_medium=kids_newsletter" color={colors.teal} />
          {/* Row 3: Invite */}
          <StatCard label="Invite Page Views"   value={fmt(d.utmChannels.invite.pageViews.value)}   sub="utm_medium=stand_alone_1" color={colors.amber} />
          <StatCard label="Invite Active Users" value={fmt(d.utmChannels.invite.activeUsers.value)} sub="utm_medium=stand_alone_1" color={colors.amber} />
        </div>
      </section>

      {/* ── Organic Social ─────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Organic Social"
          sub="at-the-movies · utm_medium=organic_social · split by utm_source"
          accent={colors.teal}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <StatCard label="Linktree Page Views" value={fmt(d.utmChannels.organicSocialLinktree.pageViews.value)} sub="utm_source=social" color={colors.teal} />
          <StatCard label="Linktree Active Users" value={fmt(d.utmChannels.organicSocialLinktree.activeUsers.value)} sub="utm_source=social" color={colors.teal} />
          <StatCard label="Groups Page Views" value={fmt(d.utmChannels.organicSocialGroups.pageViews.value)} sub="utm_source=groups" color={colors.navy} />
          <StatCard label="Groups Active Users" value={fmt(d.utmChannels.organicSocialGroups.activeUsers.value)} sub="utm_source=groups" color={colors.navy} />
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

// ── Placeholder card (muted, greyed accent) for "Data coming" metrics ────────

function PlaceholderCard({ label, note, compact }: { label: string; note: string; compact?: boolean }) {
  const pad = compact ? '20px 22px 18px' : '24px 24px 22px'
  const valueSz = compact ? '22px' : '28px'
  const noteSz = compact ? '11px' : '11.5px'
  return (
    <div style={{
      position: 'relative',
      background: colors.surfaceAlt,
      border: `1px solid ${colors.border}`,
      borderRadius: '14px',
      padding: pad,
      boxShadow: shadow.sm,
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: colors.faint }} />
      <div style={{ fontFamily: fonts.sans, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: colors.faint, textTransform: 'uppercase', marginBottom: '12px' }}>
        {label}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: valueSz, fontWeight: 600, color: colors.faint, lineHeight: 1, marginBottom: '8px' }}>
        Data coming
      </div>
      <div style={{ fontFamily: fonts.sans, fontSize: noteSz, color: colors.faint }}>
        {note}
      </div>
    </div>
  )
}

// ── Meta Ad Creatives table ──────────────────────────────────────────────────

function MetaCreativesTable({ creatives, totalAmountSpent }: {
  creatives: MetaCreative[]
  totalAmountSpent: number | null
}) {
  const active = creatives.filter(c => c.status === 'active')
  const totalImpressions = active.reduce((s, c) => s + (c.impressions ?? 0), 0)
  const totalLPV = active.reduce((s, c) => s + (c.landingPageViews ?? 0), 0)

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

  const fmtCurrency = (n: number | null) => n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
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
                  {c.permalink
                    ? <a href={c.permalink} target="_blank" rel="noreferrer"
                        style={{ fontWeight: 600, color: colors.ink, textDecoration: 'underline', textDecorationColor: colors.border }}>
                        {c.name}
                      </a>
                    : <span style={{ fontWeight: 600, color: colors.ink }}>{c.name}</span>
                  }
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
