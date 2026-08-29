'use client';

import { Award, CheckCircle2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import type { Book, ReadingJourney } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';

interface ReadingPassportProps {
  books: Book[];
  journeys?: ReadingJourney[];
  selectedYear?: number | 'lifetime';
  yearlyGoal?: number;
}

export function ReadingPassport({
  books,
  journeys = [],
  selectedYear = 'lifetime',
  yearlyGoal = 0,
}: ReadingPassportProps) {
  const isLifetime = selectedYear === 'lifetime';
  const targetYearNum = isLifetime ? null : selectedYear;

  const passport = useMemo(() => {
    const totalBooks = books.length;
    const allCompleted = books.filter((b) => b.status === 'Completed');

    // Filter completed books for selected timeframe
    const scopedCompleted = isLifetime
      ? allCompleted
      : allCompleted.filter((b) => {
          const dt = b.date_finished ? parseLocalDate(b.date_finished) : null;
          if (dt) return dt.getFullYear() === targetYearNum;
          if (b.updated_at) return new Date(b.updated_at).getFullYear() === targetYearNum;
          return false;
        });

    // 1. Completion Rate (Lifetime) vs Projected Year-End (Yearly)
    let card1Title = 'LIBRARY COMPLETION';
    let card1Value = `${totalBooks > 0 ? Math.round((allCompleted.length / totalBooks) * 100) : 0}%`;
    let card1Sub = `${allCompleted.length} of ${totalBooks} finished`;

    if (!isLifetime) {
      const currentYear = new Date().getFullYear();
      const elapsedMonths = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
      const projectedTotal =
        elapsedMonths > 0
          ? Math.round((scopedCompleted.length / elapsedMonths) * 12)
          : scopedCompleted.length;

      card1Title = 'PROJECTED YEAR-END';
      card1Value = `~${projectedTotal} bks`;
      card1Sub = `Forecast based on current pace`;
    }

    // 2. Re-reads
    let totalRereads = 0;
    if (isLifetime) {
      totalRereads = books.reduce((sum, b) => sum + (Number(b.reread_count) || 0), 0);
    } else {
      // Re-read journeys completed in this specific year
      const yearJourneys = journeys.filter((j) => {
        if (j.status !== 'completed' || !j.date_finished) return false;
        const d = parseLocalDate(j.date_finished);
        return d ? d.getFullYear() === targetYearNum : false;
      });
      totalRereads = yearJourneys.length;
    }
    const rereadsSub = isLifetime
      ? 'Lifetime re-read journeys'
      : `Re-reads finished in ${selectedYear}`;

    // 3. Average time to finish
    const completedWithDates = scopedCompleted.filter((b) => b.date_started && b.date_finished);
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
    const avgTimeSub = isLifetime
      ? 'Lifetime finish average'
      : `For works finished in ${selectedYear}`;

    // 4. Most read format
    const formatCounts: Record<string, number> = {};
    for (const b of scopedCompleted) {
      const fmt = b.type || 'Novel';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }
    const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const topFormatSub = isLifetime ? 'All-time top category' : `Top category in ${selectedYear}`;

    return {
      card1Title,
      card1Value,
      card1Sub,
      totalRereads,
      rereadsSub,
      avgDaysToFinish,
      avgTimeSub,
      topFormat,
      topFormatSub,
    };
  }, [books, journeys, isLifetime, targetYearNum, selectedYear, yearlyGoal]);

  return (
    <Card className="surface-t1 border-2 border-border p-4 sm:p-5 shadow-[3px_3px_0px_var(--border)]">
      <div className="flex items-center gap-2 border-b-2 border-border/30 pb-3">
        <Award className="h-5 w-5 text-accent-color" />
        <h3 className="font-anton text-lg sm:text-xl tracking-wide text-text">
          READING PASSPORT & MILESTONES
        </h3>
      </div>

      <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. COMPLETION / GOAL RATE */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{passport.card1Title}</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.card1Value}
          </div>
          <p className="font-mono text-[10px] text-text-muted">{passport.card1Sub}</p>
        </div>

        {/* 2. RE-READS */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <RotateCcw className="h-3.5 w-3.5 text-sky-500" />
            <span>TOTAL RE-READS</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.totalRereads}
          </div>
          <p className="font-mono text-[10px] text-text-muted">{passport.rereadsSub}</p>
        </div>

        {/* 3. AVG COMPLETION TIME */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>AVG TIME TO FINISH</span>
          </div>
          <div className="mt-2 font-anton text-2xl sm:text-3xl text-text">
            {passport.avgDaysToFinish != null ? `${passport.avgDaysToFinish}d` : '—'}
          </div>
          <p className="font-mono text-[10px] text-text-muted">{passport.avgTimeSub}</p>
        </div>

        {/* 4. PRIMARY FORMAT */}
        <div className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-text-muted uppercase">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>TOP FORMAT</span>
          </div>
          <div className="mt-2 font-anton text-xl sm:text-2xl text-text truncate">
            {passport.topFormat}
          </div>
          <p className="font-mono text-[10px] text-text-muted">{passport.topFormatSub}</p>
        </div>
      </div>
    </Card>
  );
}
