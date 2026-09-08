'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Edit3,
  Heart,
  Layers,
  MoreVertical,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { memo, useMemo, useState } from 'react';
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
import { getStatusAwareProgressText } from '@/lib/progress';
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
  idx: _idx,
  onBookClick,
  onEdit,
  onFullEdit,
  onToggleFavorite,
  onDelete,
}: SeriesStackCardProps) {
  const [selectedVolIndex, setSelectedVolIndex] = useState<number | null>(null);
  const [showLedger, setShowLedger] = useState(false);

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

  // Default to currently reading book, or user's selected volume, or first volume
  const activeIndex =
    selectedVolIndex !== null && selectedVolIndex >= 0 && selectedVolIndex < sortedBooks.length
      ? selectedVolIndex
      : readingVolumes.length > 0
        ? sortedBooks.findIndex((b) => b.id === readingVolumes[0].id)
        : 0;

  const activeBook = sortedBooks[activeIndex] || sortedBooks[0];

  const seriesProgressPct =
    totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

  const formattedProgress = getStatusAwareProgressText(activeBook);
  const statusCfg = getStatusConfig(activeBook.status);

  return (
    <div className="group/stack relative h-full transition-transform duration-200 ease-out hover:-translate-y-1 active:scale-[0.98]">
      {/* Tactile Physical Stacked Deck Backing Layers (rendered when multiple volumes exist) */}
      {totalVolumes > 1 && (
        <>
          <div className="pointer-events-none absolute -top-1.5 -right-1.5 z-0 h-full w-full rounded-2xl border-2 border-border/70 bg-surface-raised/80 shadow-[2px_2px_0px_var(--border)] transition-transform duration-300 group-hover/stack:-top-2 group-hover/stack:-right-2" />
          {totalVolumes > 2 && (
            <div className="pointer-events-none absolute -top-3 -right-3 -z-10 h-full w-full rounded-2xl border-2 border-border/40 bg-surface/50 shadow-[1px_1px_0px_var(--border)] transition-transform duration-300 group-hover/stack:-top-3.5 group-hover/stack:-right-3.5" />
          )}
        </>
      )}

      {/* Main Card Shell */}
      <Card
        data-card-id={activeBook.id}
        className={`surface-t2 group relative z-10 flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-border shadow-[3px_3px_0px_var(--border)] ${statusCfg.glowShadow}`}
        onClick={(e) => onBookClick(e, activeBook)}
      >
        {/* Full-Bleed 2:3 Vertical Cover Artwork */}
        <div className="vignette-inset relative aspect-[2/3] w-full overflow-hidden bg-surface">
          {/* Status Gradient Left Border */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-1 border-r border-black/20 bg-gradient-to-b sm:w-1.5 ${statusCfg.sideGradient}`}
          />

          <CoverImage
            src={activeBook.cover_url}
            title={activeBook.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {activeBook.cover_url && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-70 transition-opacity group-hover:opacity-50" />
          )}

          {/* Top Overlay: Series Pill + Status Badge + Actions */}
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1">
            {/* Series Stack Indicator */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="gap-1 border-white/20 bg-black/65 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-amber-400 shadow-md backdrop-blur-md"
              >
                <Layers className="h-3 w-3" />
                <span>{totalVolumes} Vols</span>
              </Badge>
            </div>

            {/* Action Menu & Favorite Indicator */}
            <div
              className="pointer-events-auto flex shrink-0 items-center rounded-full border border-white/20 bg-black/60 shadow-md backdrop-blur-md transition-all hover:scale-105"
              onClick={(e) => e.stopPropagation()}
            >
              {activeBook.is_favorite && (
                <div className="flex items-center justify-center pl-2 pr-0.5" title="Favorite">
                  <Heart className="h-3 w-3 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${seriesName}`}
                    className="h-6.5 w-6.5 rounded-full text-white hover:bg-white/20"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link href={`/books/${activeBook.id}`} className="cursor-pointer">
                      <BookOpen className="mr-2 h-4 w-4 text-primary" />
                      <span>Open Active Volume</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onEdit(activeBook)}>
                    <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Quick Inspect Volume</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => (onFullEdit ?? onEdit)(activeBook)}>
                    <Edit3 className="mr-2 h-4 w-4 text-accent-color" />
                    <span>Edit Active Book</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowLedger((prev) => !prev)}>
                    <Layers className="mr-2 h-4 w-4 text-indigo-400" />
                    <span>{showLedger ? 'Hide Volume List' : 'Show All Volumes'}</span>
                  </DropdownMenuItem>

                  {onToggleFavorite && (
                    <DropdownMenuItem onClick={() => onToggleFavorite(activeBook)}>
                      <Heart
                        className={`mr-2 h-4 w-4 ${activeBook.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`}
                      />
                      <span>{activeBook.is_favorite ? 'Unfavorite' : 'Favorite'}</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => onDelete(activeBook)}
                    className="text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Volume</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom Overlay on Cover: Current Volume Sub-Title */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10">
            <Badge
              variant={statusCfg.variant}
              className="inline-flex max-w-full gap-1 truncate px-1.5 py-0.5 text-[9px] font-semibold shadow-xs backdrop-blur-md"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusCfg.dotColor}`} />
              <span className="truncate">
                {activeBook.series_order != null
                  ? `Vol. ${activeBook.series_order}`
                  : `Vol. ${activeIndex + 1}`}
                : {activeBook.status}
              </span>
            </Badge>
          </div>
        </div>

        {/* Card Body: Series Title + Author + Interactive Volume Chips + Series Progress */}
        <CardContent className="flex flex-1 flex-col justify-between gap-2 p-3 sm:p-3.5">
          <div>
            {/* Series Title */}
            <h2 className="line-clamp-2 text-xs font-bold leading-snug tracking-tight text-text transition-colors group-hover:text-accent-color">
              {seriesName}
            </h2>

            {/* Author */}
            {activeBook.author && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{activeBook.author}</p>
            )}

            {/* Interactive Volume Chips */}
            {totalVolumes > 1 && (
              <div
                className="mt-2 flex flex-wrap items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {sortedBooks.map((b, vIdx) => {
                  const isCurrent = vIdx === activeIndex;
                  const isVolCompleted = b.status === 'Completed';
                  const isVolReading = b.status === 'Reading';
                  const label = b.series_order != null ? `v${b.series_order}` : `v${vIdx + 1}`;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedVolIndex(vIdx)}
                      className={`cursor-pointer rounded px-1.5 py-0.5 text-[9.5px] font-bold transition-all ${
                        isCurrent
                          ? 'border border-accent-color bg-accent-color text-accent-color-foreground shadow-xs'
                          : isVolCompleted
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                            : isVolReading
                              ? 'border border-amber-500/30 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400'
                              : 'border border-border/60 bg-surface-raised text-text-muted hover:border-border hover:text-text'
                      }`}
                      title={`${b.title} (${b.status})`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expandable Volume List Accordion */}
          <AnimatePresence>
            {showLedger && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-lg border border-border bg-surface-raised p-2 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Volumes in Series
                </div>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {sortedBooks.map((b, vIdx) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedVolIndex(vIdx);
                        onBookClick({} as React.MouseEvent, b);
                      }}
                      className="flex cursor-pointer items-center justify-between rounded p-1 text-[10.5px] transition-colors hover:bg-surface"
                    >
                      <span className="truncate font-medium text-text">
                        {b.series_order != null ? `#${b.series_order} ` : ''}
                        {b.title}
                      </span>
                      <span className="shrink-0 text-[9.5px] text-text-muted">{b.status}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Series Progress Footer */}
          <div className="mt-auto space-y-1 pt-1.5">
            <div className="flex items-center justify-between text-[10px] font-medium text-text-muted">
              <span className="truncate">{formattedProgress}</span>
              <span className="shrink-0 font-bold text-text">
                {completedVolumes}/{totalVolumes} Read ({seriesProgressPct}%)
              </span>
            </div>
            <Progress value={seriesProgressPct} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
