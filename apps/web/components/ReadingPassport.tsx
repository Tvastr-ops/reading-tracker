'use client';

import { Award, CheckCircle2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import type { Book } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';

interface ReadingPassportProps {
  books: Book[];
}

export function ReadingPassport({ books }: ReadingPassportProps) {
  const passport = useMemo(() => {
    const total = books.length;
    const completed = books.filter((b) => b.status === 'Completed').length;
    const dropped = books.filter((b) => b.status === 'Dropped').length;
    const onHold = books.filter((b) => b.status === 'On Hold').length;

    // Library health / completion rate
    const evaluatedTotal = completed + dropped + onHold;
    const completionRate =
      evaluatedTotal > 0 ? Math.round((completed / evaluatedTotal) * 100) : 100;

    // Total re-reads
    const totalRereads = books.reduce((sum, b) => sum + (Number(b.reread_count) || 0), 0);

    // Average time to finish
    const completedWithDates = books.filter(
      (b) => b.status === 'Completed' && b.date_started && b.date_finished,
    );
    let totalDays = 0;
    for (const b of completedWithDates) {
      const s = parseLocalDate(b.date_started!);
      const f = parseLocalDate(b.date_finished!);
      if (s && f && f >= s) {
        const days = Math.max(1, Math.round((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        totalDays += days;
      }
    }
    const avgDaysToFinish = completedWithDates.length
      ? Math.round(totalDays / completedWithDates.length)
      : null;

    // Most read format
    const formatCounts: Record<string, number> = {};
    for (const b of books.filter((b) => b.status === 'Completed')) {
      const fmt = b.type || 'Novel';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }
    const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      completionRate,
      totalRereads,
      avgDaysToFinish,
      topFormat,
      completedCount: completed,
      totalCount: total,
    };
  }, [books]);

  return (
    <Card className="surface-t1 border-2 border-border p-4 sm:p-5 shadow-[3px_3px_0px_var(--border)]">
      <div className="flex items-center gap-2 border-b-2 border-border/30 pb-3">
        <Award className="h-5 w-5 text-accent-color" />
        <h3 className="font-anton text-lg sm:text-xl tracking-wide text-text">
          READING PASSPORT & MILESTONES
        </h3>
      </div>

      <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* COMPLETION RATE */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>COMPLETION RATE</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.completionRate}%
          </div>
          <p className="font-mono text-[10px] text-text-muted">
            {passport.completedCount} of {passport.totalCount} finished
          </p>
        </div>

        {/* RE-READS */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <RotateCcw className="h-3.5 w-3.5 text-sky-500" />
            <span>TOTAL RE-READS</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.totalRereads}
          </div>
          <p className="font-mono text-[10px] text-text-muted">Multi-read journeys logged</p>
        </div>

        {/* AVG COMPLETION TIME */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>AVG TIME TO FINISH</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.avgDaysToFinish != null ? `${passport.avgDaysToFinish}d` : '—'}
          </div>
          <p className="font-mono text-[10px] text-text-muted">From start to finish date</p>
        </div>

        {/* PRIMARY FORMAT */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>TOP FORMAT</span>
          </div>
          <div className="mt-2 font-anton text-xl sm:text-2xl text-text truncate">
            {passport.topFormat}
          </div>
          <p className="font-mono text-[10px] text-text-muted">Most completed category</p>
        </div>
      </div>
    </Card>
  );
}
