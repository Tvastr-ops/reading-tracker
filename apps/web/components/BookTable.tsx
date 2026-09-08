'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Heart,
  Layers,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import { type Book, type BookStatus, type SortDir, type SortField, STATUSES } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import CoverImage from './CoverImage';
import { RatingDisplay } from './RatingInput';
import { StatusBadge } from './StatusBadge';

function hostnameOf(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface BookTableProps {
  books: Book[];
  groupBySeries?: boolean;
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
  onToggleFavorite?: (b: Book) => void;
  focusedId?: string | null;
}

type TableItem =
  | { type: 'book'; book: Book }
  | { type: 'series'; seriesName: string; books: Book[] };

function BookTable({
  books,
  groupBySeries = false,
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
  onToggleFavorite,
  focusedId = null,
}: BookTableProps) {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const toggleSeriesExpanded = useCallback((seriesName: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      const key = seriesName.toLowerCase();
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Group books by series when groupBySeries is active
  const displayItems = useMemo<TableItem[]>(() => {
    if (!groupBySeries || trashMode) {
      return books.map((b) => ({ type: 'book', book: b }));
    }

    const seriesMap = new Map<string, Book[]>();
    for (const b of books) {
      const sName = b.series_name?.trim();
      if (sName) {
        const lower = sName.toLowerCase();
        const existing = seriesMap.get(lower) || [];
        existing.push(b);
        seriesMap.set(lower, existing);
      }
    }

    const seenSeries = new Set<string>();
    const items: TableItem[] = [];

    for (const b of books) {
      const sName = b.series_name?.trim();
      if (sName) {
        const lower = sName.toLowerCase();
        const cluster = seriesMap.get(lower) || [];
        if (cluster.length > 1) {
          if (!seenSeries.has(lower)) {
            seenSeries.add(lower);
            const sortedCluster = [...cluster].sort((a, b) => {
              if (a.series_order != null && b.series_order != null) {
                return a.series_order - b.series_order;
              }
              if (a.series_order != null) return -1;
              if (b.series_order != null) return 1;
              return a.title.localeCompare(b.title);
            });
            items.push({
              type: 'series',
              seriesName: sName,
              books: sortedCluster,
            });
          }
          continue;
        }
      }
      items.push({ type: 'book', book: b });
    }

    return items;
  }, [books, groupBySeries, trashMode]);

  const handleTouchStart = (b: Book, e: React.TouchEvent) => {
    if (selectMode) return;
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    if (touch) {
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      if (onFullEdit) {
        onFullEdit(b);
      } else {
        onEdit(b);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    if (touch) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 8 || dy > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleClick = (e: React.MouseEvent, b: Book) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    if (selectMode) {
      onToggleSelect(b.id);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      window.open(`/books/${b.id}`, '_blank');
      return;
    }

    if (e.shiftKey || e.altKey) {
      if (onFullEdit) {
        onFullEdit(b);
      } else {
        onEdit(b);
      }
      return;
    }

    // Instant 0ms response on single click -> Quick Inspector
    onEdit(b);
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

  // Helper to render an individual book row in desktop table view
  const renderDesktopBookRow = (b: Book, idx: number, isSubRow = false, _subIndex = 0) => {
    const pct = calculateProgressPercentage(b);
    const formattedProgress = getStatusAwareProgressText(b);
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
        onClick={(e) => handleClick(e, b)}
        className={`group cursor-pointer border-border/40 border-b transition-colors hover:bg-surface/60 ${
          isSubRow
            ? 'bg-surface/15 hover:bg-surface/40'
            : isSelected
              ? 'border-l-4 border-l-accent-color bg-accent-color/10'
              : idx % 2 === 1
                ? 'bg-surface/25'
                : ''
        } ${isFocused ? 'ring-2 ring-accent-color' : ''}`}
      >
        {/* Selection Checkbox */}
        {selectMode && (
          <td className="px-3.5 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
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
        <td className="px-3.5 py-2.5 align-middle">
          <div className={`flex items-center gap-3 ${isSubRow ? 'pl-6 sm:pl-7' : ''}`}>
            {isSubRow && (
              <span className="font-mono text-xs text-text-muted/60 select-none">↳</span>
            )}
            <div className="relative shrink-0 overflow-hidden rounded-md">
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-gradient-to-b ${statusCfg.sideGradient}`}
              />
              <CoverImage
                src={b.cover_url}
                title={b.title}
                width={isSubRow ? 30 : 36}
                height={isSubRow ? 40 : 48}
                priority={idx < 2}
                className={`${
                  isSubRow ? 'h-10 w-7.5' : 'h-12 w-9'
                } rounded-md border border-border/80 object-cover object-top shadow-2xs transition-transform group-hover:scale-105`}
                fallbackClassName={`flex ${
                  isSubRow ? 'h-10 w-7.5' : 'h-12 w-9'
                } flex-col items-center justify-center rounded-md border border-border bg-surface text-text-muted text-[8px] p-0.5 text-center font-medium leading-none`}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                {isSubRow && b.series_order != null && (
                  <span className="shrink-0 rounded bg-surface-raised border border-border/70 px-1 py-0.2 font-mono font-bold text-[9px] text-text-muted">
                    Vol #{b.series_order}
                  </span>
                )}
                <span className="truncate font-bold text-text text-xs tracking-tight transition-colors group-hover:text-accent-color sm:text-sm">
                  {b.title}
                </span>
                {b.source_link &&
                  (() => {
                    const links = b.source_link
                      .split(/[\n,;]+/)
                      .map((l) => l.trim())
                      .filter(Boolean);
                    const firstLink = links[0];
                    if (!firstLink) return null;
                    const href = firstLink.startsWith('http') ? firstLink : `https://${firstLink}`;
                    const extraCount = links.length - 1;
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-surface/70 px-1.5 py-0.5 text-[10px] text-accent-color hover:border-accent-color/40 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        title={b.source_link}
                      >
                        <span>{hostnameOf(firstLink)}</span>
                        {extraCount > 0 && <span className="opacity-75">+{extraCount}</span>}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    );
                  })()}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                {!isSubRow && b.series_name && (
                  <span className="inline-block shrink-0 rounded bg-accent-color/10 px-1 py-0.2 font-bold text-[9.5px] text-accent-color">
                    [{b.series_name.toUpperCase()}
                    {b.series_order != null ? ` #${b.series_order}` : ''}]
                  </span>
                )}
                {(b.reread_count ?? 0) > 0 && (
                  <span className="inline-block shrink-0 rounded bg-blue-500/20 px-1 py-0.2 font-bold text-[8.5px] text-blue-500">
                    RE-READ
                  </span>
                )}
                {b.author && <span className="truncate">{b.author}</span>}
                {b.author && b.type && <span>·</span>}
                {b.type && <span className="font-medium text-text-muted/80">{b.type}</span>}
              </div>
            </div>
          </div>
        </td>

        {/* Status Badge */}
        <td className="whitespace-nowrap px-3.5 py-2.5 align-middle">
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
                <StatusBadge status={b.status} />
              </button>
            </TooltipTrigger>
            {!trashMode && <TooltipContent>Click to mark as "{nextStatus}"</TooltipContent>}
          </Tooltip>
        </td>

        {/* Rating */}
        <td className="whitespace-nowrap px-3.5 py-2.5 align-middle">
          <RatingDisplay rating={b.rating} mode={ratingMode} />
        </td>

        {/* Progress */}
        <td className="min-w-[140px] px-3.5 py-2.5 align-middle">
          <div className="space-y-1">
            {pct != null ? (
              <Progress value={pct} className="h-1.5" />
            ) : b.is_ongoing ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-accent-color/60" />
              </div>
            ) : null}
            <div className="flex items-center justify-between font-medium text-[11px] text-text-muted font-tabular">
              <span>{formattedProgress}</span>
              {pct != null && <span className="ml-1 font-semibold text-text">{pct}%</span>}
            </div>
          </div>
        </td>

        {/* Tags */}
        <td className="hidden max-w-[160px] px-3.5 py-2.5 align-middle md:table-cell">
          {tagList.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-wrap gap-1">
                  {tagList.slice(0, 2).map((t, tIdx) => (
                    <span
                      key={tIdx}
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
        <td className="hidden whitespace-nowrap px-3.5 py-2.5 align-middle text-text-muted text-xs md:table-cell">
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
                      Total Duration: {calculateReadingDuration(b.date_started, b.date_finished)}
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
          className="whitespace-nowrap px-3.5 py-2.5 text-right align-middle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-end gap-1">
            {trashMode ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => onRestore?.(b)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Restore
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onPermanentDelete?.(b)}>
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
                {onToggleFavorite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={b.is_favorite ? `Unfavorite ${b.title}` : `Favorite ${b.title}`}
                    className="h-8 w-8 rounded-lg text-rose-400 hover:bg-rose-500/10"
                    onClick={() => onToggleFavorite(b)}
                    title={b.is_favorite ? 'Unfavorite' : 'Favorite'}
                  >
                    <Heart
                      className={`h-4 w-4 transition-all active:scale-90 ${
                        b.is_favorite
                          ? 'fill-rose-400/90 text-rose-400/90 drop-shadow-[0_0_4px_rgba(244,63,94,0.4)]'
                          : 'text-text-muted hover:text-rose-400'
                      }`}
                    />
                  </Button>
                )}
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
      </tr>
    );
  };

  // Helper to render a stacked series row in desktop table view
  const renderDesktopSeriesRow = (item: { seriesName: string; books: Book[] }, idx: number) => {
    const isExpanded = expandedSeries.has(item.seriesName.toLowerCase());
    const cluster = item.books;
    const totalVolumes = cluster.length;
    const completedVolumes = cluster.filter((b) => b.status === 'Completed').length;
    const readingVolumes = cluster.filter((b) => b.status === 'Reading');
    const activeBook = readingVolumes[0] || cluster[0];

    const seriesStatus: BookStatus =
      readingVolumes.length > 0
        ? 'Reading'
        : completedVolumes === totalVolumes
          ? 'Completed'
          : completedVolumes > 0
            ? 'Reading'
            : activeBook.status;

    const seriesPct = totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

    const ratedBooks = cluster.filter((b) => (b.rating ?? 0) > 0);
    const avgRating =
      ratedBooks.length > 0
        ? ratedBooks.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratedBooks.length
        : null;

    const allClusterSelected = cluster.every((b) => selected.has(b.id));
    const someClusterSelected = cluster.some((b) => selected.has(b.id)) && !allClusterSelected;

    const toggleClusterSelect = () => {
      if (allClusterSelected) {
        for (const b of cluster) {
          if (selected.has(b.id)) onToggleSelect(b.id);
        }
      } else {
        for (const b of cluster) {
          if (!selected.has(b.id)) onToggleSelect(b.id);
        }
      }
    };

    const uniqueTags = Array.from(
      new Set(
        cluster
          .flatMap((b) => (b.genre_tags ? b.genre_tags.split(',') : []))
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    return (
      <tbody key={`series-${item.seriesName}-${idx}`} className="border-border/60 border-b">
        {/* Series Stack Master Header Row */}
        <tr
          onClick={() => toggleSeriesExpanded(item.seriesName)}
          className={`group cursor-pointer border-l-4 border-l-amber-500 bg-surface/40 transition-colors hover:bg-surface/70 ${
            isExpanded ? 'bg-accent-color/5 ring-1 ring-accent-color/20' : ''
          }`}
        >
          {/* Select Mode Checkbox for Series */}
          {selectMode && (
            <td className="px-3.5 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-border text-accent-color focus:ring-accent-color"
                checked={allClusterSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someClusterSelected;
                }}
                onChange={toggleClusterSelect}
                aria-label={`Select all ${totalVolumes} volumes of ${item.seriesName}`}
              />
            </td>
          )}

          {/* Series Stack Primary Info: Stacked Covers + Title + Expand Button */}
          <td className="px-3.5 py-3 align-middle">
            <div className="flex items-center gap-3">
              {/* Visual Stacked Cover with Deck Layers */}
              <div className="relative shrink-0 overflow-visible">
                {totalVolumes > 1 && (
                  <div className="pointer-events-none absolute -top-1 -right-1 z-0 h-12 w-9 rounded-md border border-border/70 bg-surface-raised shadow-[1px_1px_0px_var(--border)]" />
                )}
                <div className="relative z-10 overflow-hidden rounded-md">
                  <CoverImage
                    src={activeBook.cover_url}
                    title={item.seriesName}
                    width={36}
                    height={48}
                    priority={idx < 2}
                    className="h-12 w-9 rounded-md border border-border/80 object-cover object-top shadow-xs"
                    fallbackClassName="flex h-12 w-9 flex-col items-center justify-center rounded-md border border-border bg-surface text-text-muted text-[8px] p-0.5 text-center font-medium leading-none"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSeriesExpanded(item.seriesName);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded bg-accent-color/15 px-2 py-0.5 font-black text-[10px] text-accent-color tracking-wide uppercase shadow-[1px_1px_0px_var(--border)] hover:bg-accent-color/25 transition-all"
                    aria-expanded={isExpanded}
                  >
                    <Layers className="h-3 w-3 text-accent-color" />
                    <span>{totalVolumes} Volumes</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  <span className="truncate font-bold text-text text-sm tracking-tight transition-colors group-hover:text-accent-color">
                    {item.seriesName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  {activeBook.author && <span className="truncate">{activeBook.author}</span>}
                  {activeBook.author && activeBook.type && <span>·</span>}
                  {activeBook.type && (
                    <span className="font-medium text-text-muted/80">{activeBook.type}</span>
                  )}
                  <span>·</span>
                  <span className="font-semibold text-accent-color">
                    {readingVolumes.length > 0
                      ? `Reading Vol #${activeBook.series_order ?? '?'}`
                      : completedVolumes === totalVolumes
                        ? 'Completed all volumes'
                        : `${completedVolumes} of ${totalVolumes} completed`}
                  </span>
                </div>
              </div>
            </div>
          </td>

          {/* Series Aggregate Status */}
          <td className="whitespace-nowrap px-3.5 py-3 align-middle">
            <StatusBadge status={seriesStatus} />
          </td>

          {/* Series Average Rating */}
          <td className="whitespace-nowrap px-3.5 py-3 align-middle">
            {avgRating != null ? (
              <div className="flex items-center gap-1">
                <RatingDisplay rating={avgRating} mode={ratingMode} />
                {ratedBooks.length > 1 && (
                  <span className="text-[10px] text-text-muted font-medium">(avg)</span>
                )}
              </div>
            ) : (
              <span className="text-text-muted text-xs">—</span>
            )}
          </td>

          {/* Series Progress */}
          <td className="min-w-[140px] px-3.5 py-3 align-middle">
            <div className="space-y-1">
              <Progress value={seriesPct} className="h-1.5" />
              <div className="flex items-center justify-between font-medium text-[11px] text-text-muted font-tabular">
                <span>
                  {completedVolumes} of {totalVolumes} Finished
                </span>
                <span className="font-semibold text-text">{seriesPct}%</span>
              </div>
            </div>
          </td>

          {/* Series Aggregated Tags */}
          <td className="hidden max-w-[160px] px-3.5 py-3 align-middle md:table-cell">
            {uniqueTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {uniqueTags.slice(0, 2).map((t, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-flex items-center rounded-md border border-border/60 bg-surface/70 px-1.5 py-0.5 font-medium text-[10px] text-text-muted"
                  >
                    {t}
                  </span>
                ))}
                {uniqueTags.length > 2 && (
                  <span className="inline-flex items-center rounded-md border border-border/60 bg-surface/80 px-1.5 py-0.5 font-medium text-[10px] text-text-muted">
                    +{uniqueTags.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-text-muted text-xs">—</span>
            )}
          </td>

          {/* Empty Dates cell for Series */}
          <td className="hidden whitespace-nowrap px-3.5 py-3 align-middle text-text-muted text-xs md:table-cell">
            <span className="text-text-muted/60 text-[11px]">Series Stack</span>
          </td>

          {/* Actions Column */}
          <td
            className="whitespace-nowrap px-3.5 py-3 text-right align-middle"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-7 cursor-pointer border-border px-2 text-[11px] font-bold shadow-xs hover:border-accent-color hover:text-accent-color"
              onClick={() => toggleSeriesExpanded(item.seriesName)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </td>
        </tr>

        {/* Sub-rows when Series Stack is Expanded */}
        {isExpanded && cluster.map((b, volIdx) => renderDesktopBookRow(b, idx, true, volIdx))}
      </tbody>
    );
  };

  return (
    <TooltipProvider>
      <div>
        {/* MOBILE ELEVATED FLOATING CARD LIST VIEW (<640px) */}
        <div className="block space-y-3 sm:hidden">
          {displayItems.map((item, idx) => {
            if (item.type === 'series') {
              const isExpanded = expandedSeries.has(item.seriesName.toLowerCase());
              const cluster = item.books;
              const totalVolumes = cluster.length;
              const completedVolumes = cluster.filter((b) => b.status === 'Completed').length;
              const readingVolumes = cluster.filter((b) => b.status === 'Reading');
              const activeBook = readingVolumes[0] || cluster[0];
              const seriesPct =
                totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

              return (
                <div
                  key={`mobile-series-${item.seriesName}-${idx}`}
                  className="surface-t2 group relative overflow-hidden rounded-2xl border-2 border-border/80 p-3 shadow-[2px_2px_0px_var(--border)] transition-all"
                >
                  {/* Left Edge Amber Accent for Series Stacks */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1.5 bg-gradient-to-b from-amber-500 to-amber-600" />

                  <div className="flex items-start gap-3 pl-1">
                    <div className="relative shrink-0 self-start">
                      {totalVolumes > 1 && (
                        <div className="pointer-events-none absolute -top-1 -right-1 z-0 h-16 w-11 rounded-xl border border-border/70 bg-surface-raised shadow-[1px_1px_0px_var(--border)]" />
                      )}
                      <div className="relative z-10 overflow-hidden rounded-xl border border-border/80 shadow-xs">
                        <CoverImage
                          src={activeBook.cover_url}
                          title={item.seriesName}
                          width={48}
                          height={68}
                          className="h-16 w-11 object-cover object-top"
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 rounded bg-accent-color/15 px-1.5 py-0.5 font-bold text-[10px] text-accent-color">
                          <Layers className="h-3 w-3" />
                          {totalVolumes} Volumes
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 cursor-pointer px-2 text-[10.5px] font-bold text-accent-color hover:bg-accent-color/10"
                          onClick={() => toggleSeriesExpanded(item.seriesName)}
                        >
                          {isExpanded ? 'Hide' : 'Show All'}
                          {isExpanded ? (
                            <ChevronDown className="ml-0.5 h-3 w-3" />
                          ) : (
                            <ChevronRight className="ml-0.5 h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <h4 className="truncate font-bold text-sm tracking-tight text-text">
                        {item.seriesName}
                      </h4>

                      <div className="space-y-1">
                        <Progress value={seriesPct} className="h-1.5" />
                        <div className="flex items-center justify-between text-[11px] text-text-muted font-tabular">
                          <span>
                            {completedVolumes}/{totalVolumes} Completed
                          </span>
                          <span className="font-semibold text-text">{seriesPct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Mobile Child Volume Cards */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-3 pl-2">
                      {cluster.map((b) => {
                        const isSelected = selected.has(b.id);
                        return (
                          <div
                            key={b.id}
                            onClick={(e) => handleClick(e, b)}
                            className={`flex items-center justify-between rounded-xl border border-border/60 bg-surface/40 p-2 transition-colors hover:bg-surface/80 ${
                              isSelected ? 'border-accent-color bg-accent-color/10' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="shrink-0 rounded bg-surface-raised border border-border px-1 py-0.5 font-mono font-bold text-[9px] text-text-muted">
                                #{b.series_order ?? '?'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-xs text-text">{b.title}</p>
                                <p className="text-[10px] text-text-muted">
                                  {getStatusAwareProgressText(b)}
                                </p>
                              </div>
                            </div>
                            <StatusBadge status={b.status} className="text-[9.5px] px-1.5 py-0.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const b = item.book;
            const pct = calculateProgressPercentage(b);
            const formattedProgress = getStatusAwareProgressText(b);
            const statusCfg = getStatusConfig(b.status);
            const isSelected = selected.has(b.id);

            return (
              <div
                key={b.id}
                onClick={(e) => handleClick(e, b)}
                onTouchStart={(e) => handleTouchStart(b, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`surface-t2 group relative cursor-pointer overflow-hidden rounded-2xl p-3 transition-all duration-75 ease-out hover:border-accent-color/60 active:scale-[0.97] ${
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
                      className="h-21 w-14 object-cover object-top"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="truncate font-bold text-sm tracking-tight text-text">
                        {b.title}
                      </h4>
                      <StatusBadge status={b.status} className="text-[10px] px-1.5 py-0.5" />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      {b.author && <span className="truncate">{b.author}</span>}
                      {b.author && b.type && <span>·</span>}
                      {b.type && <span>{b.type}</span>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{formattedProgress}</span>
                      {b.rating != null && <RatingDisplay rating={b.rating} mode={ratingMode} />}
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
        {/* Table-fixed with strict colgroup eliminates all CLS and layout shifts */}
        <div className="surface-t1 hidden overflow-hidden overflow-x-auto rounded-2xl sm:block">
          <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
            <colgroup>
              {selectMode && <col style={{ width: '42px' }} />}
              <col style={{ width: selectMode ? '34%' : '37%' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '160px' }} />
              <col className="hidden md:table-column" style={{ width: '140px' }} />
              <col className="hidden md:table-column" style={{ width: '130px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
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
            {displayItems.map((item, idx) => {
              if (item.type === 'series') {
                return renderDesktopSeriesRow(item, idx);
              }
              return <tbody key={item.book.id}>{renderDesktopBookRow(item.book, idx)}</tbody>;
            })}
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default memo(BookTable);
