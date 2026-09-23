import type { Period, PublicSiteInfo } from '@traks/shared';
import { ApiError, api, type AnalyticsFilters } from '@/lib/api';

/**
 * The stats calls a dashboard makes, as one swappable object: the signed-in
 * dashboard uses `api`, a public share page uses `publicStatsApi`, and the
 * dashboard component itself doesn't care which.
 */
export type StatsApi = Pick<
  typeof api,
  | 'getAllStats'
  | 'getMainStats'
  | 'getTimeseries'
  | 'getTopPages'
  | 'getTopReferrers'
  | 'getAiSources'
  | 'getUtm'
  | 'getLocations'
  | 'getDevices'
  | 'getGoalStats'
  | 'getFunnelStats'
  | 'getEvents'
  | 'getEventProps'
  | 'getLinks'
  | 'getBots'
  | 'getWebmcp'
>;

type Query = Record<string, string | undefined>;

/**
 * GET against the public API. Unlike the signed-in client this never
 * redirects to /login: a share page has no session, and a 404 means the site
 * stopped being public (or that section isn't shared).
 */
async function publicGet(path: string, query: Query = {}): Promise<any> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  const res = await fetch(`/api/public${path}${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error) message = body.error;
    } catch {
      /* keep the status message */
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

const stats = (siteId: string, endpoint: string, query: Query): Promise<any> =>
  publicGet(`/analytics/${encodeURIComponent(siteId)}/stats/${endpoint}`, query);

/** Links, bots and agent tools are never part of a public dashboard. */
const notShared = (): Promise<never> => Promise.reject(new ApiError(404, 'Not shared'));

export const publicStatsApi: StatsApi = {
  getAllStats: (siteId: string, period: Period) => stats(siteId, 'all', { period }),
  getMainStats: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'main', { period, ...filters }),
  getTimeseries: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'timeseries', { period, ...filters }),
  getTopPages: (
    siteId: string,
    period: Period,
    type: 'top' | 'entry' | 'exit',
    filters?: AnalyticsFilters
  ) => stats(siteId, 'pages', { period, type, ...filters }),
  getTopReferrers: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'referrers', { period, ...filters }),
  getAiSources: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'ai-sources', { period, ...filters }),
  getUtm: (
    siteId: string,
    period: Period,
    type: 'source' | 'medium' | 'campaign',
    filters?: AnalyticsFilters
  ) => stats(siteId, 'utm', { period, type, ...filters }),
  getLocations: (
    siteId: string,
    period: Period,
    type: 'country' | 'region' | 'city',
    filters?: AnalyticsFilters
  ) => stats(siteId, 'locations', { period, type, ...filters }),
  getDevices: (
    siteId: string,
    period: Period,
    type: 'browser' | 'os' | 'device' | 'size',
    filters?: AnalyticsFilters
  ) => stats(siteId, 'devices', { period, type, ...filters }),
  getGoalStats: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'goals', { period, ...filters }),
  getFunnelStats: (siteId: string, funnelId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, `funnel/${encodeURIComponent(funnelId)}`, { period, ...filters }),
  getEvents: (siteId: string, period: Period, filters?: AnalyticsFilters) =>
    stats(siteId, 'events', { period, ...filters }),
  getEventProps: (siteId: string, period: Period, event: string, filters?: AnalyticsFilters) =>
    stats(siteId, 'event-props', { period, event, ...filters }),
  getLinks: notShared,
  getBots: notShared,
  getWebmcp: notShared,
};

/** Share-page bootstrap: the site's identity and which sections it shares. */
export async function getPublicSite(siteId: string): Promise<{ data: PublicSiteInfo }> {
  return publicGet(`/sites/${encodeURIComponent(siteId)}`);
}
