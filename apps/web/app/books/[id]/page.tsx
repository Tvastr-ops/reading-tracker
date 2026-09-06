'use client';

import { ArrowLeft, BookOpen, Edit3, Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import BookHeroCard from '@/components/detail/BookHeroCard';
import BookJourneysLedger from '@/components/detail/BookJourneysLedger';
import BookPersonalNotesCard from '@/components/detail/BookPersonalNotesCard';
import BookReadingCockpit from '@/components/detail/BookReadingCockpit';
import BookSeriesContinuityCard from '@/components/detail/BookSeriesContinuityCard';
import BookShelvesAndTagsCard from '@/components/detail/BookShelvesAndTagsCard';
import BookSpecsCard from '@/components/detail/BookSpecsCard';
import BookSynopsisCard from '@/components/detail/BookSynopsisCard';
import ReadingLog from '@/components/ReadingLog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';
import type { Book, ReadingJourney } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

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

  const handleDirectProgressSave = async (newProgress: number) => {
    if (!book) return;
    const max = book.total_units ?? 999999;
    const nextVal = Math.min(max, Math.max(0, newProgress));

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
      toast.success(`Progress set to ${nextVal}`);
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

  const handleSaveNotes = async (updatedNotes: string) => {
    if (!book) return;
    const updated: Book = { ...book, notes: updatedNotes || null };
    setBook(updated);
    await handleSaveInspectorBook(updated);
    toast.success('Notes saved successfully');
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: 3D Artwork, Badges, Specs, Shelves & Tags (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <BookHeroCard book={book} onRatingChange={handleRatingChange} />
          <BookSpecsCard book={book} />
          <BookShelvesAndTagsCard book={book} />
        </div>

        {/* Right Column: Reading Cockpit, Synopsis, Series, Notes & Activity Log (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <BookReadingCockpit
            book={book}
            savingProgress={savingProgress}
            forecast={forecast}
            onQuickIncrement={handleQuickIncrement}
            onDirectProgressSave={handleDirectProgressSave}
            onStatusChange={handleStatusChange}
          />

          {/* Plot Synopsis / Blurb (uses description or notes fallback) */}
          <BookSynopsisCard synopsis={book.description || book.notes} />

          {/* Series Continuity / Franchise Hub */}
          <BookSeriesContinuityCard currentBook={book} allBooks={books} />

          {/* Reader's Personal Notes & Thoughts */}
          <BookPersonalNotesCard notes={book.notes} onSaveNotes={handleSaveNotes} />

          {/* Re-read Journeys Ledger */}
          <BookJourneysLedger
            journeys={journeys}
            isCompleted={book.status === 'Completed'}
            startingReread={startingReread}
            onStartReread={handleStartReread}
          />

          {/* Detailed Session History Logs */}
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
    </div>
  );
}
