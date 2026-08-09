'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { calculateProgressPercentage, formatProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import type { Book } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
import CoverImage from './CoverImage';
import { RatingDisplay } from './RatingInput';

interface BookInspectorDrawerProps {
  book: Book | null;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onUpdateProgress: (book: Book, newProgress: number) => void;
  onUpdateDates: (book: Book, startDate: string | null, finishDate: string | null) => void;
  onDelete: (book: Book) => void;
}

export default function BookInspectorDrawer({
  book,
  onClose,
  onEdit,
  onUpdateProgress,
  onUpdateDates,
  onDelete,
}: BookInspectorDrawerProps) {
  const [quickStartDate, setQuickStartDate] = useState<string>('');
  const [quickFinishDate, setQuickFinishDate] = useState<string>('');

  if (!book) return null;

  const pct = calculateProgressPercentage(book);
  const formattedProgress = formatProgressText(book);
  const statusCfg = getStatusConfig(book.status);

  // Helper for quick date chips
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getYesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const getDaysAgoISO = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const handleIncrementProgress = (delta: number) => {
    const current = book.progress ?? 0;
    const max = book.total_units ?? 999999;
    const nextVal = Math.min(max, Math.max(0, current + delta));
    onUpdateProgress(book, nextVal);
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col w-96 shrink-0 border-l border-border bg-card-bg/95 backdrop-blur-md h-[calc(100vh-4rem)] sticky top-16 right-0 overflow-y-auto shadow-2xl z-20"
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Desktop Inspector</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(book)}
              className="h-8 gap-1.5 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Full Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Main Book Banner */}
          <div className="flex items-start gap-4">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-border shadow-md bg-surface">
              <CoverImage
                src={book.cover_url}
                title={book.title}
                fill
                sizes="80px"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Badge
                variant={statusCfg.variant}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide gap-1 shadow-2xs"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`} />
                <span>{book.status}</span>
              </Badge>

              <h3 className="font-bold text-text text-base leading-snug tracking-tight">
                {book.title}
              </h3>

              <p className="text-xs text-text-muted">
                {book.author || 'Unknown Author'} {book.type ? `· ${book.type}` : ''}
              </p>

              {book.source_link && (
                <a
                  href={book.source_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>Read Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Progress Steppers */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text">Reading Progress</span>
              <span className="text-text-muted">{formattedProgress}</span>
            </div>

            {pct != null && <Progress value={pct} className="h-2 rounded-full" />}

            {/* +1, +5, +10 Quick Increment Chips */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleIncrementProgress(1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card-bg hover:bg-surface text-text transition-colors shadow-2xs"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleIncrementProgress(5)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card-bg hover:bg-surface text-text transition-colors shadow-2xs"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleIncrementProgress(10)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-card-bg hover:bg-surface text-text transition-colors shadow-2xs"
                >
                  +10
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleIncrementProgress(-1)}
                  className="px-2 py-1 text-xs font-semibold rounded-lg border border-border bg-card-bg hover:bg-surface text-text-muted hover:text-text transition-colors"
                  title="Step Back -1"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          {/* Quick Desktop Date Picker Section */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-sky-400" />
                <span>Quick Date Editor</span>
              </span>
              <span className="text-[10px] text-text-muted">Desktop Fast Chips</span>
            </div>

            {/* Start Date Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Start Date</span>
                <span className="font-semibold text-text">
                  {book.date_started ? formatShortDate(book.date_started) : 'Not set'}
                </span>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateDates(book, getTodayISO(), book.date_finished)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDates(book, getYesterdayISO(), book.date_finished)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDates(book, getDaysAgoISO(7), book.date_finished)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  7 Days Ago
                </button>
                {book.date_started && (
                  <button
                    type="button"
                    onClick={() => onUpdateDates(book, null, book.date_finished)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Finish Date Row */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Finish Date</span>
                <span className="font-semibold text-emerald-400">
                  {book.date_finished ? formatShortDate(book.date_finished) : 'Not finished'}
                </span>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateDates(book, book.date_started, getTodayISO())}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                >
                  Mark Completed Today
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDates(book, book.date_started, getYesterdayISO())}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                {book.date_finished && (
                  <button
                    type="button"
                    onClick={() => onUpdateDates(book, book.date_started, null)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    Clear Finish Date
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-surface/40 p-3">
              <span className="text-text-muted text-[11px]">Rating</span>
              <div className="mt-1">
                <RatingDisplay rating={book.rating} mode="stars" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface/40 p-3">
              <span className="text-text-muted text-[11px]">Reading Duration</span>
              <div className="mt-1 font-semibold text-text flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {calculateReadingDuration(book.date_started, book.date_finished)}
                </span>
              </div>
            </div>
          </div>

          {/* Genre / Tags */}
          {book.genre_tags && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Genre & Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {book.genre_tags.split(',').map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-border bg-surface text-text-muted"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes Preview */}
          {book.notes && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Notes</span>
              <div className="p-3 rounded-xl border border-border bg-surface/40 text-xs text-text leading-relaxed whitespace-pre-wrap">
                {book.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface/40 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(book)}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20 text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onEdit(book)}
            className="text-xs gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Full Book</span>
          </Button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
