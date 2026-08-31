'use client';

import { Activity, Flame, Gauge, TrendingUp, Trophy, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import type { Book, ReadingJourney, ReadingLogEntry } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';

interface VelocityCardsProps {
  books: Book[];
  logs?: ReadingLogEntry[];
  journeys?: ReadingJourney[];
  selectedYear?: number | 'lifetime';
}

export function VelocityCards({
  books,
  logs = [],
  journeys = [],
  selectedYear = 'lifetime',
}: VelocityCardsProps) {
  const isLifetime = selectedYear === 'lifetime';
  const currentCalendarYear = new Date().getFullYear();
  const targetYearNum = isLifetime ? currentCalendarYear : selectedYear;

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let unitsWeek = 0;
    let unitsMonth = 0;
    let unitsYear = 0;
    let unitsAllTime = 0;
    const activeDaysSet = new Set<string>();

    for (const log of logs) {
      if (!log.logged_at) continue;
      const d = new Date(log.logged_at);
      if (Number.isNaN(d.getTime())) continue;

      const units = Math.max(0, (log.to_progress || 0) - (log.from_progress || 0));
      unitsAllTime += units;

      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (units > 0) activeDaysSet.add(dayKey);

      if (d >= oneWeekAgo) unitsWeek += units;
      if (d >= oneMonthAgo) unitsMonth += units;
      if (d.getFullYear() === targetYearNum) unitsYear += units;
    }

    const avgDailyWeek = (unitsWeek / 7).toFixed(1);
    const avgDailyMonth = (unitsMonth / 30).toFixed(1);

    // Active pace across books currently in progress
    const activeBooks = books.filter(
      (b) => b.status === 'Reading' && b.reading_pace && b.reading_pace > 0,
    );
    const avgWeeklyPace = activeBooks.length
      ? (
          activeBooks.reduce((sum, b) => sum + (b.reading_pace || 0), 0) / activeBooks.length
        ).toFixed(1)
      : null;

    // --- Lifetime Macro Stats ---
    // 1. Yearly completions map
    const yearCountsMap = new Map<number, number>();
    books.forEach((b) => {
      if (b.status === 'Completed') {
        const d = b.date_finished
          ? parseLocalDate(b.date_finished)
          : b.updated_at
            ? new Date(b.updated_at)
            : null;
        if (d && !Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          yearCountsMap.set(y, (yearCountsMap.get(y) || 0) + 1);
        }
      }
    });

    journeys.forEach((j) => {
      if ((j.status === 'completed' || j.date_finished) && j.date_finished) {
        const d = parseLocalDate(j.date_finished);
        if (d && !Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          yearCountsMap.set(y, (yearCountsMap.get(y) || 0) + 1);
        }
      }
    });

    const activeYears = Array.from(yearCountsMap.keys());
    const totalActiveYears = Math.max(1, activeYears.length);
    const totalCompletions = Array.from(yearCountsMap.values()).reduce((a, b) => a + b, 0);
    const booksPerYear = (totalCompletions / totalActiveYears).toFixed(1);

    // 2. Daily velocity across active reading days
    const activeDaysCount = activeDaysSet.size;
    const unitsPerActiveDay =
      activeDaysCount > 0 ? (unitsAllTime / activeDaysCount).toFixed(1) : '0';

    // 3. Peak record year
    let peakYear = currentCalendarYear;
    let peakCount = 0;
    for (const [y, count] of yearCountsMap.entries()) {
      if (count > peakCount) {
        peakCount = count;
        peakYear = y;
      }
    }

    return {
      unitsWeek,
      avgDailyWeek,
      unitsMonth,
      avgDailyMonth,
      unitsYear,
      unitsAllTime,
      avgWeeklyPace,
      booksPerYear,
      totalActiveYears,
      unitsPerActiveDay,
      activeDaysCount,
      peakYear,
      peakCount,
    };
  }, [books, logs, journeys, targetYearNum, currentCalendarYear]);

  if (isLifetime) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CARD 1: BOOKS / YEAR */}
        <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
              BOOKS / YEAR
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
              ~{stats.booksPerYear}
            </span>
            <span className="font-mono text-xs font-bold text-text-muted">BKS / YR</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            Across {stats.totalActiveYears} active reading years
          </p>
        </Card>

        {/* CARD 2: DAILY VELOCITY */}
        <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
              DAILY VELOCITY
            </span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text">
              ~{stats.unitsPerActiveDay}
            </span>
            <span className="font-mono text-xs font-bold text-text-muted">UNITS / DAY</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            Across {stats.activeDaysCount} active reading days
          </p>
        </Card>

        {/* CARD 3: LIFETIME VOLUME */}
        <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
              LIFETIME VOLUME
            </span>
            <Activity className="h-4 w-4 text-accent-color" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
            <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
              {stats.unitsAllTime.toLocaleString()}
            </span>
            <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">Total units read all-time</p>
        </Card>

        {/* CARD 4: PEAK RECORD YEAR */}
        <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
              PEAK RECORD YEAR
            </span>
            <Trophy className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
            <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
              {stats.peakYear}
            </span>
            <span className="font-mono text-xs font-bold text-text-muted">
              ({stats.peakCount} BKS)
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">All-time highest year record</p>
        </Card>
      </div>
    );
  }

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
        <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
            {stats.unitsWeek.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted font-tabular">
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
        <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
            {stats.unitsMonth.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted font-tabular">
          ~{stats.avgDailyMonth} units / day
        </p>
      </Card>

      {/* THIS YEAR */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[2.5px_2.5px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {targetYearNum} ANNUAL VOLUME
          </span>
          <TrendingUp className="h-4 w-4 text-accent-color" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
            {stats.unitsYear.toLocaleString()}
          </span>
          <span className="font-mono text-xs font-bold text-text-muted">UNITS</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-muted font-tabular">
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
        <div className="mt-2 flex items-baseline gap-1.5 font-tabular">
          <span className="font-anton text-2xl sm:text-3xl tracking-wide text-text font-tabular">
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
