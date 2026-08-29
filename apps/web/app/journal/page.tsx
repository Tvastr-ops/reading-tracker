'use client';

import { ChevronLeft, History } from 'lucide-react';
import Link from 'next/link';
import { TimelineView } from '@/components/TimelineView';
import { Button } from '@/components/ui/button';

export default function JournalPage() {
  return (
    <div className="space-y-6">
      {/* Journal Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-text-muted transition-colors hover:text-text md:hidden"
              aria-label="Back to Library"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-anton text-2xl tracking-wider text-text sm:text-3xl">
              READING JOURNAL
            </h1>
          </div>
          <p className="font-hanken text-xs text-text-muted sm:text-sm">
            Daily activity logs, chapter increments, reading milestones, and session notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/">
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

      {/* Timeline Stream */}
      <TimelineView />
    </div>
  );
}
