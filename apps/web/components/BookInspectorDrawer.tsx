'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Edit3,
  ExternalLink,
  Save,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Undo2,
  X,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import { type Book, type ReadingJourney, STATUSES } from '@/lib/types';
import { calculateReadingDuration, getLocalDateString } from '@/lib/utils';
import CoverImage from './CoverImage';
import { InteractiveStarRating } from './RatingInput';

interface BookInspectorDrawerProps {
  book: Book | null;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onSaveInspectorBook: (updatedBook: Book) => Promise<void>;
  onDelete: (book: Book) => void;
}

export default function BookInspectorDrawer({
  book,
  onClose,
  onEdit,
  onSaveInspectorBook,
  onDelete,
}: BookInspectorDrawerProps) {
  const [draft, setDraft] = useState<Book | null>(book);
  const [saving, setSaving] = useState(false);
  const [journeys, setJourneys] = useState<ReadingJourney[]>([]);
  const [showAllJourneys, setShowAllJourneys] = useState(false);
  const [_loadingJourneys, setLoadingJourneys] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateMedia = () => setIsDesktop(window.innerWidth >= 1024);
    updateMedia();
    window.addEventListener('resize', updateMedia);
    return () => window.removeEventListener('resize', updateMedia);
  }, []);

  // Sync draft & fetch journeys when target book changes
  useEffect(() => {
    setDraft(book);
    if (book?.id) {
      setLoadingJourneys(true);
      fetch(`/api/books/${book.id}/journeys`)
        .then((res) => (res.ok ? res.json() : { journeys: [] }))
        .then((data) => setJourneys(data.journeys || []))
        .catch(() => setJourneys([]))
        .finally(() => setLoadingJourneys(false));
    } else {
      setJourneys([]);
    }
  }, [book?.id, book?.updated_at]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!book || !draft) return null;

  // Check if draft has unsaved changes compared to original book
  const isDirty =
    draft.status !== book.status ||
    draft.rating !== book.rating ||
    draft.progress !== book.progress ||
    draft.parent_progress !== book.parent_progress ||
    draft.date_started !== book.date_started ||
    draft.date_finished !== book.date_finished;

  const pct = calculateProgressPercentage(draft);
  const formattedProgress = getStatusAwareProgressText(draft);
  const statusCfg = getStatusConfig(draft.status);

  // Date helper chips
  const getTodayISO = () => getLocalDateString();
  const getYesterdayISO = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  };
  const getDaysAgoISO = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getLocalDateString(d);
  };

  const isCompletedWithTotal =
    draft?.status === 'Completed' &&
    draft.total_units != null &&
    (draft.progress ?? 0) >= draft.total_units;

  const handleIncrementProgress = (delta: number) => {
    if (!draft) return;
    if (delta > 0 && isCompletedWithTotal) return;

    const current = draft.progress ?? 0;
    const max = draft.total_units ?? 999999;
    const nextVal = Math.min(max, Math.max(0, current + delta));

    let nextStatus = draft.status;
    if (nextVal > 0 && draft.status === 'Plan to Read') {
      nextStatus = 'Reading';
    } else if (draft.status === 'Completed' && nextVal > current) {
      nextStatus = 'Reading';
    }
    if (draft.total_units != null && nextVal >= draft.total_units) {
      nextStatus = 'Completed';
    }

    setDraft((prev) => (prev ? { ...prev, progress: nextVal, status: nextStatus } : null));
  };

  const handleIncrementVolume = (delta: number) => {
    const currentVol = draft.parent_progress ?? 0;
    const maxVol = draft.parent_total ?? 9999;
    const nextVol = Math.min(maxVol, Math.max(0, currentVol + delta));

    // If chapters reset per volume (total_units is null), reset chapter progress to 0 on forward volume advancement
    const shouldResetProgress = draft.total_units == null && delta > 0;
    const nextProgress = shouldResetProgress ? 0 : draft.progress;

    setDraft((prev) =>
      prev ? { ...prev, parent_progress: nextVol, progress: nextProgress } : null,
    );
  };

  const handleDiscard = () => {
    setDraft(book);
  };

  const handleSave = async () => {
    if (!draft || !isDirty) return;
    setSaving(true);
    try {
      await onSaveInspectorBook(draft);
    } finally {
      setSaving(false);
    }
  };

  const remainingUnits = (draft.total_units ?? 0) - (draft.progress ?? 0);
  const durationText = calculateReadingDuration(draft.date_started, draft.date_finished);

  return (
    <AnimatePresence>
      {/* 1. Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]"
      />

      {/* 2. Slide-Over Panel (Desktop Right / Mobile Bottom Sheet with Swipe-to-Dismiss) */}
      <motion.aside
        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
        animate={isDesktop ? { x: 0 } : { y: 0 }}
        exit={isDesktop ? { x: '100%' } : { y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
        drag={isDesktop ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 350) {
            onClose();
          }
        }}
        className="fixed z-50 flex flex-col bg-card-bg border-border shadow-2xl overflow-hidden inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t-2 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-screen lg:w-[430px] lg:max-h-screen lg:rounded-none lg:border-l-2 lg:border-t-0"
      >
        {/* Mobile Tactile Drag Bar */}
        <div className="flex shrink-0 justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none lg:hidden">
          <div className="h-1.5 w-12 rounded-full bg-border/90" />
        </div>

        {/* Top Header Controls */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface/50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-serif tracking-tight text-text">Book Inspector</span>
            {isDirty && (
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/books/${book.id}` as Route}
              className="flex h-8 items-center gap-1 rounded-md px-2 font-mono text-xs font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text"
              title="Open full page view"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Full Page</span>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(book)}
              className="h-8 gap-1 text-xs font-semibold"
              title="Press E to edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
              <kbd className="hidden font-mono text-[9px] font-semibold text-text-muted sm:inline">
                [E]
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-text-muted hover:text-text"
              aria-label="Close inspector"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Main Book Banner */}
          <div className="flex items-start gap-4">
            <div className="relative h-32 w-22 shrink-0 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[3px_3px_0px_var(--border)]">
              <CoverImage src={draft.cover_url} title={draft.title} fill sizes="90px" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {/* Interactive Status Selector (Draft State) */}
              <Select
                value={draft.status}
                onValueChange={(val) =>
                  setDraft((prev) => (prev ? { ...prev, status: val as Book['status'] } : null))
                }
              >
                <SelectTrigger className="inline-flex h-7 w-auto gap-1.5 rounded-full border-2 border-border bg-surface px-3 font-mono text-[11px] font-bold tracking-wide shadow-2xs">
                  <span className={`h-2 w-2 rounded-full ${statusCfg.dotColor}`} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <h3 className="font-serif text-lg font-bold leading-snug tracking-tight text-text">
                {draft.title}
              </h3>

              {(draft.series_name || (draft.reread_count ?? 0) > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {draft.series_name && (
                    <span className="inline-block rounded border border-border/60 bg-accent-bg px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-text">
                      [{draft.series_name.toUpperCase()}
                      {draft.series_order != null ? ` #${draft.series_order}` : ''}]
                    </span>
                  )}
                  {(draft.reread_count ?? 0) > 0 && (
                    <span className="inline-block rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-blue-500">
                      RE-READ ({draft.reread_count})
                    </span>
                  )}
                </div>
              )}

              {(() => {
                let shelves: string[] = [];
                try {
                  const parsed = JSON.parse(draft.shelf_names || '[]');
                  if (Array.isArray(parsed)) shelves = parsed;
                } catch {
                  if (draft.shelf_names)
                    shelves = draft.shelf_names
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                }
                if (shelves.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {shelves.map((sh) => (
                      <span
                        key={sh}
                        className="inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted"
                      >
                        🔖 {sh}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <p className="text-xs text-text-muted">
                {draft.author || 'Unknown Author'} {draft.type ? `· ${draft.type}` : ''}
              </p>

              {draft.source_link && (
                <a
                  href={
                    draft.source_link.startsWith('http')
                      ? draft.source_link
                      : `https://${draft.source_link}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:underline dark:text-amber-400"
                >
                  <span>Read Source</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Interactive Rating Stars Selector (Draft State) */}
          <div className="space-y-2 rounded-xl border border-border bg-surface/50 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>Rating</span>
              </span>
              <span className="font-mono text-xs font-bold text-text-muted">
                {draft.rating ? `${draft.rating.toFixed(1)} / 5.0` : 'Unrated'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <InteractiveStarRating
                value={draft.rating}
                onChange={(r) => setDraft((prev) => (prev ? { ...prev, rating: r } : null))}
              />
              {draft.rating != null && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => (prev ? { ...prev, rating: null } : null))}
                  className="cursor-pointer text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Progress Steppers (Draft State) */}
          <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-text">Reading Progress</span>
              <span className="font-mono font-bold text-text-muted">{formattedProgress}</span>
            </div>

            {pct != null && <Progress value={pct} className="h-2 rounded-full" />}

            {/* Multi-Tier Volume / Part Quick Advance Control */}
            {draft.progress_structure && draft.progress_structure !== 'single' && (
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card-bg p-2 text-xs">
                <span className="font-semibold text-text-muted">
                  {draft.progress_structure === 'volume_chapter' ? 'Volume' : 'Part'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-text">
                    {draft.parent_progress ?? 0}
                    {draft.parent_total != null ? ` / ${draft.parent_total}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIncrementVolume(1)}
                    className="ml-2 cursor-pointer rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-accent-text shadow-2xs transition-colors hover:bg-surface-hover"
                    title={
                      draft.total_units == null
                        ? 'Advance to next volume and reset chapter to 0'
                        : 'Advance to next volume'
                    }
                  >
                    +1 {draft.progress_structure === 'volume_chapter' ? 'Vol' : 'Part'}
                  </button>
                </div>
              </div>
            )}

            {/* +1, +5, +10 Quick Increment Chips */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isCompletedWithTotal}
                  onClick={() => handleIncrementProgress(1)}
                  className={`rounded-lg border-2 border-border bg-card-bg px-2.5 py-1 font-mono text-xs font-bold text-text shadow-[2px_2px_0px_var(--border)] transition-transform active:translate-y-0.5 active:shadow-none ${
                    isCompletedWithTotal
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:bg-surface'
                  }`}
                >
                  +1
                </button>
                <button
                  type="button"
                  disabled={isCompletedWithTotal}
                  onClick={() => handleIncrementProgress(5)}
                  className={`rounded-lg border-2 border-border bg-card-bg px-2.5 py-1 font-mono text-xs font-bold text-text shadow-[2px_2px_0px_var(--border)] transition-transform active:translate-y-0.5 active:shadow-none ${
                    isCompletedWithTotal
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:bg-surface'
                  }`}
                >
                  +5
                </button>
                <button
                  type="button"
                  disabled={isCompletedWithTotal}
                  onClick={() => handleIncrementProgress(10)}
                  className={`rounded-lg border-2 border-border bg-card-bg px-2.5 py-1 font-mono text-xs font-bold text-text shadow-[2px_2px_0px_var(--border)] transition-transform active:translate-y-0.5 active:shadow-none ${
                    isCompletedWithTotal
                      ? 'cursor-not-allowed opacity-40'
                      : 'cursor-pointer hover:bg-surface'
                  }`}
                >
                  +10
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleIncrementProgress(-1)}
                  className="cursor-pointer rounded-lg border border-border bg-card-bg px-2 py-1 font-mono text-xs font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text"
                  title="Step Back -1"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          {/* Quick Desktop Date Editor & Custom Date Pickers (Draft State) */}
          <div className="space-y-4 rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-sky-500" />
                <span>Quick Date Editor</span>
              </span>
              <span className="text-[10px] font-medium text-text-muted">Fast Chips</span>
            </div>

            {/* Start Date Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-text-muted">Start Date</span>
                <input
                  type="date"
                  value={draft.date_started || ''}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_started: e.target.value || null } : null,
                    )
                  }
                  className="rounded border border-border bg-card-bg px-1.5 py-0.5 text-[11px] text-text outline-none"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_started: getTodayISO() } : null))
                  }
                  className="cursor-pointer rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-500 hover:bg-sky-500/20"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_started: getYesterdayISO() } : null))
                  }
                  className="cursor-pointer rounded-md border border-border bg-card-bg px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_started: getDaysAgoISO(7) } : null))
                  }
                  className="cursor-pointer rounded-md border border-border bg-card-bg px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text"
                >
                  7 Days Ago
                </button>
                {draft.date_started && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, date_started: null } : null))
                    }
                    className="cursor-pointer rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-bold text-[10px] text-rose-500 hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Finish Date Section */}
            <div className="space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-text-muted">Finish Date</span>
                <input
                  type="date"
                  value={draft.date_finished || ''}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_finished: e.target.value || null } : null,
                    )
                  }
                  className="rounded border border-border bg-card-bg px-1.5 py-0.5 text-[11px] text-emerald-500 outline-none"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_finished: getTodayISO() } : null))
                  }
                  className="cursor-pointer rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/20"
                >
                  Completed Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_finished: getYesterdayISO() } : null,
                    )
                  }
                  className="cursor-pointer rounded-md border border-border bg-card-bg px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                {draft.date_finished && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, date_finished: null } : null))
                    }
                    className="cursor-pointer rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-bold text-[10px] text-rose-500 hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reading Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 rounded-xl border border-border bg-surface/40 p-3">
              <span className="text-[11px] text-text-muted">Total Duration</span>
              <div className="flex items-center gap-1 font-semibold text-text">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{durationText}</span>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-border bg-surface/40 p-3">
              <span className="text-[11px] text-text-muted">Remaining</span>
              <div className="flex items-center gap-1 font-semibold text-text">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                <span>
                  {remainingUnits > 0
                    ? `${remainingUnits} ${draft.unit_type || 'units'}`
                    : 'Finished'}
                </span>
              </div>
            </div>
          </div>

          {/* Genre / Tags */}
          {draft.genre_tags && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Genre & Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  new Set(
                    draft.genre_tags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  ),
                ).map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reading Journeys / History */}
          {(journeys.length > 0 ||
            (draft.reread_count ?? 0) > 0 ||
            draft.status === 'Completed') && (
            <div className="space-y-2 rounded-xl border border-border bg-surface/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">
                  Reading Journeys (
                  {journeys.length > 0 ? journeys.length : (draft.reread_count ?? 0) + 1})
                </span>
                {draft.status === 'Completed' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/books/${draft.id}/journeys`, {
                          method: 'POST',
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.book) {
                            setDraft(data.book);
                            await onSaveInspectorBook(data.book);
                          }
                          if (data.journey) {
                            setJourneys((prev) => [data.journey, ...prev]);
                          }
                          toast.success('Started new reading journey (Re-read)');
                        } else {
                          const err = await res.json().catch(() => ({}));
                          toast.error(err.error || 'Failed to start re-read');
                        }
                      } catch {
                        toast.error('Network error starting re-read');
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10.5px] font-bold text-blue-500 transition-colors hover:bg-blue-500/20"
                  >
                    <span>🔄</span>
                    <span>Start Re-read</span>
                  </button>
                )}
              </div>

              {journeys.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {(journeys.length > 3 && !showAllJourneys ? journeys.slice(0, 2) : journeys).map(
                    (j) => {
                      const isAct = j.status === 'reading';
                      const startStr = j.date_started
                        ? new Date(j.date_started).toLocaleDateString()
                        : 'N/A';
                      const finishStr = j.date_finished
                        ? new Date(j.date_finished).toLocaleDateString()
                        : isAct
                          ? 'Active'
                          : 'Finished';

                      return (
                        <div
                          key={j.id}
                          className={`flex items-center justify-between rounded-lg border p-2 text-xs ${
                            isAct
                              ? 'border-blue-500/40 bg-blue-500/10'
                              : 'border-border/60 bg-surface/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className={isAct ? 'text-blue-500' : 'text-text'}>
                                {j.journey_index === 1
                                  ? 'Read #1 (Original)'
                                  : `Read #${j.journey_index} (Re-read)`}
                              </span>
                              {isAct && (
                                <span className="rounded bg-blue-500 px-1 py-0.2 font-mono text-[9px] font-bold text-white uppercase">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="pt-0.5 text-[10px] text-text-muted">
                              {startStr} → {finishStr}
                            </div>
                          </div>
                          {j.rating != null && j.rating > 0 && (
                            <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-amber-500">
                              {j.rating} ★
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                  {journeys.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllJourneys(!showAllJourneys)}
                      className="w-full cursor-pointer rounded-md border border-border/40 bg-surface/30 py-1 text-center font-mono text-[10.5px] font-bold text-blue-500 transition-colors hover:text-blue-400"
                    >
                      {showAllJourneys
                        ? '▴ Show Fewer Reads'
                        : `▾ Show All (${journeys.length}) Past Reads`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Preview */}
          {draft.notes && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Notes</span>
              <div className="rounded-xl border border-border bg-surface/40 p-3 text-xs leading-relaxed text-text whitespace-pre-wrap">
                {draft.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions — Staged Draft Save Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface/60 p-4">
          {isDirty ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
                className="gap-1.5 border-border text-xs text-text-muted hover:text-text"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Discard</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5 bg-emerald-600 font-bold text-xs text-white shadow-md hover:bg-emerald-500"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(book)}
                className="gap-1.5 border-rose-500/20 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => onEdit(book)}
                className="gap-1.5 font-semibold text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Full Book</span>
              </Button>
            </>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
