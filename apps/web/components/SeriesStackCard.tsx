'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Heart,
  Layers,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { memo, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [selectedVolIndex, setSelectedVolIndex] = useState<number | null>(null);

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
  const activeBook =
    selectedVolIndex !== null && sortedBooks[selectedVolIndex]
      ? sortedBooks[selectedVolIndex]
      : readingVolumes.length > 0
        ? readingVolumes[0]
        : sortedBooks[0];

  const seriesProgressPct =
    totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

  const heroCoverUrl =
    activeBook?.cover_url ||
    sortedBooks.find((b) => b.cover_url && b.cover_url.trim().length > 0)?.cover_url;

  // Background layers metadata for 3D fanned deck
  const layer1Book =
    sortedBooks.length > 1
      ? sortedBooks[1]?.id === activeBook?.id
        ? sortedBooks[0]
        : sortedBooks[1]
      : null;
  const layer2Book =
    sortedBooks.length > 2
      ? sortedBooks[2]?.id === activeBook?.id
        ? sortedBooks[1]
        : sortedBooks[2]
      : null;

  return (
    <div className="group/stack relative h-full select-none perspective-[1000px] transition-transform duration-300 ease-out hover:-translate-y-1.5">
      {/* ================= 3D FANNED DECK LAYER 2 (Backmost Volume) ================= */}
      {totalVolumes > 2 && (
        <div
          className="pointer-events-none absolute inset-0 z-0 origin-bottom-left overflow-hidden rounded-2xl border-2 border-border/80 bg-surface/90 shadow-[2px_2px_0px_var(--border)] transition-all duration-300 ease-out group-hover/stack:translate-x-3.5 group-hover/stack:-translate-y-2.5 group-hover/stack:rotate-[4.5deg]"
          style={{ transform: 'translate(7px, -5px) rotate(2.5deg)' }}
        >
          {layer2Book?.cover_url ? (
            <div className="relative h-full w-full opacity-60">
              <CoverImage
                src={layer2Book.cover_url}
                title={layer2Book.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ) : (
            <div className="h-full w-full bg-surface-high/60" />
          )}
          <div className="absolute top-2 right-2 rounded-md border border-white/20 bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-amber-300 shadow-xs">
            #{layer2Book?.series_order != null ? layer2Book.series_order : '3'}
          </div>
        </div>
      )}

      {/* ================= 3D FANNED DECK LAYER 1 (Middle Volume) ================= */}
      {totalVolumes > 1 && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] origin-bottom-left overflow-hidden rounded-2xl border-2 border-border/90 bg-surface shadow-[3px_3px_0px_var(--border)] transition-all duration-300 ease-out group-hover/stack:translate-x-2 group-hover/stack:-translate-y-1.5 group-hover/stack:rotate-[2.2deg]"
          style={{ transform: 'translate(3.5px, -2.5px) rotate(1.2deg)' }}
        >
          {layer1Book?.cover_url ? (
            <div className="relative h-full w-full opacity-75">
              <CoverImage
                src={layer1Book.cover_url}
                title={layer1Book.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
            </div>
          ) : (
            <div className="h-full w-full bg-surface" />
          )}
          <div className="absolute top-2 right-2 rounded-md border border-white/20 bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-cyan-300 shadow-xs">
            #{layer1Book?.series_order != null ? layer1Book.series_order : '2'}
          </div>
        </div>
      )}

      {/* ================= HARDCOVER PAGE EDGES UNDERNEATH ================= */}
      {totalVolumes > 1 && (
        <div
          className="pointer-events-none absolute -right-1.5 bottom-0 top-3 z-[2] w-2 rounded-r-md border-r-2 border-y border-border/80 opacity-90 transition-all duration-300 group-hover/stack:translate-x-0.5"
          style={{
            background:
              'repeating-linear-gradient(to bottom, var(--paper-bg, #f5f0e6), var(--paper-bg, #f5f0e6) 2px, var(--border, #000000) 2px, var(--border, #000000) 3px)',
          }}
        />
      )}

      {/* ================= FOREGROUND MAIN STACK CARD ================= */}
      <Card
        className={`surface-t2 group relative z-10 flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-border bg-card-bg shadow-[4px_4px_0px_var(--border)] transition-all duration-200 ${
          expanded ? 'ring-2 ring-accent-color' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="vignette-inset relative aspect-[2/3] w-full overflow-hidden bg-surface">
          {/* Authentic Book Spine Shadow Gradient on Left Edge */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />

          <CoverImage
            src={heroCoverUrl}
            title={seriesName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 15vw"
            priority={idx < 2}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Top Badges: Total volumes + Quick In-Place Volume Switcher */}
          <div className="absolute inset-x-2 top-2 z-20 flex items-center justify-between gap-1">
            <Badge className="inline-flex items-center gap-1.5 border border-white/20 bg-black/75 px-2 py-0.5 text-[10px] font-black text-white shadow-md backdrop-blur-md">
              <Layers className="h-3 w-3 text-amber-400" />
              <span>{totalVolumes} IN SERIES</span>
            </Badge>

            <div
              className="pointer-events-auto flex items-center rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-md transition-colors hover:bg-black/90"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              <span className="mr-1">{expanded ? 'Close' : 'Volumes'}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </div>

          {/* Quick Volume Switcher Pills on Card (up to 5 pills) */}
          {totalVolumes > 1 && totalVolumes <= 6 && (
            <div className="absolute top-9 left-2 z-20 flex flex-wrap gap-1">
              {sortedBooks.map((b, i) => {
                const isCur = b.id === activeBook?.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    title={b.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVolIndex(i);
                    }}
                    className={`rounded border px-1.5 py-0.2 text-[8.5px] font-black uppercase transition-all shadow-xs ${
                      isCur
                        ? 'border-accent-color bg-accent-color text-white scale-105 shadow-sm'
                        : 'border-white/30 bg-black/60 text-white/90 hover:bg-black/85'
                    }`}
                  >
                    #{b.series_order != null ? b.series_order : i + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Hero Info */}
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2 z-20 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                {activeBook?.series_order != null ? `#${activeBook.series_order} • ` : ''}
                {activeBook?.title || seriesName}
              </span>
              {activeBook?.status && (
                <span className="shrink-0 rounded-sm bg-black/80 px-1 py-0.2 text-[8.5px] font-black text-emerald-400 border border-emerald-500/30">
                  {activeBook.status.toUpperCase()}
                </span>
              )}
            </div>

            <h3 className="line-clamp-1 font-black text-sm text-white drop-shadow-md sm:text-base">
              {seriesName}
            </h3>
            <p className="line-clamp-1 text-[10.5px] font-medium text-white/80">
              {activeBook?.author || `${totalVolumes} in Series`}
            </p>

            {/* Aggregate Progress Bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[9.5px] font-black text-white/90">
                <span>
                  {completedVolumes} of {totalVolumes} Finished
                </span>
                <span>{seriesProgressPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20 border border-white/10">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
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
                            <span className="font-medium">{getStatusAwareProgressText(book)}</span>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/books/${book.id}`} className="cursor-pointer">
                                <BookOpen className="mr-2 h-3.5 w-3.5 text-primary" />
                                <span>View Full Details</span>
                              </Link>
                            </DropdownMenuItem>

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
