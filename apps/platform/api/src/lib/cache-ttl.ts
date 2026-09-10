import type { Period } from '@traks/shared';

/**
 * Result cache TTL per period. Long windows barely change; 'today' tracks
 * ingest. The SQL text embeds `now` quantized to this TTL, so the TTL is also
 * the cache-key bucket - the pre-warm cron aligns to the same boundaries.
 */
export function cacheTtlSeconds(period: Period): number {
  switch (period) {
    case 'today':
      return 60;
    default:
      return 900;
  }
}

/** How long after a window closes before its scan is trusted as complete.
 *  The Pipelines sink rolls files on a multi-minute interval, so a scan run
 *  right after midnight can miss the last minutes of yesterday. */
const SETTLE_MS = 60 * 60 * 1000;
const SETTLED_TTL_SECONDS = 24 * 60 * 60;

/**
 * Freshness TTL for a result, given the window it covers. 'yesterday' is
 * settled data whose SQL only changes at midnight, so one scan per day is
 * the right cost - the generic 15-minute TTL re-scanned its nine dashboard
 * queries in the background every bucket for numbers that cannot change.
 *
 * The TTL is the time since the window settled (floored at the generic TTL
 * so it still reaches KV, capped at a day). Freshness is `age < ttl`, so
 * an entry is fresh exactly when it was fetched after the settle point: a
 * scan run in the first hour after midnight is served once past that hour,
 * then refreshed behind the response like any stale entry.
 */
export function freshTtlSeconds(period: Period, range: { to: string }): number {
  const base = cacheTtlSeconds(period);
  if (period !== 'yesterday') return base;
  const sinceSettled = (Date.now() - (Date.parse(range.to) + SETTLE_MS)) / 1000;
  return Math.max(base, Math.min(SETTLED_TTL_SECONDS, sinceSettled));
}
