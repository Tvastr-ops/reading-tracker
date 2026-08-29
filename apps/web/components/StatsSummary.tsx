'use client';

import {
  Award,
  Calendar,
  CheckCircle2,
  Edit2,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Book, ReadingJourney, ReadingLogEntry } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';
import { DistributionTabs } from './DistributionTabs';
import { ReadingPassport } from './ReadingPassport';
import { StreakHeatmap } from './StreakHeatmap';
import { VelocityCards } from './VelocityCards';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type GoalMetric = 'books' | 'pages' | 'chapters' | 'volumes';

export default function StatsSummary({
  books,
  logs = [],
  journeys = [],
  onStatusSelect: _onStatusSelect,
}: {
  books: Book[];
  logs?: ReadingLogEntry[];
  journeys?: ReadingJourney[];
  onStatusSelect?: (status: string) => void;
}) {
  const thisYear = new Date().getFullYear();

  // Multi-unit & Multi-year Goal states
  const [selectedYear, setSelectedYear] = useState<number | 'lifetime'>(thisYear);
  const [selectedMetric, setSelectedMetric] = useState<GoalMetric>('books');
  const [goalsMap, setGoalsMap] = useState<Record<string, number>>({});
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalInputVal, setGoalInputVal] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Available Years - scan books, journeys, logs, and saved goal keys
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([thisYear]);

    // 1. Scan books
    for (const b of books) {
      if (b.date_finished) {
        const d = parseLocalDate(b.date_finished);
        if (d) yearsSet.add(d.getFullYear());
      }
      if (b.date_started) {
        const d = parseLocalDate(b.date_started);
        if (d) yearsSet.add(d.getFullYear());
      }
      if (b.updated_at) {
        const d = new Date(b.updated_at);
        if (!Number.isNaN(d.getTime())) yearsSet.add(d.getFullYear());
      }
    }

    // 2. Scan journeys
    for (const j of journeys) {
      if (j.date_finished) {
        const d = parseLocalDate(j.date_finished);
        if (d) yearsSet.add(d.getFullYear());
      }
      if (j.date_started) {
        const d = parseLocalDate(j.date_started);
        if (d) yearsSet.add(d.getFullYear());
      }
    }

    // 3. Scan logs
    for (const log of logs) {
      if (log.logged_at) {
        const d = new Date(log.logged_at);
        if (!Number.isNaN(d.getTime())) yearsSet.add(d.getFullYear());
      }
    }

    // 4. Scan configured goals
    for (const key of Object.keys(goalsMap)) {
      const yearPart = parseInt(key.split('_')[0], 10);
      if (Number.isFinite(yearPart) && yearPart >= 1947 && yearPart <= thisYear + 1) {
        yearsSet.add(yearPart);
      }
    }

    return Array.from(yearsSet)
      .filter((y) => y >= 1947 && y <= thisYear + 1)
      .sort((a, b) => b - a);
  }, [books, journeys, logs, goalsMap, thisYear]);

  // Load cloud synced goals on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          const map: Record<string, number> = d.goals || {};
          if (d.yearlyGoal != null && !map[`${thisYear}_books`]) {
            map[`${thisYear}_books`] = d.yearlyGoal;
          }
          setGoalsMap(map);
        }
      })
      .catch(() => {});
  }, [thisYear]);

  // Save Goal Handler
  async function handleSaveGoal() {
    if (selectedYear === 'lifetime') return;
    const target = parseInt(goalInputVal, 10);
    if (!Number.isFinite(target) || target < 0) return;

    setSavingGoal(true);
    const key = `${selectedYear}_${selectedMetric}`;
    const updatedMap = { ...goalsMap, [key]: target };

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: selectedYear,
        metric: selectedMetric,
        target,
        goals: updatedMap,
      }),
    });

    setSavingGoal(false);
    if (res.ok) {
      setGoalsMap(updatedMap);
      setGoalModalOpen(false);
    }
  }

  function openGoalModal() {
    if (selectedYear === 'lifetime') return;
    const currentTarget =
      goalsMap[`${selectedYear}_${selectedMetric}`] ?? (selectedMetric === 'books' ? 25 : 0);
    setGoalInputVal(currentTarget > 0 ? String(currentTarget) : '');
    setGoalModalOpen(true);
  }

  // --- Calculations for Goal Card ---
  const isLifetime = selectedYear === 'lifetime';
  const targetGoal = isLifetime
    ? 0
    : (goalsMap[`${selectedYear}_${selectedMetric}`] ??
      (selectedMetric === 'books' && selectedYear === thisYear ? 25 : 0));

  // Map reading journeys by book_id for historical re-read journey resolution
  const journeysByBook = useMemo(() => {
    const map = new Map<string, ReadingJourney[]>();
    for (const j of journeys) {
      const list = map.get(j.book_id) || [];
      list.push(j);
      map.set(j.book_id, list);
    }
    return map;
  }, [journeys]);

  // Books map for fast lookup
  const booksMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) {
      map.set(b.id, b);
    }
    return map;
  }, [books]);

  // Calculate actual progress for selectedYear and selectedMetric matching Flutter Client 1:1
  const actualProgress = useMemo(() => {
    const targetYearNum = isLifetime ? null : (selectedYear as number);

    if (selectedMetric === 'books') {
      let completedCount = 0;

      for (const b of books) {
        const isBookCompleted = b.status?.toLowerCase() === 'completed';

        if (isBookCompleted) {
          let dt = b.date_finished ? parseLocalDate(b.date_finished) : null;
          if (!dt && b.updated_at) dt = new Date(b.updated_at);

          if (dt && !Number.isNaN(dt.getTime())) {
            if (isLifetime || dt.getFullYear() === targetYearNum) {
              completedCount++;
            }
          }
        }

        // Check for historical completed re-read journeys for this book
        const bookJourneys = journeysByBook.get(b.id);
        if (bookJourneys && bookJourneys.length > 0) {
          for (const j of bookJourneys) {
            const isPastCompletedJourney =
              j.status?.toLowerCase() === 'completed' &&
              j.date_finished &&
              (!isBookCompleted || j.journey_index < (b.reread_count || 0) + 1);

            if (isPastCompletedJourney) {
              const dt = parseLocalDate(j.date_finished!);
              if (dt && !Number.isNaN(dt.getTime())) {
                if (isLifetime || dt.getFullYear() === targetYearNum) {
                  completedCount++;
                }
              }
            }
          }
        }
      }
      return completedCount;
    }

    // Units (pages, chapters, volumes)
    // 1. If logs are available, sum delta from reading logs exactly like Flutter getUnitBreakdownStats
    let sum = 0;
    const loggedBookIds = new Set<string>();

    if (logs.length > 0) {
      for (const log of logs) {
        if (!isLifetime && targetYearNum) {
          const logDate = log.logged_at ? new Date(log.logged_at) : null;
          if (
            !logDate ||
            Number.isNaN(logDate.getTime()) ||
            logDate.getFullYear() !== targetYearNum
          ) {
            continue;
          }
        }

        const delta = Number(log.to_progress) - Number(log.from_progress);
        if (delta <= 0) continue;

        loggedBookIds.add(log.book_id);
        const book = booksMap.get(log.book_id);
        const unitType = (book?.unit_type || 'pages').toLowerCase();
        if (selectedMetric === 'pages' && (unitType === 'pages' || unitType === 'units')) {
          sum += delta;
        } else if (selectedMetric === 'chapters' && unitType === 'chapters') {
          sum += delta;
        } else if (selectedMetric === 'volumes' && unitType === 'volumes') {
          sum += delta;
        }
      }
    }

    // 2. Fallback: Include base progress for books that have progress but no log rows yet (matching Flutter)
    if (isLifetime || targetYearNum === thisYear) {
      for (const b of books) {
        if (loggedBookIds.has(b.id)) continue;
        const p = b.progress || 0;
        if (p <= 0) continue;

        const unitType = (b.unit_type || 'pages').toLowerCase();
        if (selectedMetric === 'pages' && (unitType === 'pages' || unitType === 'units')) {
          sum += p;
        } else if (selectedMetric === 'chapters' && unitType === 'chapters') {
          sum += p;
        } else if (selectedMetric === 'volumes' && unitType === 'volumes') {
          sum += p;
        }
      }
    }

    return sum;
  }, [books, logs, journeysByBook, booksMap, selectedMetric, selectedYear, isLifetime, thisYear]);

  // Pacing status calculations
  const goalProgressPct =
    targetGoal > 0 ? Math.min(100, Math.round((actualProgress / targetGoal) * 100)) : 0;
  const isGoalAchieved = targetGoal > 0 && actualProgress >= targetGoal;

  const currentMonthIdx = new Date().getMonth();
  const elapsedMonths = selectedYear === thisYear ? currentMonthIdx + 1 : 12;
  const expectedByNow = targetGoal > 0 ? (targetGoal / 12) * elapsedMonths : 0;
  const paceDiff = Math.round(actualProgress - expectedByNow);

  let paceStatus = 'NO GOAL SET';
  let paceBadgeClass = 'border-border text-text-muted bg-surface';
  let paceIcon = <Target className="h-3.5 w-3.5" />;

  if (isLifetime) {
    paceStatus = 'ALL-TIME';
    paceBadgeClass = 'border-border text-text bg-surface shadow-[1px_1px_0px_var(--border)]';
    paceIcon = <Award className="h-3.5 w-3.5 text-accent-color" />;
  } else if (targetGoal === 0) {
    paceStatus = 'NO GOAL SET';
  } else if (isGoalAchieved) {
    paceStatus = 'GOAL ACHIEVED!';
    paceBadgeClass =
      'border-border bg-accent-color text-accent-text shadow-[1.5px_1.5px_0px_var(--border)]';
    paceIcon = <Trophy className="h-3.5 w-3.5 text-accent-text" />;
  } else if (paceDiff > 0) {
    paceStatus = `+${paceDiff} AHEAD`;
    paceBadgeClass =
      'border-emerald-600 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold';
    paceIcon = <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  } else if (paceDiff === 0) {
    paceStatus = 'ON TRACK';
    paceBadgeClass = 'border-sky-600 bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold';
    paceIcon = <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />;
  } else {
    paceStatus = `${Math.abs(paceDiff)} BEHIND`;
    paceBadgeClass = 'border-rose-600 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold';
    paceIcon = <TrendingDown className="h-3.5 w-3.5 text-rose-500" />;
  }

  // Monthly breakdown bar chart
  const monthlyData = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    const targetYear = selectedYear === 'lifetime' ? thisYear : selectedYear;

    books.forEach((b) => {
      if (b.status === 'Completed' && b.date_finished) {
        const d = parseLocalDate(b.date_finished);
        if (d && d.getFullYear() === targetYear) {
          counts[d.getMonth()] += 1;
        }
      }
    });
    return MONTH_LABELS.map((label, idx) => ({
      label,
      monthName: MONTH_NAMES[idx],
      count: counts[idx],
    }));
  }, [books, selectedYear, thisYear]);

  const maxMonthCount = Math.max(1, ...monthlyData.map((m) => m.count));

  // Overall Status Breakdown counts
  const _totalCount = books.length;
  const _completedCount = books.filter((b) => b.status === 'Completed').length;
  const _readingCount = books.filter((b) => b.status === 'Reading').length;
  const _onHoldCount = books.filter((b) => b.status === 'On Hold').length;
  const _planToReadCount = books.filter((b) => b.status === 'Plan to Read').length;
  const _droppedCount = books.filter((b) => b.status === 'Dropped').length;

  return (
    <div className="space-y-6">
      {/* TOP HEADER TIMEFRAME SELECTOR (ON THE LEFT NEAR HEADER) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 border-2 border-border bg-surface px-3 py-1.5 shadow-[2px_2px_0px_var(--border)]">
          <Calendar className="h-4 w-4 text-accent-color shrink-0" />
          <span className="font-mono text-xs font-bold text-text-muted uppercase hidden sm:inline">
            TIMEFRAME:
          </span>
          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                e.target.value === 'lifetime' ? 'lifetime' : parseInt(e.target.value, 10),
              )
            }
            className="bg-transparent font-anton text-base sm:text-lg text-text focus:outline-none cursor-pointer pr-1"
          >
            {availableYears.map((y) => (
              <option key={y} value={y} className="bg-card-bg text-text">
                {y} ARCHIVE
              </option>
            ))}
            <option value="lifetime" className="bg-card-bg text-text">
              LIFETIME ARCHIVES
            </option>
          </select>
        </div>
      </div>

      {/* 1. VELOCITY CARDS DASHBOARD */}
      <VelocityCards books={books} logs={logs} />

      {/* 2. MAIN ANNUAL GOAL & MONTHLY PACING CARD */}
      <Card className="surface-t1 border-2 border-border p-4 sm:p-6 shadow-[3px_3px_0px_var(--border)]">
        {/* Goal Metric Selector & Pace Badge */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b-2 border-border/30 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-anton text-base sm:text-lg tracking-wide text-text uppercase">
                {isLifetime ? 'LIFETIME' : `${selectedYear}`} GOAL:
              </span>
            </div>

            {/* Metric Chips */}
            <div className="flex items-center gap-1 border-2 border-border bg-surface p-1 shadow-[2px_2px_0px_var(--border)]">
              {(['books', 'pages', 'chapters', 'volumes'] as GoalMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMetric(m)}
                  className={`px-2.5 py-1 font-mono text-[11px] font-bold uppercase transition-all ${
                    selectedMetric === m
                      ? 'bg-accent-color text-accent-text border border-border shadow-[1px_1px_0px_var(--border)]'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Pace Badge & Set Goal Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={`flex items-center gap-1.5 border-2 px-3 py-1 font-mono text-xs ${paceBadgeClass}`}
            >
              {paceIcon}
              <span>{paceStatus}</span>
            </div>

            {!isLifetime && (
              <Button
                variant="outline"
                size="sm"
                onClick={openGoalModal}
                className="gap-1.5 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--border)]"
              >
                <Edit2 className="h-3 w-3" />
                <span>SET {selectedMetric.toUpperCase()} GOAL</span>
              </Button>
            )}
          </div>
        </div>

        {/* Goal Gauge & Monthly Bar Chart Grid */}
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Big Numbers & Gauge */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-anton text-4xl sm:text-5xl text-text tracking-wide">
                  {actualProgress.toLocaleString()}
                </span>
                <span className="ml-2 font-mono text-sm font-bold text-text-muted uppercase">
                  / {targetGoal > 0 ? targetGoal.toLocaleString() : '—'} {selectedMetric}
                </span>
              </div>
              <span className="font-mono text-base font-bold text-accent-color">
                {targetGoal > 0 ? `${goalProgressPct}%` : ''}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-4 w-full bg-border/40 border-2 border-border overflow-hidden p-0.5">
              <div
                className="h-full bg-accent-color transition-all duration-700 shadow-sm"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <p className="font-mono text-xs text-text-muted">
              {isGoalAchieved
                ? `🎉 Target exceeded by ${(actualProgress - targetGoal).toLocaleString()} ${selectedMetric}!`
                : targetGoal > 0
                  ? `${(targetGoal - actualProgress).toLocaleString()} ${selectedMetric} remaining to achieve goal.`
                  : 'No specific goal set for this period.'}
            </p>
          </div>

          {/* Right Column: 12-Month Completion History */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-text-muted">
              <span>
                {isLifetime ? `${thisYear} MONTHLY ACTIVITY` : `${selectedYear} MONTHLY BREAKDOWN`}
              </span>
              <span>
                {actualProgress} {selectedMetric} TOTAL
              </span>
            </div>

            <div className="h-28 flex items-end justify-between gap-1.5 pt-4 px-2 border-2 border-border bg-surface shadow-[2px_2px_0px_var(--border)]">
              {monthlyData.map((m) => {
                const heightPct = Math.round((m.count / maxMonthCount) * 100);
                return (
                  <div key={m.monthName} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="font-mono text-[10px] font-bold text-text opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                    <div className="w-full bg-border/30 h-16 flex items-end overflow-hidden border border-border/40">
                      <div
                        className={`w-full transition-all duration-500 ${
                          m.count > 0 ? 'bg-accent-color' : 'bg-transparent'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-text-muted">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. READING PASSPORT & MILESTONES */}
      <ReadingPassport
        books={books}
        journeys={journeys}
        selectedYear={selectedYear}
        yearlyGoal={
          selectedYear === 'lifetime'
            ? 0
            : (goalsMap[`${selectedYear}_books`] ?? (selectedYear === thisYear ? 25 : 0))
        }
      />

      {/* 4. GITHUB-STYLE STREAK & DAILY HEATMAP */}
      <StreakHeatmap logs={logs} />

      {/* 5. LIBRARY DISTRIBUTIONS (FORMATS, GENRES, RATINGS) */}
      <DistributionTabs books={books} />

      {/* SET GOAL MODAL */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-md border-2 border-border bg-card-bg shadow-[4px_4px_0px_var(--border)]">
          <DialogHeader>
            <DialogTitle className="font-anton text-xl tracking-wide text-text uppercase">
              SET {selectedYear} {selectedMetric} GOAL
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="font-hanken text-xs text-text-muted">
              Target number of {selectedMetric} you aim to finish in {selectedYear}. This will
              automatically sync across all your devices and client sessions.
            </p>

            <div className="space-y-2">
              <label className="block font-mono text-xs font-bold uppercase text-text-muted">
                {selectedMetric} TARGET
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={goalInputVal}
                onChange={(e) => setGoalInputVal(e.target.value)}
                placeholder="e.g. 25"
                className="border-2 border-border font-mono font-bold text-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGoalModalOpen(false)}
                className="border-2 border-border font-mono text-xs font-bold"
              >
                CANCEL
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={savingGoal || !goalInputVal.trim()}
                onClick={handleSaveGoal}
                className="font-mono text-xs font-bold bg-accent-color text-accent-text border-2 border-border shadow-[2px_2px_0px_var(--border)]"
              >
                {savingGoal ? 'SAVING...' : 'SAVE GOAL'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
