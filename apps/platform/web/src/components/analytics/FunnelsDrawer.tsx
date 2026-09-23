import { useEffect, useState, type ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { FunnelDef, FunnelStep } from '@traks/shared';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TypeChip } from './TypeChip';

/** Search only earns its space once the list is long enough to lose things in. */
const SEARCH_THRESHOLD = 8;

function stepLabel(s: FunnelStep): string {
  return s.propKey && s.propValue ? `${s.target} · ${s.propKey}=${s.propValue}` : s.target;
}

const MENU_ITEM =
  'rounded-[10px] text-[12.5px] text-[#3D3B4F] hover:bg-[#F2F1ED] focus:bg-[#F2F1ED]';

/**
 * Right-side drawer listing every funnel on the site. Adding and editing
 * hand off to the FunnelFormModal (the dashboard closes the drawer first);
 * delete is inline with a second-click confirm. Same shape as GoalsDrawer.
 */
export function FunnelsDrawer({
  open,
  onOpenChange,
  siteId,
  siteLabel,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDuplicate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  /** Shown under the title, e.g. the site domain. */
  siteLabel?: string;
  /** The funnel currently shown in the panel, marked in the list. */
  selectedId?: string | null;
  /** Shows the funnel in the dashboard panel. */
  onSelect?: (id: string) => void;
  onAdd: () => void;
  onEdit: (funnel: FunnelDef) => void;
  onDuplicate?: (funnel: FunnelDef) => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError('');
      setQuery('');
      setConfirmId(null);
    }
  }, [open]);

  const funnelsQ = useQuery({
    queryKey: ['site-funnels', siteId],
    queryFn: async () => api.getFunnels(siteId),
    enabled: open,
    staleTime: 60_000,
  });

  const deleteFunnel = useMutation({
    mutationFn: async (funnelId: string) => api.deleteFunnel(siteId, funnelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-funnels', siteId] });
      // A funnel change only moves the funnel panel - not the whole dashboard.
      queryClient.invalidateQueries({ queryKey: ['site-analytics', siteId, 'funnel'] });
      setConfirmId(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const funnels = ((funnelsQ.data as any)?.data ?? []) as FunnelDef[];
  const showSearch = funnels.length > SEARCH_THRESHOLD;
  const q = query.trim().toLowerCase();
  const visible = q
    ? funnels.filter(
        f =>
          f.name.toLowerCase().includes(q) ||
          f.steps.some(s => stepLabel(s).toLowerCase().includes(q))
      )
    : funnels;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} className="max-w-[460px]">
      <DrawerHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-start justify-between gap-3 pr-2">
          <div className="min-w-0">
            <DrawerTitle>Funnels</DrawerTitle>
            <DrawerDescription className="truncate">
              {funnelsQ.isLoading
                ? 'Loading…'
                : `${funnels.length} ${funnels.length === 1 ? 'funnel' : 'funnels'}${siteLabel ? ` · ${siteLabel}` : ''}`}
            </DrawerDescription>
          </div>
          <button
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#3D3B4F] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2C2B3B] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add funnel
          </button>
        </div>
      </DrawerHeader>

      <DrawerBody>
        {showSearch && (
          <div className="mb-2 flex h-[34px] items-center gap-2 rounded-xl bg-[#F2F1ED] px-3 focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_var(--ring)] transition-shadow">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#B5B0AA]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search funnels"
              className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] text-[#3D3B4F] outline-none placeholder:text-[#B5B0AA]"
            />
          </div>
        )}

        {funnelsQ.isError && (
          <p className="py-6 text-center text-[12.5px] text-[#e07a5f]">
            Couldn&rsquo;t load your funnels.
          </p>
        )}
        {funnelsQ.isLoading && (
          <div className="space-y-2 pt-1">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-8 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
        {!funnelsQ.isLoading && !funnelsQ.isError && funnels.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[13px] font-medium text-[#9B9590]">No funnels yet</p>
            <p className="mt-1 text-[12px] text-[#B5B0AA]">
              Chain pages and events into ordered steps to see where visitors drop off.
            </p>
          </div>
        )}
        {q && funnels.length > 0 && visible.length === 0 && (
          <p className="py-8 text-center text-[12.5px] text-[#9B9590]">
            No funnels match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        <ul className="space-y-2">
          {visible.map(funnel => {
            const confirming = confirmId === funnel.id;
            const isSelected = funnel.id === selectedId;
            return (
              <li
                key={funnel.id}
                className={cn(
                  'rounded-[14px] p-3.5 transition-colors',
                  confirming ? 'bg-[#fdf1ed]' : 'bg-[#F9F8F6] hover:bg-[#F2F1ED]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onEdit(funnel)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    title="Edit funnel"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-[#3D3B4F]">
                        {funnel.name}
                      </span>
                      {isSelected && (
                        <span className="shrink-0 rounded-full bg-white px-[7px] text-[10.5px] font-medium text-[#6E6C7C] shadow-[0_0_0_1px_#E6E4DE]">
                          on dashboard
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-[#9B9590]">
                      {funnel.steps.length} steps
                    </span>
                  </button>
                  {!confirming && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`${funnel.name} options`}
                        className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9B9590] hover:bg-[#E6E4DE] hover:text-[#3D3B4F] transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-52 border-0 p-1.5 shadow-float-lg">
                        <DropdownMenuItem onClick={() => onEdit(funnel)} className={MENU_ITEM}>
                          <Pencil className="h-3.5 w-3.5 text-[#6E6C7C]" />
                          Edit
                        </DropdownMenuItem>
                        {onSelect && !isSelected && (
                          <DropdownMenuItem
                            onClick={() => onSelect(funnel.id)}
                            className={MENU_ITEM}
                          >
                            <Eye className="h-3.5 w-3.5 text-[#6E6C7C]" />
                            Show on dashboard
                          </DropdownMenuItem>
                        )}
                        {onDuplicate && (
                          <DropdownMenuItem
                            onClick={() => onDuplicate(funnel)}
                            className={MENU_ITEM}
                          >
                            <Copy className="h-3.5 w-3.5 text-[#6E6C7C]" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-[#ECEBE6]" />
                        <DropdownMenuItem
                          onClick={() => {
                            setError('');
                            setConfirmId(funnel.id);
                          }}
                          className="rounded-[10px] text-[12.5px] text-[#e07a5f] hover:bg-[#fdf1ed] focus:bg-[#fdf1ed]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {confirming ? (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] text-[#e07a5f]">
                      Delete this funnel? Past reports keep its history.
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-full px-3 py-1 text-[12px] font-semibold text-[#6E6C7C] hover:bg-white transition-colors cursor-pointer"
                      >
                        Keep
                      </button>
                      <button
                        onClick={() => deleteFunnel.mutate(funnel.id)}
                        disabled={deleteFunnel.isPending}
                        className="rounded-full bg-[#e07a5f] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#c9694f] transition-colors cursor-pointer disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <ol className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
                    {funnel.steps.map((step, i) => (
                      <li key={i} className="flex min-w-0 max-w-full items-center gap-1">
                        {i > 0 && (
                          <span aria-hidden className="text-[11px] text-[#B5B0AA]">
                            →
                          </span>
                        )}
                        <span
                          className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white py-[3px] pl-1 pr-2 shadow-[0_0_0_1px_#E6E4DE]"
                          title={stepLabel(step)}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F2F1ED] font-mono text-[9.5px] font-semibold text-[#6E6C7C]">
                            {i + 1}
                          </span>
                          <span className="truncate text-[11.5px] text-[#3D3B4F]">
                            {stepLabel(step)}
                          </span>
                          <TypeChip
                            type={step.type}
                            className="h-4 shrink-0 px-[5px] text-[9.5px]"
                          />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
        {error && <p className="pt-2 text-[13px] text-[#e07a5f]">{error}</p>}
      </DrawerBody>

      <DrawerFooter>
        <span className="text-[11.5px] text-[#B5B0AA]">Click a funnel to edit its steps</span>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6E6C7C] hover:bg-muted hover:text-[#3D3B4F] transition-colors cursor-pointer"
        >
          Done
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
