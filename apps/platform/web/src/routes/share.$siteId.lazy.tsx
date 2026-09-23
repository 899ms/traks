import { useEffect, type ReactElement } from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, EyeOff } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { getPublicSite } from '@/lib/publicApi';
import { SiteDashboard } from './portal.site.$siteId.lazy';

export const Route = createLazyFileRoute('/share/$siteId')({
  component: SharePage,
});

/**
 * A site's public dashboard. Anyone with the link can read it; nothing here
 * needs or uses a session. The owner decides in Share settings whether the
 * site is public and which optional sections come along.
 */
function SharePage(): ReactElement {
  const { siteId } = Route.useParams();
  const search = Route.useSearch();

  const siteQ = useQuery({
    queryKey: ['public-site', siteId],
    queryFn: () => getPublicSite(siteId),
    staleTime: 60_000,
    // A 404 is an answer (not public / no such site), not a blip.
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });
  const site = siteQ.data?.data;

  // Share links are for the people they're sent to, not search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (!site) return;
    const previous = document.title;
    document.title = `${site.name} analytics · Traks`;
    return () => {
      document.title = previous;
    };
  }, [site]);

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {/* 56px, like the signed-in header, so the dashboard's sticky toolbar
          (top-14) sits flush beneath it. */}
      <header className="sticky top-0 z-40 border-b border-[#ECEAE5] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Traks" className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#3D3B4F]">
              Traks
            </span>
            <span className="rounded-[6px] bg-[#F2F1ED] px-1.5 py-0.5 text-[11px] font-medium text-[#6E6C7C]">
              Public dashboard
            </span>
          </div>
          <a
            href="https://traks.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#6E6C7C] transition-colors hover:text-[#3D3B4F]"
          >
            Analytics by Traks
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {site ? (
        <SiteDashboard siteId={siteId} search={search} shared={site} />
      ) : siteQ.isPending ? (
        <div className="py-24 text-center text-[14px] text-[#9B9590]">Loading…</div>
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-[20px] bg-white px-8 py-16 text-center shadow-float">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F1ED]">
              <EyeOff className="h-6 w-6 text-[#9B9590]" strokeWidth={1.7} />
            </div>
            <p className="text-[17px] font-semibold text-[#3D3B4F]">
              {siteQ.error instanceof ApiError && siteQ.error.status === 404
                ? 'This dashboard isn’t public'
                : 'Couldn’t load this dashboard'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[14px] text-[#9B9590]">
              {siteQ.error instanceof ApiError && siteQ.error.status === 404
                ? 'The link may be wrong, or the owner has stopped sharing it.'
                : 'Check your connection and refresh the page.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
