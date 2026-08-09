'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  TrendingUp,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateProgressPercentage, formatProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import { type Book, STATUSES } from '@/lib/types';
import { calculateReadingDuration, formatShortDate } from '@/lib/utils';
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

  // Sync draft when target book changes
  useEffect(() => {
    setDraft(book);
  }, [book?.id, book?.updated_at]);

  if (!book || !draft) return null;

  // Check if draft has unsaved changes compared to original book
  const isDirty =
    draft.status !== book.status ||
    draft.rating !== book.rating ||
    draft.progress !== book.progress ||
    draft.date_started !== book.date_started ||
    draft.date_finished !== book.date_finished;

  const pct = calculateProgressPercentage(draft);
  const formattedProgress = formatProgressText(draft);
  const statusCfg = getStatusConfig(draft.status);

  // Date helper chips
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
    const current = draft.progress ?? 0;
    const max = draft.total_units ?? 999999;
    const nextVal = Math.min(max, Math.max(0, current + delta));
    setDraft((prev) => (prev ? { ...prev, progress: nextVal } : null));
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
      <motion.aside
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-border bg-card-bg/95 backdrop-blur-md h-[calc(100vh-4rem)] sticky top-16 right-0 overflow-y-auto shadow-2xl z-20"
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Desktop Book Inspector</span>
            {isDirty && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Unsaved Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(book)}
              className="h-8 gap-1.5 text-xs font-medium"
              title="Press E to edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Full Edit</span>
              <kbd className="font-mono text-[9px] font-semibold bg-surface border border-border px-1 rounded text-text-muted">
                E
              </kbd>
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
                src={draft.cover_url}
                title={draft.title}
                fill
                sizes="80px"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {/* Interactive Status Selector (Draft State) */}
              <Select
                value={draft.status}
                onValueChange={(val) =>
                  setDraft((prev) => (prev ? { ...prev, status: val as Book['status'] } : null))
                }
              >
                <SelectTrigger className="h-7 w-auto inline-flex rounded-full px-2.5 text-[11px] font-semibold tracking-wide gap-1 shadow-2xs border-border bg-surface">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`} />
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

              <h3 className="font-bold text-text text-base leading-snug tracking-tight">
                {draft.title}
              </h3>

              <p className="text-xs text-text-muted">
                {draft.author || 'Unknown Author'} {draft.type ? `· ${draft.type}` : ''}
              </p>

              {draft.source_link && (
                <a
                  href={draft.source_link.startsWith('http') ? draft.source_link : `https://${draft.source_link}`}
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

          {/* Interactive Rating Stars Selector (Draft State) */}
          <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span>Rating</span>
              </span>
              <span className="text-text-muted font-medium">
                {draft.rating ? `${draft.rating.toFixed(1)} / 5.0` : 'Unrated'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <InteractiveStarRating
                value={draft.rating}
                onChange={(r) =>
                  setDraft((prev) => (prev ? { ...prev, rating: r } : null))
                }
              />
              {draft.rating != null && (
                <button
                  type="button"
                  onClick={() => setDraft((prev) => (prev ? { ...prev, rating: null } : null))}
                  className="text-[10px] font-semibold text-rose-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Progress Steppers (Draft State) */}
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

          {/* Quick Desktop Date Editor & Custom Date Pickers (Draft State) */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-sky-400" />
                <span>Quick Date Editor</span>
              </span>
              <span className="text-[10px] font-medium text-text-muted">Desktop Fast Chips</span>
            </div>

            {/* Start Date Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted font-medium">Start Date</span>
                <input
                  type="date"
                  value={draft.date_started || ''}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_started: e.target.value || null } : null,
                    )
                  }
                  className="bg-card-bg border border-border text-text rounded px-1.5 py-0.5 text-[11px] outline-none"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_started: getTodayISO() } : null))
                  }
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_started: getYesterdayISO() } : null,
                    )
                  }
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_started: getDaysAgoISO(7) } : null,
                    )
                  }
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  7 Days Ago
                </button>
                {draft.date_started && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, date_started: null } : null))
                    }
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Finish Date Section */}
            <div className="space-y-2 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted font-medium">Finish Date</span>
                <input
                  type="date"
                  value={draft.date_finished || ''}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev ? { ...prev, date_finished: e.target.value || null } : null,
                    )
                  }
                  className="bg-card-bg border border-border text-emerald-400 rounded px-1.5 py-0.5 text-[11px] outline-none"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (prev ? { ...prev, date_finished: getTodayISO() } : null))
                  }
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
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
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-border bg-card-bg text-text-muted hover:text-text"
                >
                  Yesterday
                </button>
                {draft.date_finished && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => (prev ? { ...prev, date_finished: null } : null))
                    }
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reading Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-1">
              <span className="text-text-muted text-[11px]">Total Duration</span>
              <div className="font-semibold text-text flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>{durationText}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface/40 p-3 space-y-1">
              <span className="text-text-muted text-[11px]">Remaining</span>
              <div className="font-semibold text-text flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                <span>{remainingUnits > 0 ? `${remainingUnits} ${draft.unit_type || 'units'}` : 'Finished'}</span>
              </div>
            </div>
          </div>

          {/* Genre / Tags */}
          {draft.genre_tags && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Genre & Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {draft.genre_tags.split(',').map((tag) => (
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
          {draft.notes && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-muted">Notes</span>
              <div className="p-3 rounded-xl border border-border bg-surface/40 text-xs text-text leading-relaxed whitespace-pre-wrap">
                {draft.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions — Staged Draft Save Bar */}
        <div className="p-4 border-t border-border bg-surface/40 flex items-center justify-between gap-2">
          {isDirty ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
                className="text-xs gap-1.5 border-border text-text-muted hover:text-text"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Discard</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md"
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
            </>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
