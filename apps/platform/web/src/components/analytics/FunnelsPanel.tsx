import { useState, type CSSProperties, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Filter,
  AlertCircle,
  Plus,
  ChevronDown,
  Check,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';
import type { FunnelDef, FunnelStat } from '@traks/shared';
import { cn, formatNumber } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TypeChip } from './TypeChip';

interface FunnelsPanelProps {
  siteId: string;
  funnels: FunnelDef[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  stat: FunnelStat | undefined;
  isLoading: boolean;
  isError?: boolean;
  /** The manage callbacks are absent for view-only members, which hides the
   *  funnel menu and "All funnels". */
  onAdd?: () => void;
  onEdit?: (funnel: FunnelDef) => void;
  onDuplicate?: (funnel: FunnelDef) => void;
  onManage?: () => void;
  className?: string;
}

/** "trial_start · plan=pro": a step's target and optional prop condition. */
function stepLabel(step: { target: string; propKey?: string; propValue?: string }): string {
  return step.propKey && step.propValue
    ? `${step.target} · ${step.propKey}=${step.propValue}`
    : step.target;
}

/**
 * Funnel panel: one column per step. The solid bar is the share of step-1
 * sessions that reached the step (0-100 scale); the hatched band above it is
 * what was lost since the previous step. Under each column: sessions,
 * step-over-step conversion, and the drop. Overall conversion in the header.
 */
export function FunnelsPanel({
  siteId,
  funnels,
  selectedId,
  onSelect,
  stat,
  isLoading,
  isError,
  onAdd,
  onEdit,
  onDuplicate,
  onManage,
  className,
}: FunnelsPanelProps): ReactElement {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const deleteFunnel = useMutation({
    mutationFn: async (funnelId: string) => api.deleteFunnel(siteId, funnelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-funnels', siteId] });
      // A funnel change only moves the funnel panel - not the whole dashboard.
      queryClient.invalidateQueries({ queryKey: ['site-analytics', siteId, 'funnel'] });
      setConfirmId(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const hasFunnels = funnels !== undefined && funnels.length > 0;
  const selected = funnels?.find(f => f.id === selectedId);
  const overall =
    stat && stat.steps.length > 0 ? stat.steps[stat.steps.length - 1].rateFromFirst : null;
  const confirming = selected !== undefined && confirmId === selected.id;
  // No step-1 sessions means every rate is meaningless; draw empty wells.
  const hasEntries = Boolean(stat && stat.steps.length > 0 && stat.steps[0].sessions > 0);
  const heightOf = (i: number): number =>
    hasEntries && stat ? Math.min(Math.max(stat.steps[i].rateFromFirst, 0), 100) : 0;

  return (
    <div className={cn('rounded-[20px] bg-white p-6 shadow-float', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="mr-1 text-[15px] font-bold tracking-[-0.01em] text-[#3D3B4F]">Funnels</h3>
          {/* Switcher and the funnel's own menu sit together: the menu acts
            on whichever funnel the switcher shows. */}
          <div className="flex min-w-0 items-center gap-0.5">
            {hasFunnels && funnels.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex max-w-[16rem] items-center gap-1.5 rounded-full border border-[#E6E4DE] py-1 pl-3 pr-2 text-[12.5px] font-semibold text-[#3D3B4F] hover:bg-[#F2F1ED] transition-colors cursor-pointer">
                  <span className="truncate">{selected?.name ?? 'Select funnel'}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9B9590]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-80 w-72 overflow-y-auto border-0 p-1.5 shadow-float-lg"
                >
                  <p className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#B5B0AA]">
                    Show funnel
                  </p>
                  {funnels.map(f => {
                    const on = f.id === selectedId;
                    return (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => onSelect(f.id)}
                        className={cn(
                          'items-start gap-2.5 rounded-[10px] px-2.5 py-2 hover:bg-[#F2F1ED] focus:bg-[#F2F1ED]',
                          on && 'bg-[#F2F1ED]'
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'block truncate text-[12.5px]',
                              on ? 'font-semibold text-[#3D3B4F]' : 'font-medium text-[#3D3B4F]'
                            )}
                          >
                            {f.name}
                          </span>
                          <span className="block truncate text-[11px] text-[#9B9590]">
                            {f.steps.length} steps · {f.steps[0]?.target} →{' '}
                            {f.steps[f.steps.length - 1]?.target}
                          </span>
                        </span>
                        <Check
                          className={cn(
                            'mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3D3B4F]',
                            !on && 'invisible'
                          )}
                        />
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              selected && (
                <span className="max-w-[16rem] truncate px-1 text-[12.5px] font-semibold text-[#6E6C7C]">
                  {selected.name}
                </span>
              )
            )}
            {onEdit && selected && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`${selected.name} options`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#9B9590] hover:bg-[#F2F1ED] hover:text-[#3D3B4F] transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 border-0 p-1.5 shadow-float-lg">
                  <DropdownMenuItem
                    onClick={() => onEdit(selected)}
                    className="rounded-[10px] text-[12.5px] text-[#3D3B4F] hover:bg-[#F2F1ED] focus:bg-[#F2F1ED]"
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-[#6E6C7C]" />
                    <span className="truncate">Edit &ldquo;{selected.name}&rdquo;</span>
                  </DropdownMenuItem>
                  {onDuplicate && (
                    <DropdownMenuItem
                      onClick={() => onDuplicate(selected)}
                      className="rounded-[10px] text-[12.5px] text-[#3D3B4F] hover:bg-[#F2F1ED] focus:bg-[#F2F1ED]"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#6E6C7C]" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-[#ECEBE6]" />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteError('');
                      setConfirmId(selected.id);
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
          {overall !== null && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#6E6C7C]">
              {overall}% end to end
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onManage && hasFunnels && (
            <button
              onClick={onManage}
              className="rounded-full border border-[#E6E4DE] px-3.5 py-1.5 text-[12px] font-semibold text-[#6E6C7C] hover:bg-[#F2F1ED] hover:text-[#3D3B4F] transition-colors cursor-pointer"
            >
              All funnels
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-full bg-[#3D3B4F] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2C2B3B] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add funnel
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[#fdf1ed] px-4 py-3">
          <p className="min-w-0 text-[12.5px] text-[#e07a5f]">
            Delete <b className="font-semibold">{selected.name}</b>? Past reports keep its history.
          </p>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setConfirmId(null)}
              className="rounded-full px-3 py-1 text-[12px] font-semibold text-[#6E6C7C] hover:bg-white transition-colors cursor-pointer"
            >
              Keep
            </button>
            <button
              onClick={() => deleteFunnel.mutate(selected.id)}
              disabled={deleteFunnel.isPending}
              className="rounded-full bg-[#e07a5f] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#c9694f] transition-colors cursor-pointer disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {deleteError && <p className="mb-3 text-[13px] text-[#e07a5f]">{deleteError}</p>}

      {isError ? (
        <div className="flex flex-col items-center justify-center py-10">
          <AlertCircle className="mb-2 h-5 w-5 text-[#e07a5f]/60" strokeWidth={1.5} />
          <p className="text-[13px] text-[#e07a5f]">Failed to load funnel</p>
        </div>
      ) : !hasFunnels && funnels !== undefined ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Filter className="mb-2 h-5 w-5 text-[#B5B0AA]" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-[#9B9590]">No funnels yet</p>
          <p className="mt-1 max-w-[44ch] text-center text-[12px] text-[#B5B0AA]">
            Chain pages and events into ordered steps to see where visitors drop off.
          </p>
          {onAdd && (
            <button
              onClick={onAdd}
              className="mt-3 rounded-full bg-muted px-4 py-2 text-[12px] font-semibold text-foreground hover:bg-[#E6E4DE] transition-colors cursor-pointer"
            >
              Create your first funnel
            </button>
          )}
        </div>
      ) : isLoading || !stat ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-[140px] animate-pulse rounded-xl bg-muted" />
              <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-6 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <ol
          className="grid grid-cols-2 gap-x-3 gap-y-5 sm:[grid-template-columns:var(--funnel-cols)]"
          style={
            {
              '--funnel-cols': `repeat(${stat.steps.length}, minmax(0, 1fr))`,
            } as CSSProperties
          }
        >
          {stat.steps.map((step, i) => {
            const prev = i > 0 ? stat.steps[i - 1] : null;
            const height = heightOf(i);
            const label = stepLabel(step);
            return (
              <li key={`${step.type}-${step.target}-${i}`} className="min-w-0">
                <div className="relative h-[140px] overflow-hidden rounded-xl bg-[#F9F8F6]">
                  {prev && (
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 bg-[repeating-linear-gradient(135deg,#f4e3dd_0_5px,#fbeee9_5px_10px)]"
                      style={{ height: `${heightOf(i - 1)}%` }}
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 rounded-t-lg bg-[#3D3B4F]"
                    style={{
                      height: `${height}%`,
                      minHeight: step.sessions > 0 && hasEntries ? 2 : 0,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex min-w-0 items-center gap-1.5" title={label}>
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#F2F1ED] font-mono text-[10px] font-semibold text-[#6E6C7C]">
                    {i + 1}
                  </span>
                  <span className="truncate text-[12.5px] text-[#3D3B4F]">{label}</span>
                  <TypeChip type={step.type} className="shrink-0" />
                </div>
                <p className="mt-1 text-[20px] font-bold leading-tight tracking-[-0.02em] tabular-nums text-[#3D3B4F]">
                  {formatNumber(step.sessions)}
                </p>
                <p className="text-[11.5px] tabular-nums text-[#9B9590]">
                  {prev ? (
                    <>
                      {step.rateFromPrev}% of previous
                      {prev.sessions > step.sessions && (
                        <>
                          {' · '}
                          <span className="text-[#e07a5f]">
                            −{formatNumber(prev.sessions - step.sessions)}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    'entered'
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
