'use client';

import { Activity, Gauge, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import type { Book, ReadingLogEntry } from '@/lib/types';

interface VelocityCardsProps {
  books: Book[];
  logs: ReadingLogEntry[];
}

export function VelocityCards({ books, logs }: VelocityCardsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let unitsWeek = 0;
    let unitsMonth = 0;
    let unitsYear = 0;
    let unitsAllTime = 0;

    for (const log of logs) {
      if (!log.logged_at) continue;
      const d = new Date(log.logged_at);
      const units = Math.max(0, (log.to_progress || 0) - (log.from_progress || 0));

      unitsAllTime += units;
      if (d >= oneWeekAgo) unitsWeek += units;
      if (d >= oneMonthAgo) unitsMonth += units;
      if (d >= startOfYear) unitsYear += units;
    }

    const avgDailyWeek = (unitsWeek / 7).toFixed(1);
    const avgDailyMonth = (unitsMonth / 30).toFixed(1);

    // Active pace across books
    const activeBooks = books.filter(
      (b) => b.status === 'Reading' && b.reading_pace && b.reading_pace > 0,
    );
    const avgWeeklyPace = activeBooks.length
      ? (
          activeBooks.reduce((sum, b) => sum + (b.reading_pace || 0), 0) / activeBooks.length
        ).toFixed(1)
      : null;

    return {
      unitsWeek,
      avgDailyWeek,
      unitsMonth,
      avgDailyMonth,
      unitsYear,
      unitsAllTime,
      avgWeeklyPace,
    };
  }, [books, logs]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* THIS WEEK */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
            THIS WEEK (7D)
          </span>
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
            {stats.unitsWeek.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          ~{stats.avgDailyWeek} units / day
        </p>
      </Card>

      {/* THIS MONTH */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
            THIS MONTH (30D)
          </span>
          <Activity className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
            {stats.unitsMonth.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          ~{stats.avgDailyMonth} units / day
        </p>
      </Card>

      {/* THIS YEAR */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {new Date().getFullYear()} ANNUAL VOLUME
          </span>
          <TrendingUp className="h-4 w-4 text-accent-color" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
            {stats.unitsYear.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          Lifetime: {stats.unitsAllTime.toLocaleString()} units
        </p>
      </Card>

      {/* ACTIVE SPEED / PACE */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
            ACTIVE READING VELOCITY
          </span>
          <Gauge className="h-4 w-4 text-sky-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
            {stats.avgWeeklyPace ? `~${stats.avgWeeklyPace}` : '—'}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">
            {stats.avgWeeklyPace ? '/ WK' : 'NO DATA'}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          Across currently in-progress books
        </p>
      </Card>
    </div>
  );
}
