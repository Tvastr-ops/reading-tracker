'use client';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Flame,
  Heart,
  Layers,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import CoverImage from '@/components/CoverImage';
import EnrichmentModal from '@/components/EnrichmentModal';
import ExternalLinksList from '@/components/ExternalLinksList';
import { InteractiveStarRating } from '@/components/RatingInput';
import ReadingLog from '@/components/ReadingLog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { getStatusConfig } from '@/lib/status';
import { type Book, type ReadingJourney, STATUS_COLOR_VAR, STATUSES } from '@/lib/types';
import { calculateReadingDuration, formatDisplayDate, getLocalDateString } from '@/lib/utils';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = typeof params?.id === 'string' ? params.id : '';

  const {
    books,
    loading: libraryLoading,
    deleteBook,
    handleToggleFavorite,
    handleSaveInspectorBook,
    load,
  } = useLibraryData();
  const { setEditing } = useLibraryUI();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [journeys, setJourneys] = useState<ReadingJourney[]>([]);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [startingReread, setStartingReread] = useState(false);

  // Sync book data from memory or API
  useEffect(() => {
    if (!bookId) return;

    const found = books.find((b) => b.id === bookId);
    if (found) {
      setBook(found);
      setLoading(false);
    } else if (!libraryLoading) {
      fetch(`/api/books/${bookId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Book not found');
          return res.json();
        })
        .then((data) => {
          setBook(data.book || null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }

    // Fetch reading journeys
    fetch(`/api/books/${bookId}/journeys`)
      .then((res) => (res.ok ? res.json() : { journeys: [] }))
      .then((d) => setJourneys(d.journeys || []))
      .catch(() => setJourneys([]));
  }, [bookId, books, libraryLoading]);

  // Velocity & Estimated Completion Date Forecaster
  const forecast = useMemo(() => {
    if (
      book?.status !== 'Reading' ||
      !book.total_units ||
      (book.progress ?? 0) >= book.total_units
    ) {
      return null;
    }

    const remaining = Math.max(0, book.total_units - (book.progress ?? 0));
    let dailyPace = 0;

    if (book.reading_pace && book.reading_pace > 0) {
      dailyPace = book.reading_pace / 7;
    } else if (book.date_started) {
      const start = new Date(book.date_started).getTime();
      const now = Date.now();
      const days = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)));
      dailyPace = (book.progress ?? 0) / days;
    }

    if (dailyPace <= 0) return null;

    const daysRemaining = Math.ceil(remaining / dailyPace);
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysRemaining);

    const formattedFinish = finishDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    const unit = book.unit_type || 'pages';

    return {
      dailyPace: Math.round(dailyPace * 10) / 10,
      daysRemaining,
      formattedFinish,
      unit,
    };
  }, [book]);

  if (loading || (libraryLoading && !book)) {
    return (
      <div className="space-y-6 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-surface/60" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="h-96 animate-pulse rounded-lg bg-surface/60 md:col-span-1" />
          <div className="h-96 animate-pulse rounded-lg bg-surface/60 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <Card className="p-12 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-40" />
        <h2 className="font-anton text-xl text-text">BOOK NOT FOUND</h2>
        <p className="mt-1 text-xs text-text-muted">
          This book may have been deleted or moved to trash.
        </p>
        <Link href="/library" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Return to Library
          </Button>
        </Link>
      </Card>
    );
  }

  const pct = calculateProgressPercentage(book);
  const formattedProgress = getStatusAwareProgressText(book);
  const _statusCfg = getStatusConfig(book.status);
  const durationText = calculateReadingDuration(book.date_started, book.date_finished);
  const unitType = book.unit_type || 'pages';

  const handleQuickIncrement = async (delta: number) => {
    if (!book) return;
    const current = book.progress ?? 0;
    const max = book.total_units ?? 999999;
    const nextVal = Math.min(max, Math.max(0, current + delta));

    let nextStatus = book.status;
    if (nextVal > 0 && book.status === 'Plan to Read') {
      nextStatus = 'Reading';
    }
    if (book.total_units != null && nextVal >= book.total_units) {
      nextStatus = 'Completed';
    }

    const updated: Book = {
      ...book,
      progress: nextVal,
      status: nextStatus,
    };

    setBook(updated);
    setSavingProgress(true);
    try {
      await handleSaveInspectorBook(updated);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleStatusChange = async (newStatus: Book['status']) => {
    if (!book) return;
    const today = getLocalDateString();
    const updated: Book = {
      ...book,
      status: newStatus,
      date_started: newStatus === 'Reading' && !book.date_started ? today : book.date_started,
      date_finished: newStatus === 'Completed' && !book.date_finished ? today : book.date_finished,
    };
    setBook(updated);
    await handleSaveInspectorBook(updated);
  };

  const handleRatingChange = async (newRating: number | null) => {
    if (!book) return;
    const updated: Book = { ...book, rating: newRating };
    setBook(updated);
    await handleSaveInspectorBook(updated);
  };

  const handleApplyEnrichment = async (enriched: any) => {
    if (!book) return;
    const updated: Book = {
      ...book,
      ...enriched,
    };
    setBook(updated);
    await handleSaveInspectorBook(updated);
  };

  const handleStartReread = async () => {
    if (!book) return;
    setStartingReread(true);
    try {
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: book.id }),
      });
      if (!res.ok) throw new Error('Failed to start re-read');
      toast.success('Started a new re-read journey!');
      load(true);
      // Refresh journeys list
      fetch(`/api/books/${book.id}/journeys`)
        .then((r) => (r.ok ? r.json() : { journeys: [] }))
        .then((d) => setJourneys(d.journeys || []));
    } catch (err: any) {
      toast.error(err?.message || 'Error starting re-read');
    } finally {
      setStartingReread(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    deleteBook(book);
    router.push('/library');
  };

  const tagList = book.genre_tags
    ? book.genre_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="relative space-y-6">
      {/* Ambient Cover Glow Canvas */}
      {book.cover_url && (
        <div
          className="pointer-events-none absolute -top-12 left-1/2 -z-10 h-72 w-full max-w-4xl -translate-x-1/2 opacity-25 blur-3xl transition-opacity duration-1000 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/library">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Library</span>
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Auto-Enrich */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5"
            onClick={() => setEnrichOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Auto-Enrich</span>
          </Button>

          {/* Favorite Toggle */}
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5 ${
              book.is_favorite ? 'border-red-500/50 text-red-500 hover:text-red-600' : ''
            }`}
            onClick={() => handleToggleFavorite(book)}
          >
            <Heart
              className={`h-3.5 w-3.5 ${book.is_favorite ? 'fill-current text-red-500' : ''}`}
            />
            <span>{book.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </Button>

          {/* Edit Book Form Modal */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5"
            onClick={() => setEditing(book)}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Book</span>
          </Button>

          {/* Delete Book */}
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Column (Book Persona & Specs) + Right Column (Cockpit & Journal) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: 3D Cover, Persona, Specs & External Links (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="surface-t1 border-2 border-border p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
            {/* 3D Tactile Cover Artwork with Book Spine */}
            <div className="relative mx-auto mb-5 aspect-2/3 max-w-[260px] overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[4px_4px_0px_var(--border)] transition-transform duration-300 hover:scale-[1.02]">
              {/* Subtle Book Spine Lighting Gradient */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent sm:w-3" />

              <CoverImage
                src={book.cover_url}
                title={book.title}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Title & Author */}
            <div className="text-center">
              <h1 className="font-anton text-2xl tracking-wide text-text sm:text-3xl">
                {book.title}
              </h1>
              {book.author && (
                <p className="mt-1.5 font-hanken text-sm font-bold text-text-muted">
                  by {book.author}
                </p>
              )}

              {/* Series Continuity Pill */}
              {book.series_name && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-bold text-text-muted">
                  <Layers className="h-3 w-3 text-primary" />
                  <Link
                    href={`/library?series=true&search=${encodeURIComponent(book.series_name)}`}
                    className="hover:text-primary hover:underline"
                  >
                    {book.series_name} {book.series_order != null ? `#${book.series_order}` : ''}
                  </Link>
                </div>
              )}
            </div>

            {/* Badges & Status Chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 border-t border-border/60 pt-4">
              <Badge variant="outline" className="text-xs font-black uppercase">
                {book.type}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs font-black uppercase"
                style={{
                  color: STATUS_COLOR_VAR[book.status] || 'var(--text)',
                  borderColor: STATUS_COLOR_VAR[book.status] || 'var(--border)',
                }}
              >
                {book.status}
              </Badge>
              {book.is_ongoing && (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-xs font-bold text-amber-500"
                >
                  Ongoing Serial
                </Badge>
              )}
              {(book.reread_count ?? 0) > 0 && (
                <Badge variant="secondary" className="text-xs font-bold">
                  {book.reread_count}x Re-read
                </Badge>
              )}
            </div>

            {/* 1-Tap Star Rating */}
            <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-border/60 pt-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                Your Rating
              </span>
              <InteractiveStarRating value={book.rating} onChange={handleRatingChange} />
            </div>

            {/* External Links Hub */}
            {book.source_link && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-text-muted">
                  External Links & Resources
                </span>
                <ExternalLinksList sourceLink={book.source_link} />
              </div>
            )}
          </Card>

          {/* Book Specifications & Timeline Grid Card */}
          <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)]">
            <h3 className="mb-3 font-anton text-xs uppercase tracking-wider text-text-muted">
              Book Specifications & Details
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Format:</span>
                <span className="font-bold text-text">{book.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Total Length:</span>
                <span className="font-bold text-text">
                  {book.total_units != null ? `${book.total_units} ${unitType}` : 'Unknown'}
                </span>
              </div>
              {book.parent_total != null && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Total Volumes:</span>
                  <span className="font-bold text-text">{book.parent_total} Volumes</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-text-muted">Date Started:</span>
                <span className="font-bold text-text">{formatDisplayDate(book.date_started)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Date Finished:</span>
                <span className="font-bold text-text">{formatDisplayDate(book.date_finished)}</span>
              </div>
              {durationText && (
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-text-muted">Reading Duration:</span>
                  <span className="font-bold text-primary">{durationText}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Reading Cockpit, Synopsis, Tags & Timeline (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 1. Active Reading Cockpit */}
          <Card className="surface-t1 border-2 border-border p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                  Current Reading Progress
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-anton text-3xl text-text sm:text-4xl">
                    {formattedProgress}
                  </span>
                  <span className="font-mono text-sm font-bold text-text-muted">({pct}%)</span>
                </div>
              </div>

              {/* Status Select */}
              <div className="w-full sm:w-44">
                <label className="mb-1 block text-[10px] font-black uppercase text-text-muted">
                  Reading Status
                </label>
                <Select
                  value={book.status}
                  onValueChange={(val) => handleStatusChange(val as Book['status'])}
                >
                  <SelectTrigger className="h-9 font-bold text-xs shadow-[1.5px_1.5px_0px_var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-semibold">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <Progress value={pct} className="h-3.5 border-2 border-border" />
            </div>

            {/* Reading Velocity & Estimated Finish Banner */}
            {forecast && (
              <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs text-text">
                <Flame className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                <div>
                  <span className="font-bold">Velocity:</span> ~{forecast.dailyPace} {forecast.unit}
                  /day •{' '}
                  <span className="font-bold text-primary">
                    Estimated Finish: {forecast.formattedFinish}
                  </span>{' '}
                  ({forecast.daysRemaining} days remaining)
                </div>
              </div>
            )}

            {/* Quick Increment Steppers */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <span className="text-xs font-black uppercase tracking-wider text-text-muted">
                Quick Increment:
              </span>
              {[1, 5, 10, 25, 50].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  disabled={savingProgress}
                  className="h-8 px-3 font-mono text-xs font-black shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5 active:translate-x-[0.5px] active:translate-y-[0.5px]"
                  onClick={() => handleQuickIncrement(amt)}
                >
                  +{amt}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={savingProgress || (book.progress ?? 0) <= 0}
                className="h-8 px-2.5 font-mono text-xs font-black text-text-muted shadow-[1.5px_1.5px_0px_var(--border)]"
                onClick={() => handleQuickIncrement(-1)}
                title="Decrement 1"
              >
                -1
              </Button>
            </div>
          </Card>

          {/* 2. Editorial Synopsis / Notes with Clamped Expansion */}
          {book.notes && (
            <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-anton text-sm uppercase tracking-wider text-text">
                  Synopsis & Reader Notes
                </h3>
              </div>
              <div className="mt-3">
                <p
                  className={`whitespace-pre-wrap font-sans text-xs leading-relaxed text-text sm:text-sm ${
                    !synopsisExpanded ? 'line-clamp-4' : ''
                  }`}
                >
                  {book.notes}
                </p>
                {book.notes.length > 200 && (
                  <button
                    type="button"
                    onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-xs text-primary hover:underline"
                  >
                    <span>{synopsisExpanded ? 'Show Less' : 'Read Full Synopsis'}</span>
                    {synopsisExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* 3. Genre & Mood Tag Cloud */}
          {tagList.length > 0 && (
            <Card className="surface-t1 border-2 border-border p-4 shadow-[2px_2px_0px_var(--border)] sm:p-5">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                <Tag className="h-3.5 w-3.5" />
                <span>Genres & Subjects</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tagList.map((tag) => (
                  <Link
                    key={tag}
                    href={`/library?search=${encodeURIComponent(tag)}`}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:border-primary hover:text-primary active:translate-x-[0.5px] active:translate-y-[0.5px]"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* 4. Reading Journeys & Re-reads Ledger */}
          {journeys.length > 0 && (
            <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <h3 className="font-anton text-sm uppercase tracking-wider text-text">
                    Reading Journeys ({journeys.length})
                  </h3>
                </div>
                {book.status === 'Completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={startingReread}
                    onClick={handleStartReread}
                    className="gap-1 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Start Re-read</span>
                  </Button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {journeys.map((j) => (
                  <div
                    key={j.id}
                    className="rounded-lg border border-border/80 bg-surface/80 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-text">
                        Journey #{j.journey_index}{' '}
                        <Badge variant="outline" className="ml-1.5 text-[10px] uppercase">
                          {j.status}
                        </Badge>
                      </span>
                      {j.rating && (
                        <span className="font-mono text-amber-500">★ {j.rating.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                      <span>Started: {formatDisplayDate(j.date_started)}</span>
                      {j.date_finished && (
                        <span>• Finished: {formatDisplayDate(j.date_finished)}</span>
                      )}
                    </div>
                    {j.review && (
                      <p className="mt-2 italic text-text border-t border-border/40 pt-1.5">
                        "{j.review}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 5. Detailed Session History Logs */}
          <Card className="surface-t1 border-2 border-border p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
            <h3 className="mb-4 font-anton text-base uppercase tracking-wider text-text sm:text-lg">
              Session History & Activity Log
            </h3>
            <ReadingLog
              bookId={book.id}
              currentProgress={book.progress ?? 0}
              totalUnits={book.total_units}
              startDate={book.date_started}
              endDate={book.date_finished}
              status={book.status}
              onProgressUpdated={(newProg) => {
                setBook((prev) => (prev ? { ...prev, progress: newProg } : null));
                load(true);
              }}
            />
          </Card>
        </div>
      </div>

      {/* 1-Click Metadata Auto-Enrichment Modal */}
      <EnrichmentModal
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        initialQuery={book.title || ''}
        onApply={handleApplyEnrichment}
      />
    </div>
  );
}
