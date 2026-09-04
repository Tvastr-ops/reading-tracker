'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Heart,
  Layers,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { memo, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import type { Book } from '@/lib/types';
import CoverImage from './CoverImage';

export interface SeriesStackCardProps {
  seriesName: string;
  books: Book[];
  idx: number;
  ratingMode?: 'stars' | 'decimal';
  onBookClick: (e: React.MouseEvent, b: Book) => void;
  onEdit: (b: Book) => void;
  onFullEdit?: (b: Book) => void;
  onToggleFavorite?: (b: Book) => void;
  onDelete: (b: Book) => void;
}

export const SeriesStackCard = memo(function SeriesStackCard({
  seriesName,
  books,
  idx,
  onBookClick,
  onEdit,
  onFullEdit,
  onToggleFavorite,
  onDelete,
}: SeriesStackCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Sort volumes by series_order then title
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      if (a.series_order != null && b.series_order != null) {
        return a.series_order - b.series_order;
      }
      if (a.series_order != null) return -1;
      if (b.series_order != null) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [books]);

  const totalVolumes = sortedBooks.length;
  const completedVolumes = sortedBooks.filter((b) => b.status === 'Completed').length;
  const readingVolumes = sortedBooks.filter((b) => b.status === 'Reading');
  const activeBook = readingVolumes.length > 0 ? readingVolumes[0] : sortedBooks[0];

  const seriesProgressPct =
    totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

  const heroCoverUrl =
    sortedBooks.find((b) => b.cover_url && b.cover_url.trim().length > 0)?.cover_url ||
    activeBook?.cover_url;

  return (
    <div className="relative h-full select-none transition-transform duration-200 ease-out hover:-translate-y-1">
      {/* 3D Stack Layer 2 (Backmost) */}
      {totalVolumes > 2 && (
        <div className="pointer-events-none absolute -right-2 -bottom-2 h-full w-full rounded-2xl border-2 border-border/40 bg-surface/60 shadow-xs" />
      )}

      {/* 3D Stack Layer 1 (Middle) */}
      {totalVolumes > 1 && (
        <div className="pointer-events-none absolute -right-1 -bottom-1 h-full w-full rounded-2xl border-2 border-border/70 bg-surface/80 shadow-xs" />
      )}

      {/* Foreground Main Stack Card */}
      <Card
        className={`surface-t2 group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-border bg-card-bg shadow-[3px_3px_0px_var(--border)] transition-all ${
          expanded ? 'ring-2 ring-accent-color' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="vignette-inset relative aspect-[2/3] w-full overflow-hidden bg-surface">
          <CoverImage
            src={heroCoverUrl}
            title={seriesName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
            priority={idx < 2}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Top Badges: Stack indicator */}
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1">
            <Badge className="inline-flex gap-1.5 border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
              <Layers className="h-3 w-3 text-amber-400" />
              <span>{totalVolumes} VOLUMES</span>
            </Badge>

            <div
              className="pointer-events-auto flex items-center rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/80"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              <span className="mr-1">{expanded ? 'Close' : 'View'}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </div>

          {/* Bottom Hero Info */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 space-y-1">
            <h3 className="line-clamp-1 font-bold text-sm text-white drop-shadow-md sm:text-base">
              {seriesName}
            </h3>
            <p className="line-clamp-1 text-[11px] text-white/80">
              {activeBook?.author || `${totalVolumes} Parts in Series`}
            </p>
            {/* Aggregate Progress Bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/90">
                <span>
                  {completedVolumes} of {totalVolumes} Finished
                </span>
                <span>{seriesProgressPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${seriesProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Volume Drawer */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t-2 border-border bg-surface/95 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold text-text-muted">
                <span>SERIES VOLUMES</span>
                <span>{totalVolumes} ENTRIES</span>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {sortedBooks.map((book) => {
                  const statusCfg = getStatusConfig(book.status);
                  const progressPct = calculateProgressPercentage(book);

                  return (
                    <div
                      key={book.id}
                      className="group/vol flex items-center justify-between rounded-lg border border-border/80 bg-card-bg p-2 transition-colors hover:border-accent-color/60 hover:bg-surface"
                    >
                      <div
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                        onClick={(e) => onBookClick(e, book)}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-[10.5px] font-bold text-text">
                          {book.series_order != null ? `#${book.series_order}` : '•'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-text group-hover/vol:text-accent-color">
                            {book.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                            <span className="font-medium">
                              {getStatusAwareProgressText(book)}
                            </span>
                            {progressPct != null && progressPct > 0 && progressPct < 100 && (
                              <span className="text-accent-color font-semibold">
                                ({progressPct}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-2">
                        <Badge
                          variant={statusCfg.variant}
                          className="h-5 px-1.5 text-[9px] font-medium"
                        >
                          {book.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-text-muted hover:text-text"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(book)}>
                              <BookOpen className="mr-2 h-3.5 w-3.5 text-accent-color" />
                              <span>Quick Inspect</span>
                            </DropdownMenuItem>
                            {onFullEdit && (
                              <DropdownMenuItem onClick={() => onFullEdit(book)}>
                                <Edit3 className="mr-2 h-3.5 w-3.5" />
                                <span>Edit Details</span>
                              </DropdownMenuItem>
                            )}
                            {onToggleFavorite && (
                              <DropdownMenuItem onClick={() => onToggleFavorite(book)}>
                                <Heart
                                  className={`mr-2 h-3.5 w-3.5 ${
                                    book.is_favorite ? 'fill-amber-400 text-amber-400' : ''
                                  }`}
                                />
                                <span>
                                  {book.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}
                                </span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-500"
                              onClick={() => onDelete(book)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
});
