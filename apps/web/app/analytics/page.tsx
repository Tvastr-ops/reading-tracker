'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatsSummary from '@/components/StatsSummary';
import { Button } from '@/components/ui/button';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import type { Book, ReadingJourney, ReadingLogEntry } from '@/lib/types';

export default function AnalyticsPage() {
  const { books, loading } = useLibraryData();
  const { setStatusFilter } = useLibraryFiltersContext();
  const [logs, setLogs] = useState<ReadingLogEntry[]>([]);
  const [journeys, setJourneys] = useState<ReadingJourney[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/logs?limit=5000')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.entries) {
          setLogs(d.entries);
        }
      })
      .catch(() => {});

    fetch('/api/journeys')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.journeys) {
          setJourneys(d.journeys);
        }
      })
      .catch(() => {});
  }, []);

  const handleStatusSelect = (status: string) => {
    setStatusFilter(status as Book['status'] | 'All');
    router.push('/library');
  };

  if (loading) {
    return (
      <div className="space-y-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-surface/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-surface/60" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-surface/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Page Title Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/library"
              className="text-text-muted transition-colors hover:text-text md:hidden"
              aria-label="Back to Library"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-anton text-2xl tracking-wider text-text sm:text-3xl">
              READING ANALYTICS
            </h1>
          </div>
          <p className="font-hanken text-xs text-text-muted sm:text-sm">
            Yearly goals, velocity cards, daily streak heatmap, and library distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/library">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back to Library</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Stats Summary with Logs & Journeys */}
      <StatsSummary
        books={books}
        logs={logs}
        journeys={journeys}
        onStatusSelect={handleStatusSelect}
      />
    </div>
  );
}
