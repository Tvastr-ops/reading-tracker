import { motion } from 'framer-motion';
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
import { memo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateProgressPercentage, formatProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import { type Book, type SortDir, type SortField, STATUSES } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import CoverImage from './CoverImage';
import { RatingDisplay } from './RatingInput';

function hostnameOf(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function BookTable({
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
  onFullEdit,
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
  onFullEdit?: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
  onQuickStatus: (b: Book) => void;
  focusedId?: string | null;
}) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent, b: Book) => {
    if (selectMode) {
      onToggleSelect(b.id);
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    if (e.detail === 1) {
      clickTimerRef.current = setTimeout(() => {
        onEdit(b);
      }, 200);
    } else if (e.detail === 2 && onFullEdit) {
      onFullEdit(b);
    }
  };

  useEffect(() => {
    if (focusedId) {
      const el = document.querySelector(`[data-row-id="${focusedId}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedId]);

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
        <div className="block space-y-3 sm:hidden">
          {books.map((b, idx) => {
            const pct = calculateProgressPercentage(b);
            const formattedProgress = formatProgressText(b);
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
                className={`surface-t2 group relative overflow-hidden rounded-2xl p-3 transition-[border-color,box-shadow] hover:border-accent-color/60 active:scale-[0.99] ${idx >= 4 ? 'cv-mobile-card' : ''} ${
                  isSelected
                    ? 'border-accent-color bg-accent-color/10 ring-2 ring-accent-color/30'
                    : ''
                }`}
              >
                {/* Status Colored Accent Line on Left Edge */}
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b ${statusCfg.sideGradient}`}
                />

                <div className="flex items-start gap-3 pl-0.5">
                  {selectMode && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 self-center rounded border-border text-accent-color focus:ring-accent-color"
                      checked={isSelected}
                      onChange={() => onToggleSelect(b.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {/* Cover Image */}
                  <div className="relative shrink-0 self-start overflow-hidden rounded-xl border border-border/80 shadow-xs">
                    <CoverImage
                      src={b.cover_url}
                      title={b.title}
                      width={56}
                      height={84}
                      priority={idx < 2}
                      className="h-[84px] w-14 rounded-xl object-cover object-top transition-transform group-hover:scale-105"
                      fallbackClassName="flex h-[84px] w-14 flex-col items-center justify-center rounded-xl border border-border bg-surface text-text-muted text-[9px] p-1 text-center font-medium leading-tight"
                    />
                  </div>

                  {/* Main Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h2 className="line-clamp-2 font-bold text-text text-xs leading-tight tracking-tight transition-colors group-hover:text-accent-color sm:text-sm">
                        {b.title}
                      </h2>
                      <Badge
                        variant={statusCfg.variant}
                        className="shrink-0 gap-1 rounded-full px-2 py-0.5 font-semibold text-[9px] tracking-wide shadow-2xs"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusCfg.dotColor}`}
                        />
                        <span>{b.status}</span>
                      </Badge>
                    </div>

                    {/* Metadata Subtitle Row (Author · Type · Date · Duration) */}
                    {(b.author || b.type || b.date_finished || b.date_started) && (
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium text-[10px] text-text-muted leading-none">
                        {b.author && <span className="text-text-muted">{b.author}</span>}
                        {b.author && b.type && <span>·</span>}
                        {b.type && <span className="text-text-muted/80">{b.type}</span>}

                        {(b.date_finished || b.date_started) && (
                          <div className="inline-flex items-center gap-1">
                            {(b.author || b.type) && <span>·</span>}
                            {b.date_finished ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-500 dark:text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                <span>{formatShortDate(b.date_finished)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-text-muted">
                                <CalendarDays className="h-2.5 w-2.5 shrink-0 text-sky-400" />
                                <span>{formatShortDate(b.date_started)}</span>
                              </span>
                            )}
                            {b.date_started && (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1 py-0.2 font-semibold text-[8px] text-amber-500 dark:text-amber-400">
                                <Clock className="h-2 w-2" />
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
                      <span className="font-semibold text-[10px] text-text-muted tracking-tight">
                        {formattedProgress} {pct != null ? `(${pct}%)` : ''}
                      </span>
                    </div>

                    {pct != null ? (
                      <Progress value={pct} className="h-1 rounded-full" />
                    ) : b.is_ongoing ? (
                      <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-accent-color/60" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE VIEW (>=640px) */}
        <div className="surface-t1 hidden overflow-hidden overflow-x-auto rounded-2xl sm:block">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-border/70 border-b bg-surface/70 backdrop-blur-md">
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
                <th className="hidden border-border border-b px-3.5 py-3 text-left font-semibold text-text-muted text-xs uppercase tracking-wider md:table-cell">
                  Tags
                </th>
                {headerFor('date_finished', 'Dates', 'hidden md:table-cell')}
                <th className="border-border border-b px-3.5 py-3 text-right font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {books.map((b, idx) => {
                const pct = calculateProgressPercentage(b);
                const formattedProgress = formatProgressText(b);
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

                const delay = idx < 6 ? idx * 0.015 : 0;

                return (
                  <motion.tr
                    key={b.id}
                    data-row-id={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2, delay, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => handleClick(e, b)}
                    className={`group cursor-pointer border-border/40 border-b transition-colors hover:bg-surface/50 ${idx >= 4 ? 'cv-table-row' : ''} ${
                      isSelected
                        ? 'border-l-4 border-l-accent-color bg-accent-color/10'
                        : idx % 2 === 1
                          ? 'bg-surface/25'
                          : ''
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
                            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-gradient-to-b ${statusCfg.sideGradient}`}
                          />
                          <CoverImage
                            src={b.cover_url}
                            title={b.title}
                            width={36}
                            height={48}
                            priority={idx < 2}
                            className="h-12 w-9 rounded-md border border-border/80 object-cover object-top shadow-2xs transition-transform group-hover:scale-105"
                            fallbackClassName="flex h-12 w-9 flex-col items-center justify-center rounded-md border border-border bg-surface text-text-muted text-[8px] p-0.5 text-center font-medium leading-none"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-bold text-text text-xs tracking-tight transition-colors group-hover:text-accent-color sm:text-sm">
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
                    <td className="whitespace-nowrap px-3.5 py-3 align-middle">
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
                              className="gap-1.5 font-medium transition-opacity hover:opacity-85"
                            >
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusCfg.dotColor}`}
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
                    <td className="whitespace-nowrap px-3.5 py-3 align-middle">
                      <RatingDisplay rating={b.rating} mode={ratingMode} />
                    </td>

                    {/* Progress */}
                    <td className="min-w-[140px] px-3.5 py-3 align-middle">
                      <div className="space-y-1">
                        {pct != null ? (
                          <Progress value={pct} className="h-1.5" />
                        ) : b.is_ongoing ? (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                            <div className="h-full w-2/3 animate-pulse rounded-full bg-accent-color/60" />
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between font-medium text-[11px] text-text-muted">
                          <span>{formattedProgress}</span>
                          {pct != null && (
                            <span className="ml-1 font-semibold text-text">{pct}%</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="hidden max-w-[160px] px-3.5 py-3 align-middle md:table-cell">
                      {tagList.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-wrap gap-1">
                              {tagList.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-md border border-border/60 bg-surface/70 px-1.5 py-0.5 font-medium text-[10px] text-text-muted"
                                >
                                  {t}
                                </span>
                              ))}
                              {tagList.length > 2 && (
                                <span className="inline-flex items-center rounded-md border border-border/60 bg-surface/80 px-1.5 py-0.5 font-medium text-[10px] text-text-muted">
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
                    <td className="hidden whitespace-nowrap px-3.5 py-3 align-middle text-text-muted text-xs md:table-cell">
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
                                    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.2 font-semibold text-[9px] text-amber-500 dark:text-amber-400">
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
                      className="whitespace-nowrap px-3.5 py-3 text-right align-middle"
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
                              aria-label={`Edit ${b.title}`}
                              className="h-8 w-8 rounded-lg text-accent-color hover:bg-accent-color/10"
                              onClick={() => onEdit(b)}
                              title="Edit entry"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${b.title}`}
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
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default memo(BookTable);
