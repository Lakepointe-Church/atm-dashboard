import { getDashboardData, type MetaCreative, type TiktokCreative, type TiktokData } from '@/lib/data'
import { colors, fonts, shadow } from '@/lib/theme'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Surface } from '@/components/ui/Surface'
import { TrendChart } from '@/components/TrendChart'
import { DashboardTabs, FilterSection } from '@/components/ui/DashboardTabs'

export const dynamic = 'force-dynamic'

const CAMPAIGN_DATES = 'July 11 – August 2'

const FOOTNOTES = [
  'atm-social is distributed only via Meta ads, so its traffic ≈ ad traffic.',
  '"Paid Ads" groups campaign-wide metrics — GA4 page-path traffic, HubSpot form submissions, and follow-up email — because all paid platforms drive to the same landing pages and forms. "Meta Landing Views" under Meta Ads is Meta\'s own attribution, a distinct figure from the shared GA4 Page Views.',
  'The channel sections below (Podcast, Movie Theaters, Email, Organic Social) are UTM-filtered slices of the at-the-movies page. Channels show real data only once their links carry the correct UTM (utm_campaign=atm_2026).',
  '"Church Facing" = at-the-movies traffic with no campaign UTM (direct/organic member visits).',
  'HubSpot form views run higher than GA4 page views due to differences in how each tool tracks; GA4 is the more reliable traffic figure.',
  'Meta numbers are pulled live from the Meta Marketing API, filtered to the ATM 2026 campaign. data/meta.json remains as a fallback only.',
  'TikTok numbers are pulled live from the TikTok Marketing API (v1.3), filtered to the ATM 2026 Smart+ campaign. TikTok Landing Views is TikTok\'s own attribution — a distinct figure from GA4 Page Views. Leads show "—" because this campaign runs no lead event; its on-platform pixel conversions are an optimization signal, not lead counts, so they are not shown.',
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
const GRID_2 = 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))'

export default async function DashboardPage() {
  const d = await getDashboardData()

  return (
    <main className="page-main" style={{
      position: 'relative', zIndex: 1, maxWidth: '1120px', margin: '0 auto',
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="fade-up" style={{ marginBottom: '44px' }}>
        <div style={{
          fontFamily: fonts.sans, fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em',
          color: colors.orange, textTransform: 'uppercase', marginBottom: '14px',
        }}>
          Lakepointe Church · Campaign Analytics
        </div>
        <h1 style={{
          fontFamily: fonts.display, fontWeight: 700, fontSize: 'clamp(32px, 8vw, 54px)', letterSpacing: '-0.015em',
          color: colors.ink, lineHeight: 1.04, marginBottom: '14px', maxWidth: '16ch',
        }}>
          At the Movies
        </h1>
        <div style={{ fontFamily: fonts.sans, fontSize: '15px', color: colors.body, marginBottom: '18px' }}>
          Campaign performance · {CAMPAIGN_DATES}
        </div>
      </header>

      <DashboardTabs syncInfo={
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
              <span style={{ color: colors.orange, fontWeight: 600 }}>Seeded preview — syncs not yet live</span>
            </>
          )}
        </div>
      }>

      <FilterSection category="all">
      {/* ── Campaign Summary Strip ──────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader title="Campaign Summary" sub="All channels · at-a-glance totals" marginBottom="16px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <StatCard label="Total Page Views" value={fmt(d.summary.totalPageViews)} sub="all channels" color={colors.orange} compact />
          <StatCard label="Form Submissions" value={fmt(d.summary.totalFormSubmissions)} sub="HubSpot" color={colors.slate} compact />
          {d.sms
            ? <StatCard
                label="Total Texts"
                value={fmt(d.sms.keywords.reduce((sum, k) => sum + k.total, 0))}
                sub={d.sms.keywords.map(k => k.keyword.toUpperCase()).join(' + ')}
                color={colors.slate}
                compact
              />
            : <PlaceholderCard label="Total Texts" note="Awaiting Rock API" compact />
          }
          {d.summary.totalMetaSpend != null
            ? <StatCard label="Meta Spend" value={`$${fmt(Math.round(d.summary.totalMetaSpend))}`} sub="Meta API" color={colors.lpGray} compact />
            : <PlaceholderCard label="Meta Spend" note="Awaiting Meta data" compact />
          }
        </div>
      </section>

      {/* ── Church Facing ──────────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Church Facing"
          sub="at-the-movies · direct/organic member traffic (no campaign UTM)"
          accent={colors.slate}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px', marginBottom: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.churchFacing.pageViews.value)} color={colors.slate} />
          <StatCard label="GA4 Active Users" value={fmt(d.churchFacing.activeUsers.value)} color={colors.slate} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Page Views" accent={colors.slate}>
            <TrendChart series={[{ key: 'pageViews', label: 'page views', color: colors.slate, data: d.churchFacing.pageViews.history }]} />
          </ChartPanel>
          <ChartPanel title="Active Users" accent={colors.slate}>
            <TrendChart series={[{ key: 'activeUsers', label: 'active users', color: colors.slate, data: d.churchFacing.activeUsers.history }]} />
          </ChartPanel>
        </div>
      </section>
      </FilterSection>

      <FilterSection category="paid">
      {/* ── Paid Ads (shared, campaign-wide) ────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Paid Ads"
          sub="Campaign-wide · all paid platforms drive to the same landing pages & forms"
          accent={colors.orange}
          marginBottom="16px"
        />
        {/* Row 1 — campaign-wide KPIs. Video Views is promoted to 2nd position. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <StatCard label="GA4 Page Views" value={fmt(d.metaAd.pageViews.value)} color={colors.orange} />
          {(() => {
            // Combined Video Views = Meta 3-sec plays + TikTok 6-sec views.
            // PARTIAL-DATA RULE: a sum missing an input is not the metric. If
            // either platform's value is absent (pull failed / creds absent),
            // render awaiting and name the missing source — never the lone total.
            const metaVV = d.meta.videoPlays3s
            const tiktokVV = d.tiktok ? d.tiktok.videoViews6s : null
            if (metaVV != null && tiktokVV != null) {
              return (
                <StatCard
                  label="Video Views"
                  value={fmt(metaVV + tiktokVV)}
                  sub="Meta 3-sec plays + TikTok 6-sec views · platform-reported"
                  color={colors.orange}
                />
              )
            }
            const missing = [metaVV == null && 'Meta', tiktokVV == null && 'TikTok'].filter(Boolean).join(' + ')
            return <PlaceholderCard label="Video Views" note={`Awaiting ${missing} data`} />
          })()}
          <StatCard label="GA4 Active Users" value={fmt(d.metaAd.activeUsers.value)} color={colors.slate} />
          <StatCard label="Form Submissions" value={fmt(d.metaAd.formSubmissions.value)} sub="HubSpot" color={colors.slate} />
          <StatCard label="Form Conversion" value={`${d.metaAd.conversionRate.toFixed(1)}%`} sub="submissions ÷ page views" color={colors.slate} />
        </div>

        {/* Row 2 — follow-up email KPIs on their own line (a deliberate break, so
            row 1 doesn't leave a single orphaned card). Width is capped so the
            pair reads as ~1-card-wide each, matching row 1, instead of stretching. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 210px))', gap: '16px', marginBottom: '16px' }}>
          <StatCard label="Follow-up Email Views" value={fmt(d.utmChannels.metaFollowupEmail.pageViews.value)} sub="HubSpot freebie · utm_medium=email" color={colors.lpGray} />
          <StatCard label="Follow-up Email Users" value={fmt(d.utmChannels.metaFollowupEmail.activeUsers.value)} sub="HubSpot freebie · utm_medium=email" color={colors.lpGray} />
        </div>

        {/* Shared GA4 + form charts — total landing-page traffic, single-line (not per-platform). */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Page Views" accent={colors.orange}>
            <TrendChart series={[{ key: 'pageViews', label: 'page views', color: colors.orange, data: d.metaAd.pageViews.history }]} />
          </ChartPanel>
          <ChartPanel title="Active Users" accent={colors.slate}>
            <TrendChart series={[{ key: 'activeUsers', label: 'active users', color: colors.slate, data: d.metaAd.activeUsers.history }]} />
          </ChartPanel>
          <ChartPanel title="Form Submissions" accent={colors.slate}>
            <TrendChart series={[{ key: 'submissions', label: 'submissions', color: colors.slate, data: d.metaAd.formSubmissions.history }]} />
          </ChartPanel>
        </div>
        {d.seeded && (
          <div style={{ fontFamily: fonts.sans, fontSize: '12px', color: colors.muted, marginTop: '10px', paddingLeft: '4px' }}>
            Pre–Jun 16 trend points are illustrative placeholders until automated history accrues.
          </div>
        )}
      </section>

      {/* ── Meta Ad ────────────────────────────────────────── */}
      <section className="fade-up-2" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Meta Ads"
          sub="atm-social · Meta-attributed platform metrics"
          accent={colors.orange}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <StatCard label="Meta Landing Views" value={fmt(d.meta.landingPageViews)} sub="Meta API · Meta-attributed" color={colors.lpGray} />
          {d.meta.videoPlays3s != null
            ? <StatCard label="3-Second Video Plays" value={fmt(d.meta.videoPlays3s)} sub="Meta API · 3-second plays" color={colors.slate} />
            : <PlaceholderCard label="3-Second Video Plays" note="Awaiting Meta data" />
          }
          {d.metaAd.costPerLead != null && (
            <StatCard label="Cost per Lead" value={`$${d.metaAd.costPerLead.toFixed(2)}`} sub="total spend ÷ submissions" color={colors.lpGray} />
          )}
        </div>

        {d.meta.creatives.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <MetaCreativesTable creatives={d.meta.creatives} totalAmountSpent={d.meta.totalAmountSpent} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
          <ChartPanel title="Meta Landing Page Views" accent={colors.lpGray}>
            <TrendChart series={[{ key: 'meta', label: 'landing views', color: colors.lpGray, data: d.meta.history }]} />
          </ChartPanel>
        </div>
        {d.seeded && (
          <div style={{ fontFamily: fonts.sans, fontSize: '12px', color: colors.muted, marginTop: '10px', paddingLeft: '4px' }}>
            Pre–Jun 16 trend points are illustrative placeholders until automated history accrues.
          </div>
        )}
      </section>

      {/* ── TikTok Ads ─────────────────────────────────────── */}
      <TiktokSection tiktok={d.tiktok} />
      </FilterSection>

      <FilterSection category="text">
      {/* ── Podcast ────────────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Podcast"
          sub="at-the-movies · utm_medium=podcast · utm_source=youtube · utm_content=atm"
          accent={colors.slate}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          {(() => {
            const kw = d.sms?.keywords.find(k => k.keyword === 'atm')
            return kw
              ? <StatCard label="Texts — ATM" value={fmt(kw.total)} sub={`${fmt(kw.unique)} unique · ${fmt(kw.new)} new`} color={colors.slate} />
              : <PlaceholderCard label="Texts — ATM keyword" note={d.sms ? 'Keyword not yet in Rock data' : 'Awaiting Rock API'} />
          })()}
          <StatCard label="GA4 Page Views" value={fmt(d.utmChannels.podcast.pageViews.value)} color={colors.slate} />
          <StatCard label="GA4 Active Users" value={fmt(d.utmChannels.podcast.activeUsers.value)} color={colors.slate} />
        </div>
      </section>

      {/* ── Movie Theaters ─────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Movie Theaters"
          sub="at-the-movies · utm_medium=theaters · utm_source=video · utm_content=movies"
          accent={colors.lpGray}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          {(() => {
            const kw = d.sms?.keywords.find(k => k.keyword === 'movies')
            return kw
              ? <StatCard label="Texts — MOVIES" value={fmt(kw.total)} sub={`${fmt(kw.unique)} unique · ${fmt(kw.new)} new`} color={colors.lpGray} />
              : <PlaceholderCard label="Texts — MOVIES keyword" note={d.sms ? 'Keyword not yet in Rock data' : 'Awaiting Rock API'} />
          })()}
          <StatCard label="GA4 Page Views" value={fmt(d.utmChannels.movieTheaters.pageViews.value)} color={colors.lpGray} />
          <StatCard label="GA4 Active Users" value={fmt(d.utmChannels.movieTheaters.activeUsers.value)} color={colors.lpGray} />
        </div>
      </section>
      </FilterSection>

      <FilterSection category="email">
      {/* ── Email ──────────────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '44px' }}>
        <SectionHeader
          title="Email"
          sub="at-the-movies · utm_source=email · split by utm_medium"
          accent={colors.orange}
          marginBottom="16px"
        />
        <div className="email-grid">
          {/* Rows 1–3: stat card pairs (cols 1–2). Chart auto-placed at col 3 on desktop, full-width last row on mobile. */}
          <StatCard label="E News Page Views"   value={fmt(d.utmChannels.eNews.pageViews.value)}   sub="utm_medium=e_news" color={colors.orange} />
          <StatCard label="E News Active Users" value={fmt(d.utmChannels.eNews.activeUsers.value)} sub="utm_medium=e_news" color={colors.orange} />
          <StatCard label="Kids Newsletter Page Views"   value={fmt(d.utmChannels.kidsNewsletter.pageViews.value)}   sub="utm_medium=kids_newsletter" color={colors.slate} />
          <StatCard label="Kids Newsletter Active Users" value={fmt(d.utmChannels.kidsNewsletter.activeUsers.value)} sub="utm_medium=kids_newsletter" color={colors.slate} />
          <StatCard label="Invite Page Views"   value={fmt(d.utmChannels.invite.pageViews.value)}   sub="utm_medium=stand_alone_1" color={colors.lpGray} />
          <StatCard label="Invite Active Users" value={fmt(d.utmChannels.invite.activeUsers.value)} sub="utm_medium=stand_alone_1" color={colors.lpGray} />
          <div className="email-chart-col">
            <Surface padding="20px 22px 14px" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: colors.orange }} />
                <div style={{ fontFamily: fonts.sans, fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: colors.body, textTransform: 'uppercase' }}>
                  Email Channels — Page Views
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <TrendChart
                  height={280}
                  series={[
                    { key: 'eNews',          label: 'E News',          color: colors.orange, data: d.utmChannels.eNews.pageViews.history },
                    { key: 'kidsNewsletter', label: 'Kids Newsletter', color: colors.slate,   data: d.utmChannels.kidsNewsletter.pageViews.history },
                    { key: 'invite',         label: 'Invite',          color: colors.lpGray,  data: d.utmChannels.invite.pageViews.history },
                  ]}
                />
              </div>
            </Surface>
          </div>
        </div>
      </section>
      </FilterSection>

      <FilterSection category="social">
      {/* ── Organic Social ─────────────────────────────────── */}
      <section className="fade-up-3" style={{ marginBottom: '52px' }}>
        <SectionHeader
          title="Organic Social"
          sub="at-the-movies · utm_medium=organic_social · split by utm_source"
          accent={colors.slate}
          marginBottom="16px"
        />
        <div style={{ display: 'grid', gridTemplateColumns: GRID_4, gap: '16px' }}>
          <StatCard label="Linktree Page Views" value={fmt(d.utmChannels.organicSocialLinktree.pageViews.value)} sub="utm_source=social" color={colors.slate} />
          <StatCard label="Linktree Active Users" value={fmt(d.utmChannels.organicSocialLinktree.activeUsers.value)} sub="utm_source=social" color={colors.slate} />
          <StatCard label="Groups Page Views" value={fmt(d.utmChannels.organicSocialGroups.pageViews.value)} sub="utm_source=groups" color={colors.slate} />
          <StatCard label="Groups Active Users" value={fmt(d.utmChannels.organicSocialGroups.activeUsers.value)} sub="utm_source=groups" color={colors.slate} />
        </div>
      </section>
      </FilterSection>

      {/* ── Footnotes — always visible regardless of the active channel filter. */}
      <section className="fade-up-4">
        <SectionHeader title="How to read these numbers" accent={colors.lpGray} marginBottom="14px" />
        <Surface padding="22px 26px">
          <ul style={{ listStyle: 'none', display: 'grid', gap: '12px' }}>
            {FOOTNOTES.map((note, i) => (
              <li key={i} style={{
                fontFamily: fonts.sans, fontSize: '13.5px', color: colors.body,
                lineHeight: 1.55, paddingLeft: '20px', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, top: '1px', color: colors.orange, fontWeight: 700 }}>•</span>
                {note}
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      </DashboardTabs>
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
  const totalLeads = active.reduce((s, c) => s + (c.leads ?? 0), 0)
  const totalVideoPlays3s = active.reduce((s, c) => s + (c.videoPlays3s ?? 0), 0)
  const hasLeads = active.some(c => c.leads != null)
  const hasVideoPlays = active.some(c => c.videoPlays3s != null)

  const TH = ({ children, right, wrap }: { children: React.ReactNode; right?: boolean; wrap?: boolean }) => (
    <th style={{
      fontFamily: fonts.sans, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: colors.label, padding: '10px 14px',
      textAlign: right ? 'right' : 'left', borderBottom: `1px solid ${colors.border}`,
      whiteSpace: wrap ? 'normal' : 'nowrap',
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
              <TH>Ad Set</TH>
              <TH>Impressions</TH>
              <TH right wrap>Outbound Clicks</TH>
              <TH right wrap>Landing Page Views</TH>
              {hasLeads && <TH right>Leads</TH>}
              {hasLeads && <TH right>Cost / Lead</TH>}
              <TH right wrap>Amount Spent</TH>
              <TH right>Cost / LPV</TH>
              {hasVideoPlays && <TH right wrap>3-Sec Plays</TH>}
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
                <TD muted={!c.adsetName}>{c.adsetName ?? '—'}</TD>
                <TD right>{fmtNum(c.impressions)}</TD>
                <TD right muted={c.outboundClicks == null}>{fmtNum(c.outboundClicks)}</TD>
                <TD right>{fmtNum(c.landingPageViews)}</TD>
                {hasLeads && <TD right muted={c.leads == null}>{fmtNum(c.leads)}</TD>}
                {hasLeads && <TD right muted={c.costPerLead == null}>{fmtCurrency(c.costPerLead)}</TD>}
                <TD right>{fmtCurrency(c.amountSpent)}</TD>
                <TD right muted={c.costPerLpv == null}>{fmtCurrency(c.costPerLpv)}</TD>
                {hasVideoPlays && <TD right muted={c.videoPlays3s == null}>{fmtNum(c.videoPlays3s)}</TD>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${colors.borderStrong}`, background: colors.surfaceAlt }}>
              <TD bold>Total (active ads)</TD>
              <TD muted>—</TD>
              <TD right bold>{totalImpressions.toLocaleString('en-US')}</TD>
              <TD right muted>—</TD>
              <TD right bold>{totalLPV.toLocaleString('en-US')}</TD>
              {hasLeads && <TD right bold>{totalLeads > 0 ? totalLeads.toLocaleString('en-US') : '—'}</TD>}
              {hasLeads && <TD right muted>—</TD>}
              <TD right bold>{fmtCurrency(totalAmountSpent)}</TD>
              <TD right muted>—</TD>
              {hasVideoPlays && <TD right bold>{totalVideoPlays3s.toLocaleString('en-US')}</TD>}
            </tr>
          </tfoot>
        </table>
      </div>
    </Surface>
  )
}

// ── TikTok Ads section ───────────────────────────────────────────────────────
// Platform-native only (no GA4/HubSpot here — that lives in the shared Paid Ads
// block). Renders "awaiting data" placeholders when the pull failed / creds are
// absent (tiktok === null). A stored 0 is a confirmed real zero and shows as 0.

function TiktokSection({ tiktok }: { tiktok: TiktokData | null }) {
  return (
    <section className="fade-up-2" style={{ marginBottom: '52px' }}>
      <SectionHeader
        title="TikTok Ads"
        sub="TikTok Marketing API · ATM 2026 Smart+ · platform-attributed metrics"
        accent={colors.slate}
        marginBottom="16px"
      />
      {tiktok
        ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <StatCard label="Amount Spent"      value={`$${fmt(Math.round(tiktok.spend))}`} sub="TikTok API"          color={colors.orange} />
              <StatCard label="Impressions"       value={fmt(tiktok.impressions)}             sub="TikTok API"          color={colors.slate} />
              <StatCard label="Clicks"            value={fmt(tiktok.clicks)}                  sub="destination clicks"  color={colors.slate} />
              <StatCard label="TikTok Landing Views" value={fmt(tiktok.landingPageViews)}     sub="TikTok-attributed"   color={colors.lpGray} />
              <StatCard label="Video Views"       value={fmt(tiktok.videoViews)}              sub="video plays"         color={colors.slate} />
              <StatCard label="6-Sec Views"       value={fmt(tiktok.videoViews6s)}            sub="focused views"       color={colors.lpGray} />
              <StatCard label="100% Completions"  value={fmt(tiktok.videoViewsP100)}          sub="watched to end"      color={colors.lpGray} />
            </div>

            {tiktok.creatives.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <TiktokCreativesTable creatives={tiktok.creatives} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: GRID_2, gap: '16px' }}>
              <ChartPanel title="TikTok Landing Page Views" accent={colors.slate}>
                <TrendChart series={[{ key: 'tiktokLpv', label: 'landing views', color: colors.slate, data: tiktok.history }]} />
              </ChartPanel>
            </div>
          </>
        )
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {['Amount Spent', 'Impressions', 'Clicks', 'TikTok Landing Views', 'Video Views', '6-Sec Views', '100% Completions'].map(label => (
              <PlaceholderCard key={label} label={label} note="Awaiting TikTok API" />
            ))}
          </div>
        )}
    </section>
  )
}

// ── TikTok Ad Creatives table ────────────────────────────────────────────────
// Mirrors the Meta table. Rows key on ad_id (Smart+ replicates a creative across
// ad groups, so ad_name repeats). Leads render "—" for every row — this campaign
// has no lead event; an honest dash beats a misleading number (Gate A decision).

// TikTok ad_name is the full asset filename with a human label appended after
// the media extension, e.g. "2026_atm_ad-4_notebook_..._final_x.mp4_The Note Book
// Spoof". Show just the trailing label so the table fits without side-scroll.
function tiktokLabel(name: string): string {
  const m = name.match(/\.(?:mp4|mov|webm|jpe?g|png|gif)_(.+)$/i)
  return (m ? m[1] : name).trim()
}

function TiktokCreativesTable({ creatives }: { creatives: TiktokCreative[] }) {
  const sum = (pick: (c: TiktokCreative) => number | null) =>
    creatives.reduce((s, c) => s + (pick(c) ?? 0), 0)
  const totalSpent = sum(c => c.amountSpent)
  const totalImpr = sum(c => c.impressions)
  const totalClicks = sum(c => c.clicks)
  const totalLpv = sum(c => c.landingPageViews)
  const totalViews = sum(c => c.videoViews)
  const totalViews6s = sum(c => c.videoViews6s)
  const totalP100 = sum(c => c.videoViewsP100)

  const TH = ({ children, right, wrap }: { children: React.ReactNode; right?: boolean; wrap?: boolean }) => (
    <th style={{
      fontFamily: fonts.sans, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: colors.label, padding: '10px 14px',
      textAlign: right ? 'right' : 'left', borderBottom: `1px solid ${colors.border}`,
      whiteSpace: wrap ? 'normal' : 'nowrap',
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
              <TH>Ad Group</TH>
              <TH right>Impressions</TH>
              <TH right>Clicks</TH>
              <TH right wrap>Landing Page Views</TH>
              <TH right>Leads</TH>
              <TH right wrap>Amount Spent</TH>
              <TH right>Cost / LPV</TH>
              <TH right>Video Views</TH>
              <TH right wrap>6-Sec Views</TH>
              <TH right>100%</TH>
            </tr>
          </thead>
          <tbody>
            {creatives.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? colors.surface : colors.surfaceAlt }}>
                <TD><span style={{ fontWeight: 600, color: colors.ink }}>{tiktokLabel(c.name)}</span></TD>
                <TD muted={!c.adgroupName}>{c.adgroupName ?? '—'}</TD>
                <TD right>{fmtNum(c.impressions)}</TD>
                <TD right>{fmtNum(c.clicks)}</TD>
                <TD right>{fmtNum(c.landingPageViews)}</TD>
                <TD right muted>—</TD>
                <TD right>{fmtCurrency(c.amountSpent)}</TD>
                <TD right muted={c.costPerLpv == null}>{fmtCurrency(c.costPerLpv)}</TD>
                <TD right>{fmtNum(c.videoViews)}</TD>
                <TD right>{fmtNum(c.videoViews6s)}</TD>
                <TD right>{fmtNum(c.videoViewsP100)}</TD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${colors.borderStrong}`, background: colors.surfaceAlt }}>
              <TD bold>Total (shown ads)</TD>
              <TD muted>—</TD>
              <TD right bold>{totalImpr.toLocaleString('en-US')}</TD>
              <TD right bold>{totalClicks.toLocaleString('en-US')}</TD>
              <TD right bold>{totalLpv.toLocaleString('en-US')}</TD>
              <TD right muted>—</TD>
              <TD right bold>{fmtCurrency(totalSpent)}</TD>
              <TD right bold>{totalLpv > 0 ? fmtCurrency(totalSpent / totalLpv) : '—'}</TD>
              <TD right bold>{totalViews.toLocaleString('en-US')}</TD>
              <TD right bold>{totalViews6s.toLocaleString('en-US')}</TD>
              <TD right bold>{totalP100.toLocaleString('en-US')}</TD>
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
