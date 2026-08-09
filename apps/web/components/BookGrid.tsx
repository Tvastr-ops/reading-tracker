import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, Edit3, Heart, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
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
import { calculateProgressPercentage, formatProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import type { Book } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import CoverImage from './CoverImage';
import { RatingDisplay } from './RatingInput';

function BookGrid({
  books,
  ratingMode,
  hasAnyBooks = true,
  selectMode = false,
  selected = new Set(),
  onToggleSelect,
  trashMode = false,
  onEdit,
  onFullEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onToggleFavorite,
  focusedId = null,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  hasAnyBooks?: boolean;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  trashMode?: boolean;
  onEdit: (b: Book) => void;
  onFullEdit?: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
  onToggleFavorite?: (b: Book) => void;
  focusedId?: string | null;
}) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent, b: Book) => {
    if (selectMode && onToggleSelect) {
      onToggleSelect(b.id);
      return;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    if (isMobile) {
      if (onFullEdit) {
        onFullEdit(b);
      } else {
        onEdit(b);
      }
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
      <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card-bg/40 p-12 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-text-muted/50" />
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  return (
    <div className="grid 3xl:grid-cols-8 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      <AnimatePresence mode="popLayout">
        {books.map((b, idx) => {
          const pct = calculateProgressPercentage(b);
          const formattedProgress = formatProgressText(b);
          const statusCfg = getStatusConfig(b.status);
          const isSelected = selected.has(b.id);
          const isFocused = focusedId === b.id;
          const delay = idx < 6 ? idx * 0.015 : 0;

          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, scale: 1.008 }}
              whileTap={{ scale: 0.99 }}
              className="h-full"
            >
              <Card
                data-card-id={b.id}
                className={`surface-t2 group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl ${idx >= 6 ? 'cv-grid-card' : ''} ${
                  isSelected
                    ? 'border-accent-color bg-accent-color/10 ring-2 ring-accent-color'
                    : statusCfg.glowShadow
                } ${isFocused ? 'ring-2 ring-amber-500 scale-[1.02] shadow-xl' : ''}`}
                onClick={(e) => handleClick(e, b)}
              >
                <div className="vignette-inset relative aspect-[2/3] w-full overflow-hidden bg-surface">
                  {/* Subtle Status Gradient Side Border */}
                  <div
                    className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-1 bg-gradient-to-b sm:w-1.5 ${statusCfg.sideGradient} border-black/20 border-r`}
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

                  {/* Checkbox for Select Mode */}
                  {selectMode && (
                    <div
                      className="absolute top-2 left-2 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-border text-accent-color shadow-sm focus:ring-accent-color"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(b.id)}
                      />
                    </div>
                  )}

                  {/* Status Badge Overlay */}
                  {!selectMode && (
                    <div className="absolute top-2 left-2 z-10 max-w-[calc(100%-2.6rem)]">
                      <Badge
                        variant={statusCfg.variant}
                        className="max-w-full gap-1.5 truncate px-2 py-0.5 font-medium text-[10px] shadow-xs backdrop-blur-md"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusCfg.dotColor}`}
                        />
                        <span className="truncate">{b.status}</span>
                      </Badge>
                    </div>
                  )}

                  {/* Favorite Heart Indicator */}
                  {b.is_favorite && !selectMode && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <Heart className="h-4 w-4 fill-rose-500 text-rose-500 drop-shadow-md" />
                    </div>
                  )}

                  {/* Dropdown Action Menu */}
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${b.title}`}
                          className="h-7 w-7 rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-black/65"
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
                            <DropdownMenuItem
                              onClick={() => {
                                if (window.innerWidth < 1024) {
                                  (onFullEdit ?? onEdit)(b);
                                } else {
                                  onEdit(b);
                                }
                              }}
                            >
                              <Edit3 className="mr-2 h-4 w-4 text-accent-color" />
                              <span>Edit</span>
                            </DropdownMenuItem>

                            {onToggleFavorite && (
                              <DropdownMenuItem onClick={() => onToggleFavorite(b)}>
                                <Heart className={`mr-2 h-4 w-4 ${b.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
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

                <CardContent className="flex flex-1 flex-col justify-between gap-2 p-3 sm:p-3.5">
                  <div>
                    <h2 className="line-clamp-2 font-bold text-text text-xs leading-snug tracking-tight transition-colors group-hover:text-accent-color">
                      {b.title}
                    </h2>
                    {b.author && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{b.author}</p>
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
                    <p className="truncate font-medium text-[10px] text-text-muted">
                      {formattedProgress}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <RatingDisplay rating={b.rating} mode={ratingMode} />
                      {pct != null && (
                        <span className="font-semibold text-[10px] text-text-muted">{pct}%</span>
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
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default memo(BookGrid);
