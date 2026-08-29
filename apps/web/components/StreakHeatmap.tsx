'use client';

import { Calendar, Flame, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReadingLogEntry } from '@/lib/types';

interface StreakHeatmapProps {
  logs: ReadingLogEntry[];
  selectedYear?: number | 'lifetime';
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function StreakHeatmap({ logs, selectedYear = 'lifetime' }: StreakHeatmapProps) {
  const isLifetime = selectedYear === 'lifetime';
  const currentYear = new Date().getFullYear();
  const targetYear = typeof selectedYear === 'number' ? selectedYear : currentYear;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [selectedYear]);

  const {
    currentStreak,
    longestStreak,
    yearActiveDays,
    totalActiveDays,
    weeks,
    maxDailyUnits,
    subtitle,
  } = useMemo(() => {
    const dailyActivity = new Map<string, { count: number; units: number }>();

    for (const log of logs) {
      if (!log.logged_at) continue;
      const d = new Date(log.logged_at);
      if (Number.isNaN(d.getTime())) continue;
      const dateStr = formatLocalDate(d);
      const units = Math.max(0, (log.to_progress || 0) - (log.from_progress || 0));
      const curr = dailyActivity.get(dateStr) || { count: 0, units: 0 };
      dailyActivity.set(dateStr, {
        count: curr.count + 1,
        units: curr.units + units,
      });
    }

    const totalActiveDays = dailyActivity.size;

    let yearActiveDays = 0;
    for (const dateStr of dailyActivity.keys()) {
      const [y] = dateStr.split('-').map(Number);
      if (isLifetime || y === targetYear) {
        yearActiveDays++;
      }
    }

    // Calculate streaks matching Flutter DatabaseHelper
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = formatLocalDate(today);
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = formatLocalDate(checkDate);

    const hasToday = dailyActivity.has(todayStr);
    const hasYesterday = dailyActivity.has(yesterdayStr);

    if (hasToday || hasYesterday) {
      const iterDate = new Date(hasToday ? today : checkDate);
      while (true) {
        const iterStr = formatLocalDate(iterDate);
        if (dailyActivity.has(iterStr)) {
          currentStreak++;
          iterDate.setDate(iterDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak over all sorted dates
    const sortedDates = Array.from(dailyActivity.keys()).sort();
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const [y, m, day] = dateStr.split('-').map(Number);
      const d = new Date(y, m - 1, day);
      d.setHours(0, 0, 0, 0);

      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = d;
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    // Date range setup
    let startDate: Date;
    let numWeeks = 52;

    if (isLifetime) {
      // 52 weeks rolling from today backwards, ending on Saturday
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
      const daysToSaturday = 6 - dayOfWeek;
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + daysToSaturday);
      endDate.setHours(0, 0, 0, 0);

      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 52 * 7 + 1);
      numWeeks = 52;
    } else {
      // Full calendar year for targetYear (aligned Sun -> Sat)
      const jan1 = new Date(targetYear, 0, 1);
      jan1.setHours(0, 0, 0, 0);
      const dec31 = new Date(targetYear, 11, 31);
      dec31.setHours(0, 0, 0, 0);

      const jan1Day = jan1.getDay(); // 0 = Sun
      startDate = new Date(targetYear, 0, 1 - jan1Day);
      startDate.setHours(0, 0, 0, 0);

      const dec31Day = dec31.getDay();
      const endDate = new Date(targetYear, 11, 31 + (6 - dec31Day));
      endDate.setHours(0, 0, 0, 0);

      const totalDays =
        Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      numWeeks = Math.ceil(totalDays / 7);
    }

    const weeksList: {
      weekIndex: number;
      monthLabel?: string;
      days: {
        date: Date;
        dateStr: string;
        count: number;
        units: number;
        isFuture: boolean;
        isOutsideYear: boolean;
      }[];
    }[] = [];

    let maxUnits = 1;
    const curr = new Date(startDate);
    let lastMonth = -1;
    let lastMonthWeek = -5;

    for (let w = 0; w < numWeeks; w++) {
      const days = [];
      let weekMonthLabel: string | undefined;

      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(curr);
        const dateStr = formatLocalDate(dateObj);
        const isFuture = dateObj > today;
        const isOutsideYear = !isLifetime && dateObj.getFullYear() !== targetYear;
        const act = dailyActivity.get(dateStr) || { count: 0, units: 0 };

        if (!isFuture && !isOutsideYear && act.units > maxUnits) {
          maxUnits = act.units;
        }

        // Detect month transitions within valid year
        const m = dateObj.getMonth();
        if (!isOutsideYear) {
          if (w === 0 && lastMonth === -1) {
            // First week in year always starts with Jan (or first active month in rolling view)
            weekMonthLabel = dateObj.toLocaleDateString(undefined, { month: 'short' });
            lastMonth = m;
            lastMonthWeek = w;
          } else if (m !== lastMonth && w - lastMonthWeek >= 2) {
            weekMonthLabel = dateObj.toLocaleDateString(undefined, { month: 'short' });
            lastMonth = m;
            lastMonthWeek = w;
          }
        }

        days.push({
          date: dateObj,
          dateStr,
          count: isFuture || isOutsideYear ? 0 : act.count,
          units: isFuture || isOutsideYear ? 0 : act.units,
          isFuture,
          isOutsideYear,
        });

        curr.setDate(curr.getDate() + 1);
      }

      weeksList.push({
        weekIndex: w,
        monthLabel: weekMonthLabel,
        days,
      });
    }

    const subtitle = isLifetime
      ? 'Daily consistency over the last 52 weeks (rolling 365 days).'
      : targetYear === currentYear
        ? `Daily consistency throughout ${targetYear}.`
        : `Historical reading activity across ${targetYear}.`;

    return {
      currentStreak,
      longestStreak,
      yearActiveDays,
      totalActiveDays,
      weeks: weeksList,
      maxDailyUnits: maxUnits,
      subtitle,
    };
  }, [logs, isLifetime, targetYear, currentYear]);

  function getCellColor(
    units: number,
    count: number,
    isFuture: boolean,
    isOutsideYear: boolean,
  ): string {
    if (isOutsideYear) return 'bg-transparent border-transparent';
    if (isFuture) return 'bg-surface/20 border border-border/20 dark:border-white/5';
    if (count === 0 || units === 0) return 'bg-surface/50 border-border/40';

    const ratio = units / maxDailyUnits;
    if (ratio < 0.25) return 'bg-accent-bg/40 border-accent-color/60';
    if (ratio < 0.5) return 'bg-accent-bg/70 border-accent-color/80';
    if (ratio < 0.75) return 'bg-accent-color text-accent-text border-border';
    return 'bg-accent-color text-accent-text border-black dark:border-white shadow-[1px_1px_0px_var(--border)]';
  }

  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Card className="surface-t1 border-2 border-border p-4 sm:p-5 shadow-[3px_3px_0px_var(--border)]">
      {/* Header & Streak Tiles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b-2 border-border/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent-color" />
            <h3 className="font-anton text-lg sm:text-xl tracking-wide text-text uppercase">
              READING ACTIVITY & STREAKS
            </h3>
          </div>
          <p className="font-hanken text-xs text-text-muted mt-0.5">{subtitle}</p>
        </div>

        {/* Streak Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Current Streak */}
          <div className="flex items-center gap-2 border-2 border-border bg-surface px-3 py-1.5 shadow-[2px_2px_0px_var(--border)]">
            <Flame
              className={`h-4 w-4 ${
                currentStreak > 0
                  ? 'text-amber-500 fill-amber-500 animate-pulse'
                  : 'text-text-muted'
              }`}
            />
            <div>
              <span className="block font-anton text-sm sm:text-base leading-none text-text">
                {currentStreak} {currentStreak === 1 ? 'DAY' : 'DAYS'}
              </span>
              <span className="block font-mono text-[9px] font-bold text-text-muted uppercase">
                CURRENT STREAK
              </span>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center gap-2 border-2 border-border bg-surface px-3 py-1.5 shadow-[2px_2px_0px_var(--border)]">
            <Trophy className="h-4 w-4 text-accent-color" />
            <div>
              <span className="block font-anton text-sm sm:text-base leading-none text-text">
                {longestStreak} {longestStreak === 1 ? 'DAY' : 'DAYS'}
              </span>
              <span className="block font-mono text-[9px] font-bold text-text-muted uppercase">
                BEST STREAK
              </span>
            </div>
          </div>

          {/* Active Days */}
          <div className="flex items-center gap-2 border-2 border-border bg-surface px-3 py-1.5 shadow-[2px_2px_0px_var(--border)]">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <div>
              <span className="block font-anton text-sm sm:text-base leading-none text-text">
                {isLifetime ? totalActiveDays : yearActiveDays} DAYS
              </span>
              <span className="block font-mono text-[9px] font-bold text-text-muted uppercase">
                {isLifetime ? 'ACTIVE TOTAL' : `ACTIVE IN ${targetYear}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div ref={scrollContainerRef} className="pt-4 overflow-x-auto scroll-smooth">
        <TooltipProvider delayDuration={100}>
          <div className="min-w-[780px] sm:min-w-[840px]">
            {/* Matrix Grid with Column-Anchored Month Labels */}
            <div className="flex">
              {/* Weekday labels */}
              <div className="flex flex-col justify-between pr-2 font-mono text-[9px] font-bold text-text-muted select-none">
                {/* Spacer for month labels row */}
                <span className="h-4 leading-4" />
                {weekdayLabels.map((lbl, idx) => (
                  <span key={idx} className="h-3 sm:h-3.5 leading-3 sm:leading-3.5">
                    {idx % 2 === 1 ? lbl : ''}
                  </span>
                ))}
              </div>

              {/* Day Cells (Columns = Weeks, Rows = Days) */}
              <div className="flex gap-1">
                {weeks.map((w) => (
                  <div key={w.weekIndex} className="flex flex-col gap-1">
                    {/* Month Label locked directly to this column */}
                    <div className="h-4 font-mono text-[10px] font-bold text-text-muted select-none overflow-visible whitespace-nowrap">
                      {w.monthLabel || ''}
                    </div>

                    {w.days.map((day) => (
                      <Tooltip key={day.dateStr}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 border rounded-xs transition-transform hover:scale-125 cursor-pointer ${getCellColor(
                              day.units,
                              day.count,
                              day.isFuture,
                              day.isOutsideYear,
                            )}`}
                          />
                        </TooltipTrigger>
                        {!day.isFuture && !day.isOutsideYear && (
                          <TooltipContent className="border-2 border-border bg-card-bg font-mono text-xs shadow-[2px_2px_0px_var(--border)]">
                            <p className="font-bold text-text">
                              {day.date.toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {day.count === 0
                                ? 'No reading logged'
                                : `${day.count} ${day.count === 1 ? 'session' : 'sessions'} (${day.units} units)`}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-text-muted select-none">
              <span>Less</span>
              <div className="h-3 w-3 border border-border/40 bg-surface/50 rounded-xs" />
              <div className="h-3 w-3 border border-accent-color/60 bg-accent-bg/40 rounded-xs" />
              <div className="h-3 w-3 border border-accent-color/80 bg-accent-bg/70 rounded-xs" />
              <div className="h-3 w-3 border border-border bg-accent-color text-accent-text rounded-xs" />
              <span>More</span>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </Card>
  );
}
