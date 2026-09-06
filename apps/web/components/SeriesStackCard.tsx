'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Layers,
  MoreVertical,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusBadgeVariant } from '@/lib/status';
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
  const activeIndex =
    selectedVolIndex !== null && selectedVolIndex >= 0 && selectedVolIndex < sortedBooks.length
      ? selectedVolIndex
      : readingVolumes.length > 0
        ? sortedBooks.findIndex((b) => b.id === readingVolumes[0].id)
        : 0;

  const activeBook = sortedBooks[activeIndex] || sortedBooks[0];

  const seriesProgressPct =
    totalVolumes > 0 ? Math.round((completedVolumes / totalVolumes) * 100) : 0;

  const activeProgressPct = calculateProgressPercentage(activeBook) ?? 0;

  return (
    <Card className="surface-t1 relative flex h-full flex-col justify-between overflow-hidden border-2 border-border shadow-[3px_3px_0px_var(--border)] transition-all duration-200 hover:shadow-[4px_4px_0px_var(--border)]">
      {/* Top Header Ribbon */}
      <div className="flex items-center justify-between border-b-2 border-border bg-surface-raised px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-primary/50 bg-primary/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-primary"
          >
            <Layers className="mr-1 h-3 w-3 inline" />
            Series • {totalVolumes} Vols
          </Badge>
        </div>
        <div className="text-[11px] font-black text-text-muted">
          <span className="text-text">{completedVolumes}</span>/{totalVolumes} Read (
          {seriesProgressPct}%)
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
        {/* Main Content Area: Cover + Details */}
        <div className="flex gap-3 sm:gap-4">
          {/* Active Volume Cover */}
          <button
            type="button"
            onClick={(e) => onBookClick(e, activeBook)}
            className="group/cover relative h-28 w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-md border-2 border-border bg-surface-raised text-left shadow-[2px_2px_0px_var(--border)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:h-32 sm:w-22"
          >
            {activeBook.cover_url ? (
              <CoverImage
                src={activeBook.cover_url}
                title={activeBook.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-text-muted">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="mt-1 line-clamp-2 text-[9px] font-bold">{activeBook.title}</span>
              </div>
            )}
            <div className="absolute top-1 left-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-black text-white">
              #{activeBook.series_order != null ? activeBook.series_order : activeIndex + 1}
            </div>
          </button>

          {/* Active Volume Metadata */}
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-1">
                <Link
                  href={`/books/${activeBook.id}`}
                  className="line-clamp-2 text-sm font-black tracking-tight text-text hover:text-primary transition-colors"
                >
                  {seriesName}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-text-muted hover:text-text"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 border-2 border-border">
                    <DropdownMenuItem
                      onClick={() => (onFullEdit ? onFullEdit(activeBook) : onEdit(activeBook))}
                      className="font-bold cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Active Book
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="font-bold cursor-pointer">
                      <Link href={`/books/${activeBook.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Full Detail Page
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(activeBook)}
                      className="font-bold text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Trash Active Book
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {activeBook.author && (
                <p className="line-clamp-1 text-xs font-semibold text-text-muted">
                  {activeBook.author}
                </p>
              )}

              {/* Volume Title Subheader */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge
                  variant={getStatusBadgeVariant(activeBook.status)}
                  className="px-1.5 py-0 text-[10px] font-black"
                >
                  {activeBook.status}
                </Badge>
                <span className="line-clamp-1 text-[11px] font-bold text-text-muted">
                  Vol {activeBook.series_order ?? activeIndex + 1}: {activeBook.title}
                </span>
              </div>
            </div>

            {/* Active Book Progress Bar & Info */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
                <span className="truncate">{getStatusAwareProgressText(activeBook)}</span>
                <span className="font-black text-text">{activeProgressPct}%</span>
              </div>
              <Progress value={activeProgressPct} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Volume Selector Horizontal Chip Strip */}
        <div className="mt-3 border-t border-border/40 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-text-muted">
            <span>Volumes in Series</span>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 text-primary hover:underline cursor-pointer"
            >
              {expanded ? (
                <>
                  <span>Hide Ledger</span>
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>View All ({totalVolumes})</span>
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {/* Quick Volume Switcher Pills */}
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {sortedBooks.map((vol, vIdx) => {
              const isSelected = vIdx === activeIndex;
              const isDone = vol.status === 'Completed';
              const isReading = vol.status === 'Reading';

              return (
                <button
                  key={vol.id}
                  type="button"
                  onClick={() => setSelectedVolIndex(vIdx)}
                  className={`flex flex-shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10.5px] font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-[1px_1px_0px_var(--border)]'
                      : isDone
                        ? 'border-border bg-surface-raised text-text hover:border-primary/60'
                        : isReading
                          ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/20'
                          : 'border-border bg-surface text-text-muted hover:text-text'
                  }`}
                >
                  <span>
                    {isDone ? '✓ ' : ''}
                    Vol {vol.series_order != null ? vol.series_order : vIdx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expandable Full Volume Ledger Accordion */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-1.5 overflow-hidden border-t border-border/50 pt-2"
            >
              {sortedBooks.map((vol, vIdx) => {
                const isSelected = vIdx === activeIndex;

                return (
                  <div
                    key={vol.id}
                    className={`flex items-center justify-between rounded border p-2 text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5 font-bold'
                        : 'border-border/60 bg-surface-raised/40 hover:bg-surface-raised'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedVolIndex(vIdx)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                    >
                      <span className="font-black text-text-muted">
                        #{vol.series_order ?? vIdx + 1}
                      </span>
                      <span className="truncate font-bold text-text">{vol.title}</span>
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={getStatusBadgeVariant(vol.status)}
                        className="px-1.5 py-0 text-[9px] font-black"
                      >
                        {vol.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => onEdit(vol)}
                        className="rounded border border-border bg-surface p-1 text-text-muted hover:border-primary hover:text-primary cursor-pointer"
                        title="Quick Log"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Series Footer Progress Bar */}
      <div className="border-t border-border bg-surface-raised/60 px-3.5 py-2">
        <div className="flex items-center justify-between text-[10px] font-black uppercase text-text-muted mb-1">
          <span>Total Series Completion</span>
          <span className="text-text">{seriesProgressPct}%</span>
        </div>
        <Progress value={seriesProgressPct} className="h-1.5" />
      </div>
    </Card>
  );
});
