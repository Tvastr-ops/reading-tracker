'use client';

import { BookOpen, Edit3, MoreVertical, RotateCcw, Trash2 } from 'lucide-react';
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
import { getStatusConfig } from '@/lib/status';
import type { Book } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

export default function BookGrid({
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
      {books.map((b) => {
        const pct = b.total_units
          ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100))
          : null;
        const statusCfg = getStatusConfig(b.status);
        const isSelected = selected.has(b.id);

        return (
          <Card
            key={b.id}
            className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card-bg transition-all duration-300 ${
              isSelected
                ? 'border-accent-color ring-2 ring-accent-color bg-accent-color/5 shadow-md'
                : 'border-border/70 shadow-xs hover:-translate-y-1 hover:border-accent-color/70 hover:shadow-xl hover:shadow-accent-color/5'
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
              {b.cover_url ? (
                <>
                  <img
                    src={b.cover_url}
                    alt={b.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-surface/80 p-2 text-center text-text-muted">
                  <BookOpen className="mb-1 h-8 w-8 opacity-40" />
                  <span className="line-clamp-2 text-[10px]">{b.title}</span>
                </div>
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
              </div>

              <div className="mt-auto space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <RatingDisplay rating={b.rating} mode={ratingMode} />
                  {pct != null && (
                    <span className="font-semibold text-[10px] text-text-muted">{pct}%</span>
                  )}
                </div>

                {pct != null && <Progress value={pct} className="h-1.5" />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
