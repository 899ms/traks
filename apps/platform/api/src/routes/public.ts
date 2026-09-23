import { Hono, type Context, type Next } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { PublicSiteInfo } from '@traks/shared';
import { funnels, sites } from '../db/schema';
import type { Bindings, Variables } from '../types';

type Env = { Bindings: Bindings; Variables: Variables };

type Section = 'traffic' | 'goals' | 'funnels' | 'events';

/**
 * Which analytics endpoints a public dashboard may call, and the section each
 * one belongs to. Anything not listed - realtime, links, bots, agent tools,
 * batch stats, the internal pre-warm hook - is not public.
 */
function sectionFor(endpoint: string): Section | null {
  switch (endpoint) {
    case 'stats/all':
    case 'stats/main':
    case 'stats/timeseries':
    case 'stats/pages':
    case 'stats/referrers':
    case 'stats/ai-sources':
    case 'stats/utm':
    case 'stats/locations':
    case 'stats/devices':
      return 'traffic';
    case 'stats/goals':
      return 'goals';
    case 'stats/events':
    case 'stats/event-props':
      return 'events';
    default:
      return /^stats\/funnel\/[^/]+$/.test(endpoint) ? 'funnels' : null;
  }
}

async function loadPublicSite(
  c: Context<Env>,
  siteId: string
): Promise<typeof sites.$inferSelect | null> {
  const [site] = await c
    .get('db')!
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.public, true)))
    .limit(1);
  return site ?? null;
}

/**
 * Guards /api/public/analytics/* - the regular analytics routes mounted a
 * second time for share pages. Only a public site, only an allow-listed
 * endpoint, and only a section the owner shared get through; everything else
 * is a 404 (never a 403 - don't confirm what exists). On success it sets
 * `publicSite`, which the handlers' site lookup honors instead of a user.
 */
export async function publicAnalyticsGate(c: Context<Env>, next: Next): Promise<Response | void> {
  const notFound = (): Response => c.json({ error: 'Not found' }, 404);
  if (c.req.method !== 'GET') return notFound();
  const match = /^\/api\/public\/analytics\/([^/]+)\/(.+)$/.exec(c.req.path);
  if (!match) return notFound();
  const [, siteId, endpoint] = match;

  const section = sectionFor(endpoint);
  if (!section) return notFound();

  const site = await loadPublicSite(c, siteId);
  if (!site) return notFound();
  const shared =
    section === 'traffic' ||
    (section === 'goals' && site.publicGoals) ||
    (section === 'funnels' && site.publicFunnels) ||
    (section === 'events' && site.publicEvents);
  if (!shared) return notFound();

  c.set('publicSite', { siteId: site.id, timezone: site.timezone });
  await next();
}

/** Share-page bootstrap: who the site is and which sections it shares. */
export const publicRoute = new Hono<Env>().get('/sites/:siteId', async c => {
  const site = await loadPublicSite(c, c.req.param('siteId'));
  if (!site) return c.json({ error: 'Not found' }, 404);

  const info: PublicSiteInfo = {
    id: site.id,
    name: site.name,
    domain: site.domain,
    favicon: site.favicon ?? null,
    timezone: site.timezone,
    sections: {
      goals: site.publicGoals,
      funnels: site.publicFunnels,
      events: site.publicEvents,
    },
  };
  if (site.publicFunnels) {
    const rows = await c
      .get('db')!
      .select({ id: funnels.id, name: funnels.name, steps: funnels.steps })
      .from(funnels)
      .where(eq(funnels.siteId, site.id));
    info.funnels = rows;
  }
  return c.json({ data: info });
});
