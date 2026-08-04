'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStatusConfig } from '@/lib/status';
import { type Book, type SortDir, type SortField, STATUSES } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import { RatingDisplay } from './RatingInput';

function hostnameOf(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function BookTable({
  books,
  ratingMode,
  sortField,
  sortDir,
  onSort,
  trashMode = false,
  hasAnyBooks = true,
  selectMode = false,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onQuickStatus,
  focusedId = null,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  trashMode?: boolean;
  hasAnyBooks?: boolean;
  selectMode?: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll?: () => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
  onQuickStatus: (b: Book) => void;
  focusedId?: string | null;
}) {
  if (books.length === 0) {
    let message = 'No entries match your filters.';
    if (trashMode) message = 'Nothing in the trash.';
    else if (!hasAnyBooks)
      message = 'Nothing on the shelf yet — add your first book to get started.';

    return (
      <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card-bg/40 p-12 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-text-muted/50" />
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  function headerFor(field: SortField, label: string, className = '') {
    const active = sortField === field;
    return (
      <th
        key={field}
        onClick={() => onSort(field)}
        className={`cursor-pointer select-none border-border border-b px-3.5 py-3 text-left font-semibold text-text-muted text-xs uppercase tracking-wider transition-colors hover:text-text ${className}`}
        title={`Sort by ${label}`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {active ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-accent-color" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-accent-color" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70" />
          )}
        </div>
      </th>
    );
  }

  const allSelected = books.length > 0 && books.every((b) => selected.has(b.id));
  const isSomeSelected = books.some((b) => selected.has(b.id)) && !allSelected;

  return (
    <TooltipProvider>
      <div>
        {/* MOBILE ELEVATED FLOATING CARD LIST VIEW (<640px) */}
        <div className="block sm:hidden space-y-3">
          {books.map((b) => {
            const pct = b.total_units
              ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100))
              : null;
            const statusCfg = getStatusConfig(b.status);
            const isSelected = selected.has(b.id);

            return (
              <div
                key={b.id}
                onClick={() => {
                  if (selectMode) {
                    onToggleSelect(b.id);
                  } else {
                    onEdit(b);
                  }
                }}
                className={`group relative overflow-hidden rounded-2xl border border-border/80 border-t-white/15 dark:border-t-white/10 bg-card-bg/95 p-3.5 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all hover:border-accent-color/50 hover:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.45)] active:scale-[0.99] ${
                  isSelected
                    ? 'border-accent-color bg-accent-color/10 ring-2 ring-accent-color/30 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)]'
                    : ''
                }`}
              >
                {/* Status Colored Accent Line on Left Edge */}
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 w-1 z-10 bg-gradient-to-b ${statusCfg.sideGradient}`}
                />

                <div className="flex items-start gap-3.5 pl-1">
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-border text-accent-color focus:ring-accent-color self-center"
                      checked={isSelected}
                      onChange={() => onToggleSelect(b.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {/* Cover Image */}
                  <div className="relative shrink-0 self-start overflow-hidden rounded-xl shadow-sm border border-border/80">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt=""
                        className="h-20 w-14 rounded-xl object-cover object-top transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded-xl border border-border bg-surface text-text-muted">
                        <BookOpen className="h-5 w-5 opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Main Details */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 font-bold text-text text-xs sm:text-sm leading-snug tracking-tight group-hover:text-accent-color transition-colors">
                        {b.title}
                      </h4>
                      <Badge
                        variant={statusCfg.variant}
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide gap-1.5 shadow-2xs"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusCfg.dotColor}`}
                        />
                        <span>{b.status}</span>
                      </Badge>
                    </div>

                    {/* Metadata Subtitle Row (Author · Type · Date · Duration) */}
                    {(b.author || b.type || b.date_finished || b.date_started) && (
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-text-muted font-medium">
                        {b.author && <span className="text-text-muted">{b.author}</span>}
                        {b.author && b.type && <span>·</span>}
                        {b.type && <span className="text-text-muted/80">{b.type}</span>}

                        {(b.date_finished || b.date_started) && (
                          <div className="inline-flex items-center gap-1.5 text-[10px]">
                            {(b.author || b.type) && <span>·</span>}
                            {b.date_finished ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-500 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span>{formatShortDate(b.date_finished)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-text-muted">
                                <CalendarDays className="h-3 w-3 shrink-0 text-sky-400" />
                                <span>{formatShortDate(b.date_started)}</span>
                              </span>
                            )}
                            {b.date_started && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-500 dark:text-amber-400">
                                <Clock className="h-2.5 w-2.5" />
                                {calculateReadingDuration(b.date_started, b.date_finished)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rating & Progress Percentage Footer */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <RatingDisplay rating={b.rating} mode={ratingMode} />
                      {pct != null && (
                        <span className="font-semibold text-[10px] text-text-muted tracking-tight">
                          {b.progress ?? 0}/{b.total_units} ({pct}%)
                        </span>
                      )}
                    </div>

                    {pct != null && <Progress value={pct} className="h-1.5 rounded-full" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE VIEW (>=640px) */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/80 border-t-white/15 dark:border-t-white/10 bg-card-bg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-x-auto">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-border/80 border-b bg-card-bg/95 backdrop-blur-md">
                {selectMode && (
                  <th className="w-8 border-border border-b px-3.5 py-3 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-border text-accent-color focus:ring-accent-color"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={() => onToggleSelectAll?.()}
                      aria-label="Select all rows"
                      title={allSelected ? 'Deselect all rows' : 'Select all rows'}
                    />
                  </th>
                )}
                {headerFor('title', 'Book Info')}
                {headerFor('status', 'Status')}
                {headerFor('rating', 'Rating')}
                <th className="border-border border-b px-3.5 py-3 text-left font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Progress
                </th>
                <th className="hidden md:table-cell border-border border-b px-3.5 py-3 text-left font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Tags
                </th>
                {headerFor('date_finished', 'Dates', 'hidden md:table-cell')}
                <th className="border-border border-b px-3.5 py-3 text-right font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {books.map((b) => {
                const pct = b.total_units
                  ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100))
                  : null;
                const nextStatus = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
                const statusCfg = getStatusConfig(b.status);
                const isFocused = b.id === focusedId;
                const isSelected = selected.has(b.id);

                const tagList = b.genre_tags
                  ? b.genre_tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  : [];

                return (
                  <tr
                    key={b.id}
                    data-row-id={b.id}
                    onClick={() => {
                      if (selectMode) {
                        onToggleSelect(b.id);
                      } else {
                        onEdit(b);
                      }
                    }}
                    className={`group cursor-pointer transition-all hover:bg-surface/60 ${
                      isSelected ? 'bg-accent-color/10 border-l-4 border-l-accent-color' : ''
                    } ${isFocused ? 'ring-2 ring-accent-color' : ''}`}
                  >
                    {/* Selection Checkbox */}
                    {selectMode && (
                      <td className="px-3.5 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-border text-accent-color focus:ring-accent-color"
                          checked={isSelected}
                          onChange={() => onToggleSelect(b.id)}
                          aria-label={`Select ${b.title}`}
                        />
                      </td>
                    )}

                    {/* Book Primary Info Cell: Cover + Title + Author/Type + Source Link */}
                    <td className="px-3.5 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0 overflow-hidden rounded-md">
                          <div
                            className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 z-10 bg-gradient-to-b ${statusCfg.sideGradient}`}
                          />
                          {b.cover_url ? (
                            <img
                              src={b.cover_url}
                              alt=""
                              className="h-12 w-9 rounded-md border border-border/80 object-cover object-top shadow-2xs transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-12 w-9 items-center justify-center rounded-md border border-border bg-surface text-text-muted">
                              <BookOpen className="h-4 w-4 opacity-40" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-bold text-text text-xs sm:text-sm tracking-tight transition-colors group-hover:text-accent-color">
                              {b.title}
                            </span>
                            {b.source_link && (
                              <a
                                href={
                                  b.source_link.startsWith('http')
                                    ? b.source_link
                                    : `https://${b.source_link}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-surface/70 px-1.5 py-0.5 text-[10px] text-accent-color hover:border-accent-color/40 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                                title={b.source_link}
                              >
                                <span>{hostnameOf(b.source_link)}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            {b.author && <span className="truncate">{b.author}</span>}
                            {b.author && b.type && <span>·</span>}
                            {b.type && (
                              <span className="font-medium text-text-muted/80">{b.type}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-3 align-middle whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="cursor-pointer text-left focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!trashMode) onQuickStatus(b);
                            }}
                          >
                            <Badge
                              variant={statusCfg.variant}
                              className="font-medium transition-opacity hover:opacity-85 gap-1.5"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusCfg.dotColor}`}
                              />
                              <span>{b.status}</span>
                            </Badge>
                          </button>
                        </TooltipTrigger>
                        {!trashMode && (
                          <TooltipContent>Click to mark as "{nextStatus}"</TooltipContent>
                        )}
                      </Tooltip>
                    </td>

                    {/* Rating */}
                    <td className="px-3.5 py-3 align-middle whitespace-nowrap">
                      <RatingDisplay rating={b.rating} mode={ratingMode} />
                    </td>

                    {/* Progress */}
                    <td className="px-3.5 py-3 align-middle min-w-[120px]">
                      {b.total_units ? (
                        <div className="space-y-1">
                          <Progress value={pct ?? 0} className="h-1.5" />
                          <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                            <span>
                              {b.progress ?? 0}/{b.total_units}
                            </span>
                            <span className="font-semibold text-text">{pct}%</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs">{b.progress ?? 0} units</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="hidden md:table-cell px-3.5 py-3 align-middle max-w-[160px]">
                      {tagList.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-wrap gap-1">
                              {tagList.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-md border border-border/60 bg-surface/70 px-1.5 py-0.5 text-[10px] text-text-muted font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                              {tagList.length > 2 && (
                                <span className="inline-flex items-center rounded-md border border-border/60 bg-surface/80 px-1.5 py-0.5 text-[10px] text-text-muted font-medium">
                                  +{tagList.length - 2}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{b.genre_tags}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>

                    {/* Dates Column */}
                    <td className="hidden md:table-cell px-3.5 py-3 align-middle whitespace-nowrap text-xs text-text-muted">
                      {b.date_finished || b.date_started ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col gap-1 text-[11px]">
                              {b.date_finished && (
                                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>{formatShortDate(b.date_finished)}</span>
                                </div>
                              )}
                              {b.date_started && (
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                                  <span>{formatShortDate(b.date_started)}</span>
                                  {b.date_started && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-500 dark:text-amber-400">
                                      <Clock className="h-2.5 w-2.5" />
                                      {calculateReadingDuration(b.date_started, b.date_finished)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              {b.date_started && <div>Started: {b.date_started}</div>}
                              {b.date_finished && <div>Finished: {b.date_finished}</div>}
                              {b.date_started && (
                                <div className="font-semibold text-amber-400">
                                  Total Duration:{' '}
                                  {calculateReadingDuration(b.date_started, b.date_finished)}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-text-muted/50">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-3.5 py-3 text-right align-middle whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {trashMode ? (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => onRestore?.(b)}>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onPermanentDelete?.(b)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-accent-color hover:bg-accent-color/10"
                              onClick={() => onEdit(b)}
                              title="Edit entry"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 dark:text-rose-400"
                              onClick={() => onDelete(b)}
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
