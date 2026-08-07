import { BookOpen, Clock, Edit3, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  hasAnyBooks?: boolean;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  trashMode?: boolean;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8">
      {books.map((b, idx) => {
        const pct = calculateProgressPercentage(b);
        const formattedProgress = formatProgressText(b);
        const statusCfg = getStatusConfig(b.status);
        const isSelected = selected.has(b.id);

        return (
          <Card
            key={b.id}
            className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card-bg/95 border-t-white/15 dark:border-t-white/10 backdrop-blur-md transition-all duration-300 ${
              isSelected
                ? 'border-accent-color ring-2 ring-accent-color bg-accent-color/10 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)]'
                : `border-border/80 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.35)] hover:-translate-y-1.5 hover:border-accent-color/50 hover:shadow-[0_14px_40px_-6px_rgba(0,0,0,0.5)] ${statusCfg.glowShadow}`
            }`}
            onClick={() => {
              if (selectMode && onToggleSelect) {
                onToggleSelect(b.id);
              } else {
                onEdit(b);
              }
            }}
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface">
              {/* Subtle Status Gradient Side Border */}
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 w-1 sm:w-1.5 z-10 bg-gradient-to-b ${statusCfg.sideGradient} border-r border-black/20`}
              />

              <CoverImage
                src={b.cover_url}
                title={b.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                priority={idx < 4}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              {b.cover_url && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              )}

              {/* Checkbox for Select Mode */}
              {selectMode && (
                <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-border text-accent-color focus:ring-accent-color shadow-sm"
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
                    className="max-w-full truncate px-2 py-0.5 font-medium text-[10px] shadow-xs backdrop-blur-md gap-1.5"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusCfg.dotColor}`} />
                    <span className="truncate">{b.status}</span>
                  </Badge>
                </div>
              )}

              {/* Dropdown Action Menu */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/65 group-hover:scale-105"
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
                          <Edit3 className="mr-2 h-4 w-4 text-accent-color" />
                          <span>Edit</span>
                        </DropdownMenuItem>
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
                <h4 className="line-clamp-2 font-bold text-text text-xs leading-snug tracking-tight transition-colors group-hover:text-accent-color">
                  {b.title}
                </h4>
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
                <p className="truncate text-[10px] font-medium text-text-muted">
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
        );
      })}
    </div>
  );
}

export default memo(BookGrid);
