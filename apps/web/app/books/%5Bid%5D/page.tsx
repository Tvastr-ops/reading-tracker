'use client';

import { ArrowLeft, BookOpen, Edit3, ExternalLink, Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CoverImage from '@/components/CoverImage';
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
  const [_journeys, setJourneys] = useState<ReadingJourney[]>([]);

  // Find book from cached library or fetch if opened directly
  useEffect(() => {
    if (!bookId) return;

    const found = books.find((b) => b.id === bookId);
    if (found) {
      setBook(found);
      setLoading(false);
    } else if (!libraryLoading) {
      // Fetch directly if not in memory
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
        <Link href="/" className="mt-4 inline-block">
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
  const _unitType = book.unit_type || 'pages';

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

  const handleDelete = async () => {
    if (!book) return;
    deleteBook(book);
    router.push('/');
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Library</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] ${
              book.is_favorite ? 'text-red-500 hover:text-red-600' : ''
            }`}
            onClick={() => handleToggleFavorite(book)}
          >
            <Heart className={`h-3.5 w-3.5 ${book.is_favorite ? 'fill-current' : ''}`} />
            <span>{book.is_favorite ? 'Favorited' : 'Favorite'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
            onClick={() => setEditing(book)}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Book</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Book Profile + Right Reading Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Book Artwork & Core Info (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-5">
            {/* High Res Cover */}
            <div className="relative mx-auto mb-4 aspect-2/3 max-w-[240px] overflow-hidden rounded-lg border-2 border-border bg-surface shadow-[2px_2px_0px_var(--border)]">
              <CoverImage
                src={book.cover_url}
                title={book.title}
                alt={book.title}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Title & Author */}
            <div className="text-center">
              <h1 className="font-anton text-xl tracking-wide text-text sm:text-2xl">
                {book.title}
              </h1>
              {book.author && (
                <p className="mt-1 font-hanken text-sm font-bold text-text-muted">
                  by {book.author}
                </p>
              )}
              {book.series_name && (
                <p className="mt-1 text-xs font-semibold text-text-muted italic">
                  Series: {book.series_name}{' '}
                  {book.series_order != null ? `#${book.series_order}` : ''}
                </p>
              )}
            </div>

            {/* Format & Status Chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 border-t border-border/60 pt-3">
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
                  Ongoing
                </Badge>
              )}
            </div>

            {/* Rating */}
            <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-border/60 pt-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                Your Rating
              </span>
              <InteractiveStarRating value={book.rating} onChange={handleRatingChange} />
            </div>

            {/* Tags & External Link */}
            {book.genre_tags && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-text-muted">
                  Tags & Genres
                </span>
                <div className="flex flex-wrap gap-1">
                  {book.genre_tags.split(',').map((t) => (
                    <Badge key={t.trim()} variant="secondary" className="text-[10px]">
                      #{t.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {book.source_link && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <a
                  href={book.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Source Link</span>
                </a>
              </div>
            )}
          </Card>

          {/* Reading Dates & Duration Card */}
          <Card className="surface-t1 border-2 border-border p-4 shadow-[2px_2px_0px_var(--border)]">
            <h3 className="font-anton text-xs uppercase tracking-wider text-text-muted">
              Reading Timeline
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Started:</span>
                <span className="font-bold text-text">{formatDisplayDate(book.date_started)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Finished:</span>
                <span className="font-bold text-text">{formatDisplayDate(book.date_finished)}</span>
              </div>
              {durationText && (
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-text-muted">Duration:</span>
                  <span className="font-bold text-primary">{durationText}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Progress Stepper, Sessions & Notes (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* 1. Interactive Progress Controller Card */}
          <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                  Current Progress
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-anton text-3xl text-text sm:text-4xl">
                    {formattedProgress}
                  </span>
                  <span className="font-mono text-sm font-bold text-text-muted">({pct}%)</span>
                </div>
              </div>

              {/* Status Select */}
              <div className="w-44">
                <label className="mb-1 block text-[10px] font-black uppercase text-text-muted">
                  Status
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
              <Progress value={pct} className="h-3 border border-border" />
            </div>

            {/* Quick Increment Steppers */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <span className="text-xs font-black uppercase tracking-wider text-text-muted">
                Quick Log:
              </span>
              {[1, 5, 10, 25].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  disabled={savingProgress}
                  className="h-8 px-3 font-mono text-xs font-black shadow-[1.5px_1.5px_0px_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px]"
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

          {/* 2. Personal Notes Card */}
          {book.notes && (
            <Card className="surface-t1 border-2 border-border p-4 shadow-[2px_2px_0px_var(--border)] sm:p-5">
              <h3 className="mb-2 font-anton text-sm uppercase tracking-wider text-text">
                Reader Notes
              </h3>
              <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-text sm:text-sm">
                {book.notes}
              </p>
            </Card>
          )}

          {/* 3. Detailed Reading Logs & Sessions */}
          <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-6">
            <h3 className="mb-4 font-anton text-base uppercase tracking-wider text-text sm:text-lg">
              Reading Session Logs & History
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
    </div>
  );
}
