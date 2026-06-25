import { colors } from './theme'

export type ChannelStatus = 'live' | 'coming'

export type ChannelDef = {
  id: string
  label: string
  sub: string
  status: ChannelStatus
  accentColor: string
  utmFilter?: {
    sessionMedium: string
    sessionSource?: string
    utmContent?: string
  }
  waitingOn?: string
}

// Single config map for all campaign channels. UTM values here are the
// authoritative source — ga4.ts derives its UTM_CHANNELS from utmFilter entries.
// utmContent is defined for documentation but not currently used in GA4 queries.
export const CHANNELS: Record<string, ChannelDef> = {
  churchFacing: {
    id: 'church-facing',
    label: 'Church Facing',
    sub: 'at-the-movies · direct/organic member traffic (no campaign UTM)',
    status: 'live',
    accentColor: colors.slate,
  },
  metaAd: {
    id: 'meta-ad',
    label: 'Meta Ads',
    sub: 'atm-social · all traffic',
    status: 'live',
    accentColor: colors.orange,
  },
  metaFollowupEmail: {
    id: 'meta-followup-email',
    label: 'Meta Follow-up Email',
    sub: 'at-the-movies · utm_medium=email · HubSpot freebie follow-up (source varies: hs_automation, hs_email)',
    status: 'live',
    accentColor: colors.orange,
    utmFilter: { sessionMedium: 'email' },
  },
  podcast: {
    id: 'podcast',
    label: 'Podcast',
    sub: 'at-the-movies · utm_medium=podcast · utm_source=youtube · utm_content=atm',
    status: 'coming',
    accentColor: colors.slate,
    utmFilter: { sessionMedium: 'podcast', sessionSource: 'youtube', utmContent: 'atm' },
    waitingOn: 'Awaiting UTM traffic from podcast links',
  },
  movieTheaters: {
    id: 'movie-theaters',
    label: 'Movie Theaters',
    sub: 'at-the-movies · utm_medium=theaters · utm_source=video · utm_content=movies',
    status: 'coming',
    accentColor: colors.lpGray,
    utmFilter: { sessionMedium: 'theaters', sessionSource: 'video', utmContent: 'movies' },
    waitingOn: 'Awaiting UTM traffic from theater links',
  },
  eNews: {
    id: 'e-news',
    label: 'E News',
    sub: 'at-the-movies · utm_medium=e_news · utm_source=email',
    status: 'coming',
    accentColor: colors.orange,
    utmFilter: { sessionMedium: 'e_news', sessionSource: 'email' },
    waitingOn: 'Awaiting UTM traffic from E News email',
  },
  kidsNewsletter: {
    id: 'kids-newsletter',
    label: 'Kids Newsletter',
    sub: 'at-the-movies · utm_medium=kids_newsletter · utm_source=email',
    status: 'coming',
    accentColor: colors.orange,
    utmFilter: { sessionMedium: 'kids_newsletter', sessionSource: 'email' },
    waitingOn: 'Awaiting UTM traffic from Kids Newsletter',
  },
  invite: {
    id: 'invite',
    label: 'Invite',
    sub: 'at-the-movies · utm_medium=stand_alone_1 · utm_source=email · utm_content=invite',
    status: 'coming',
    accentColor: colors.orange,
    utmFilter: { sessionMedium: 'stand_alone_1', sessionSource: 'email', utmContent: 'invite' },
    waitingOn: 'Awaiting UTM traffic from Invite email',
  },
  organicSocialLinktree: {
    id: 'organic-social-linktree',
    label: 'Organic Social — Linktree',
    sub: 'at-the-movies · utm_medium=organic_social · utm_source=social',
    status: 'coming',
    accentColor: colors.slate,
    utmFilter: { sessionMedium: 'organic_social', sessionSource: 'social' },
    waitingOn: 'Awaiting UTM traffic from Linktree',
  },
  organicSocialGroups: {
    id: 'organic-social-groups',
    label: 'Organic Social — Facebook Groups',
    sub: 'at-the-movies · utm_medium=organic_social · utm_source=groups',
    status: 'coming',
    accentColor: colors.slate,
    utmFilter: { sessionMedium: 'organic_social', sessionSource: 'groups' },
    waitingOn: 'Awaiting UTM traffic from Facebook groups',
  },
}
