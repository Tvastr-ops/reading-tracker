'use client';

import { Clock, Edit3, Heart, MoreVertical, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import type { Book } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import CoverImage from './CoverImage';
import { RatingDisplay } from './RatingInput';

interface BookCardProps {
  book: Book;
  idx: number;
  isSelected: boolean;
  isFocused: boolean;
  selectMode?: boolean;
  trashMode?: boolean;
  ratingMode?: 'stars' | 'decimal';
  onClick: (e: React.MouseEvent, b: Book) => void;
  onTouchStart: (b: Book, e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onToggleSelect?: (id: string) => void;
  onEdit: (b: Book) => void;
  onFullEdit?: (b: Book) => void;
  onToggleFavorite?: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
}

const BookCard = memo(function BookCard({
  book: b,
  idx,
  isSelected,
  isFocused,
  selectMode,
  trashMode,
  ratingMode,
  onClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleSelect,
  onEdit,
  onFullEdit,
  onToggleFavorite,
  onDelete,
  onRestore,
  onPermanentDelete,
}: BookCardProps) {
  const pct = calculateProgressPercentage(b);
  const formattedProgress = getStatusAwareProgressText(b);
  const statusCfg = getStatusConfig(b.status);

  return (
    <div className="h-full transition-transform duration-200 ease-out hover:-translate-y-1 active:scale-[0.98]">
      <Card
        data-card-id={b.id}
        className={`surface-t2 group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl ${idx >= 6 ? 'cv-grid-card' : ''} ${
          isSelected
            ? 'border-accent-color bg-accent-color/10 ring-2 ring-accent-color'
            : statusCfg.glowShadow
        } ${isFocused ? 'scale-[1.02] shadow-xl ring-2 ring-amber-500' : ''}`}
        onClick={(e) => onClick(e, b)}
        onTouchStart={(e) => onTouchStart(b, e)}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="vignette-inset relative aspect-[2/3] w-full overflow-hidden bg-surface">
          {/* Subtle Status Gradient Side Border */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-1 border-r border-black/20 bg-gradient-to-b sm:w-1.5 ${statusCfg.sideGradient}`}
          />

          <CoverImage
            src={b.cover_url}
            title={b.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
            priority={idx < 2}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {b.cover_url && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
          )}

          {/* Top Overlay Header: Status Badge & Favorite/Action Pill */}
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1">
            {/* Checkbox for Select Mode or Status Badge */}
            {selectMode ? (
              <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-border text-accent-color shadow-sm focus:ring-accent-color"
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(b.id)}
                />
              </div>
            ) : (
              <div className="min-w-0 flex-1 pointer-events-auto">
                <Badge
                  variant={statusCfg.variant}
                  className="inline-flex max-w-full gap-1 truncate px-1.5 py-0.5 text-[9.5px] font-medium shadow-xs backdrop-blur-md"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusCfg.dotColor}`} />
                  <span className="truncate">{b.status}</span>
                </Badge>
              </div>
            )}

            {/* Dropdown Action Menu & Favorite Pill */}
            <div
              className="flex shrink-0 items-center rounded-full border border-white/20 bg-black/40 shadow-md backdrop-blur-md transition-all hover:scale-105 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {b.is_favorite && (
                <div className="flex items-center justify-center pr-0.5 pl-2" title="Favorite">
                  <Heart className="h-3 w-3 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${b.title}`}
                    className="h-6.5 w-6.5 rounded-full text-white hover:bg-white/20"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {trashMode ? (
                    <>
                      <DropdownMenuItem onClick={() => onRestore?.(b)}>
                        <RotateCcw className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Restore</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPermanentDelete?.(b)}
                        className="text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Permanently</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => onEdit(b)}>
                        <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Quick Inspect</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => (onFullEdit ?? onEdit)(b)}>
                        <Edit3 className="mr-2 h-4 w-4 text-accent-color" />
                        <span>Edit Full Book</span>
                      </DropdownMenuItem>

                      {onToggleFavorite && (
                        <DropdownMenuItem onClick={() => onToggleFavorite(b)}>
                          <Heart
                            className={`mr-2 h-4 w-4 ${b.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`}
                          />
                          <span>{b.is_favorite ? 'Unfavorite' : 'Favorite'}</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onDelete(b)}
                        className="text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col justify-between gap-2 p-3 sm:p-3.5">
          <div>
            <h2 className="line-clamp-2 text-xs font-bold leading-snug tracking-tight text-text transition-colors group-hover:text-accent-color">
              {b.title}
            </h2>
            {b.author && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{b.author}</p>
            )}
            {(b.series_name || (b.reread_count ?? 0) > 0) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {b.series_name && (
                  <span className="inline-block max-w-full truncate rounded bg-accent-color/10 px-1 py-0.2 text-[9.5px] font-bold text-accent-color">
                    [{b.series_name.toUpperCase()}
                    {b.series_order != null ? ` #${b.series_order}` : ''}]
                  </span>
                )}
                {(b.reread_count ?? 0) > 0 && (
                  <span className="inline-block rounded bg-blue-500/20 px-1 py-0.2 text-[9px] font-bold text-blue-500">
                    RE-READ
                  </span>
                )}
              </div>
            )}
            {(b.date_finished || b.date_started) && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-text-muted/80">
                <Clock className="h-2.5 w-2.5 shrink-0 text-amber-500/80" />
                <span className="truncate">
                  {b.date_finished
                    ? `Fin ${formatShortDate(b.date_finished)}`
                    : `Start ${formatShortDate(b.date_started)}`}
                  {b.date_started && (
                    <span className="ml-1 font-semibold text-amber-500">
                      ({calculateReadingDuration(b.date_started, b.date_finished)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="mt-auto space-y-1.5 pt-1">
            <p className="truncate font-mono text-[10px] font-medium text-text-muted">
              {formattedProgress}
            </p>
            <div className="flex items-center justify-between text-[11px]">
              <RatingDisplay rating={b.rating} mode={ratingMode || 'stars'} />
              {pct != null && (
                <span className="font-mono text-[10px] font-semibold text-text-muted">{pct}%</span>
              )}
            </div>

            {pct != null ? (
              <Progress value={pct} className="h-1.5" />
            ) : b.is_ongoing ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-accent-color/60" />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

function BookGrid({
  books,
  ratingMode,
  trashMode = false,
  hasAnyBooks = false,
  onEdit,
  onFullEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onToggleFavorite,
  selectMode = false,
  selected = new Set(),
  onToggleSelect,
  focusedId,
}: {
  books: Book[];
  ratingMode?: 'stars' | 'decimal';
  trashMode?: boolean;
  hasAnyBooks?: boolean;
  onEdit: (book: Book) => void;
  onFullEdit?: (book: Book) => void;
  onDelete: (book: Book) => void;
  onRestore?: (book: Book) => void;
  onPermanentDelete?: (book: Book) => void;
  onToggleFavorite?: (book: Book) => void;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  focusedId?: string | null;
}) {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

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

    if (selectMode && onToggleSelect) {
      onToggleSelect(b.id);
      return;
    }

    if (e.detail === 2 && onFullEdit) {
      onFullEdit(b);
      return;
    }

    // Instant 0ms response on single click
    onEdit(b);
  };

  useEffect(() => {
    if (focusedId) {
      const el = document.querySelector(`[data-card-id="${focusedId}"]`);
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
      <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card-bg/40 p-12 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-text-muted/50" />
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7">
      {books.map((b, idx) => (
        <BookCard
          key={b.id}
          book={b}
          idx={idx}
          isSelected={selected.has(b.id)}
          isFocused={focusedId === b.id}
          selectMode={selectMode}
          trashMode={trashMode}
          ratingMode={ratingMode}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onFullEdit={onFullEdit}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
        />
      ))}
    </div>
  );
}

export default memo(BookGrid);
