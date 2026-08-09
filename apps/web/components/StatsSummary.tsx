'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BarChart2,
  BookCheck,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Flame,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Book } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';

function useAnimatedNumber(value: number, duration = 500): number {
  const [display, setDisplay] = useState(value);
  const startTimeRef = useRef<number | null>(null);
  const startValRef = useRef(display);

  useEffect(() => {
    startValRef.current = display;
    startTimeRef.current = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const ease = 1 - (1 - progress) ** 3;
      const current = Math.round(startValRef.current + (value - startValRef.current) * ease);
      setDisplay(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return display;
}

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

const _SPINE_COLORS = [
  '#8a3b30', // Terracotta
  '#3f6b4f', // Sage
  '#a6752f', // Amber
  '#4a6fa5', // Slate Blue
  '#7c5295', // Violet
  '#994e36', // Rust
];

export default function StatsSummary({
  books,
  onStatusSelect,
}: {
  books: Book[];
  onStatusSelect?: (status: string) => void;
}) {
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const thisYear = new Date().getFullYear();

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.yearlyGoal != null) setGoal(d.yearlyGoal);
      })
      .catch(() => {});
  }, []);

  async function saveGoal() {
    const n = parseInt(goalInput, 10);
    if (!Number.isFinite(n) || n < 0) return;
    setSavingGoal(true);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yearlyGoal: n }),
    });
    setSavingGoal(false);
    if (res.ok) {
      setGoal(n);
      setEditingGoal(false);
    }
  }

  const totalCount = books.length;
  const completedCount = books.filter((b) => b.status === 'Completed').length;
  const readingCount = books.filter((b) => b.status === 'Reading').length;
  const onHoldCount = books.filter((b) => b.status === 'On Hold').length;
  const planToReadCount = books.filter((b) => b.status === 'Plan to Read').length;
  const droppedCount = books.filter((b) => b.status === 'Dropped').length;

  function distributePercentages(counts: number[], total: number): number[] {
    if (total === 0) return counts.map(() => 0);
    const raw = counts.map((c) => (c / total) * 100);
    const floored = raw.map(Math.floor);
    const remainder = 100 - floored.reduce((a, b) => a + b, 0);
    const order = raw
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    const result = [...floored];
    for (let k = 0; k < remainder; k++) {
      result[order[k % order.length].i] += 1;
    }
    return result;
  }

  const [compPct, readPct, holdPct, planPct, dropPct] = distributePercentages(
    [completedCount, readingCount, onHoldCount, planToReadCount, droppedCount],
    totalCount,
  );

  const rated = books.filter((b) => b.rating != null && b.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    const d = parseLocalDate(b.date_finished);
    return d ? d.getFullYear() === thisYear : false;
  }).length;

  const totalRated = rated.length || 1;
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = books.filter((b) => b.rating != null && Math.round(b.rating) === star).length;
    const percentage = Math.round((count / totalRated) * 100);
    return { star, count, percentage };
  });

  const ratedCount = rated.length;
  const fiveStarPct = ratingDistribution.find((r) => r.star === 5)?.percentage || 0;

  const monthlyData = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    books.forEach((b) => {
      if (b.status === 'Completed' && b.date_finished) {
        const d = parseLocalDate(b.date_finished);
        if (d && d.getFullYear() === thisYear) {
          counts[d.getMonth()] += 1;
        }
      }
    });
    return MONTH_LABELS.map((label, idx) => ({
      label,
      monthName: MONTH_NAMES[idx],
      count: counts[idx],
    }));
  }, [books, thisYear]);

  const targetGoal = goal ?? 30;
  const currentMonthIdx = new Date().getMonth();
  const elapsedMonths = currentMonthIdx + 1;
  const remainingMonths = 12 - currentMonthIdx;

  const avgPacePerMonth = completedThisYear
    ? (completedThisYear / elapsedMonths).toFixed(1)
    : '0.0';
  const remainingBooksNeeded = Math.max(0, targetGoal - completedThisYear);
  const requiredPace = (remainingBooksNeeded / remainingMonths).toFixed(1);
  const isOnTrack =
    completedThisYear >= targetGoal || Number(avgPacePerMonth) >= Number(requiredPace);

  const goalPct = goal ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0;

  const animatedTotalCount = useAnimatedNumber(totalCount);
  const animatedCompletedCount = useAnimatedNumber(completedCount);
  const animatedReadingCount = useAnimatedNumber(readingCount);
  const animatedCompletedThisYear = useAnimatedNumber(completedThisYear);

  return (
    <Card className="surface-t1 mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-accent-color" />
          <CardTitle className="font-bold text-lg">Reading Dashboard</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-text-muted text-xs hover:text-text"
        >
          <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
          {isExpanded ? (
            <ChevronUp className="ml-1 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-1 h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="expanded-dashboard"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4 pt-1 pb-5">
              <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-3">
                {/* WIDGET 1: STATUS BREAKDOWN */}
                <motion.div
                  whileHover={{ y: -2.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="surface-t2 group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between font-bold text-text-muted text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <BookCheck className="h-3.5 w-3.5 text-accent-color" />
                      Status Breakdown
                    </span>
                  </div>

                  {/* Refined Matte-Satin 3D Progress Bar */}
                  <div className="my-3">
                    <div className="groove-inset relative flex h-4 items-center gap-1.5 overflow-hidden rounded-full border border-border/40 bg-border/40 p-0.5 shadow-inner">
                      {[
                        {
                          label: 'Completed',
                          count: completedCount,
                          pct: compPct,
                          gradient: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
                        },
                        {
                          label: 'Reading',
                          count: readingCount,
                          pct: readPct,
                          gradient: 'bg-gradient-to-r from-sky-600 to-sky-500',
                        },
                        {
                          label: 'On Hold',
                          count: onHoldCount,
                          pct: holdPct,
                          gradient: 'bg-gradient-to-r from-orange-600 to-amber-500',
                        },
                        {
                          label: 'Plan to Read',
                          count: planToReadCount,
                          pct: planPct,
                          gradient: 'bg-gradient-to-r from-amber-500 to-yellow-400',
                        },
                        {
                          label: 'Dropped',
                          count: droppedCount,
                          pct: dropPct,
                          gradient: 'bg-gradient-to-r from-rose-600 to-pink-500',
                        },
                      ]
                        .filter((s) => s.count > 0)
                        .map((s, idx) => (
                          <motion.div
                            key={s.label}
                            className={`h-full rounded-full ${s.gradient} relative cursor-pointer border-white/30 border-t shadow-2xs transition-all`}
                            initial={{ width: 0 }}
                            animate={{ width: `${s.pct}%` }}
                            whileHover={{ scaleY: 1.18 }}
                            transition={{
                              type: 'spring',
                              stiffness: 250,
                              damping: 20,
                              delay: idx * 0.05,
                            }}
                            onClick={() => onStatusSelect?.(s.label)}
                            title={`${s.label}: ${s.count} (${totalCount ? Math.round((s.count / totalCount) * 100) : 0}%)`}
                          >
                            {/* Subtle Inner Top Catch-light Reflection */}
                            <div className="absolute inset-x-1 top-[1px] h-[1px] rounded-full bg-white/35" />
                          </motion.div>
                        ))}
                    </div>
                  </div>

                  {/* 3-Row Breakdown Grid matching design mockup */}
                  <div className="my-2.5 space-y-1 text-xs">
                    {/* Row 1: Completed & Reading */}
                    <div className="grid grid-cols-2 gap-2 border-border/30 border-b pb-2">
                      <div
                        onClick={() => onStatusSelect?.('Completed')}
                        className="flex cursor-pointer items-center justify-between rounded-lg border-border/30 border-r pr-2 pl-1 transition-colors hover:bg-text/5"
                        title="Filter by Completed"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text leading-tight">Completed</span>
                            <span className="text-[10px] text-text-muted">
                              ({totalCount ? Math.round((completedCount / totalCount) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-text shrink-0">
                          {animatedCompletedCount}
                        </span>
                      </div>

                      <div
                        onClick={() => onStatusSelect?.('Reading')}
                        className="flex cursor-pointer items-center justify-between rounded-lg pl-1 transition-colors hover:bg-text/5"
                        title="Filter by Reading"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text leading-tight">Reading</span>
                            <span className="text-[10px] text-text-muted">
                              ({totalCount ? Math.round((readingCount / totalCount) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-text shrink-0">
                          {animatedReadingCount}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: On Hold & Plan to Read */}
                    <div className="grid grid-cols-2 gap-2 border-border/30 border-b py-2">
                      <div
                        onClick={() => onStatusSelect?.('On Hold')}
                        className="flex cursor-pointer items-center justify-between rounded-lg border-border/30 border-r pr-2 pl-1 transition-colors hover:bg-text/5"
                        title="Filter by On Hold"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text leading-tight">On Hold</span>
                            <span className="text-[10px] text-text-muted">
                              ({totalCount ? Math.round((onHoldCount / totalCount) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-text shrink-0">{onHoldCount}</span>
                      </div>

                      <div
                        onClick={() => onStatusSelect?.('Plan to Read')}
                        className="flex cursor-pointer items-center justify-between rounded-lg pl-1 transition-colors hover:bg-text/5"
                        title="Filter by Plan to Read"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text leading-tight truncate">
                              Plan to Read
                            </span>
                            <span className="text-[10px] text-text-muted">
                              ({totalCount ? Math.round((planToReadCount / totalCount) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-text shrink-0">
                          {planToReadCount}
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Dropped */}
                    <div className="pt-1.5 pb-0.5">
                      <div
                        onClick={() => onStatusSelect?.('Dropped')}
                        className="flex w-max cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-text/5"
                        title="Filter by Dropped"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                        <span className="font-semibold text-text">Dropped</span>
                        <span className="font-bold text-sm text-text ml-1">{droppedCount}</span>
                        <span className="text-[10px] text-text-muted">
                          ({totalCount ? Math.round((droppedCount / totalCount) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Widget 1 Footer Badges */}
                  <div className="mt-2 grid grid-cols-2 gap-2 border-border/40 border-t pt-2.5 text-xs">
                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <BookOpen className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Total Entries
                        </span>
                        <span className="font-bold text-sm text-text leading-tight">
                          {totalCount}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Avg Rating
                        </span>
                        <span className="flex items-center gap-1 font-bold text-sm text-text leading-tight">
                          {avgRating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* WIDGET 2: ANNUAL SHELF & GOALS */}
                <motion.div
                  whileHover={{ y: -2.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="surface-t2 group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-text-muted text-xs uppercase tracking-wider">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>{thisYear} Goal & Pace</span>
                    </div>

                    {/* Animated Pace Indicator */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex h-6 w-6 cursor-help items-center justify-center rounded-full border border-border/50 bg-surface/80 shadow-2xs transition-transform hover:scale-110">
                            {isOnTrack ? (
                              <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
                            ) : (
                              <Flame className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isOnTrack
                            ? `⚡ Excellent pace! You've finished ${completedThisYear} books out of ${targetGoal}.`
                            : `📈 Keep going! Target pace requires ~${Math.max(1, Math.round((targetGoal - completedThisYear) / Math.max(1, 12 - new Date().getMonth())))} bks/mo.`}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Monthly Histogram Bars */}
                  <div className="my-3 space-y-1">
                    <div className="grid h-14 grid-cols-12 items-end gap-1 px-1">
                      {monthlyData.map((d, mIdx) => (
                        <div
                          key={mIdx}
                          className="group relative flex h-full flex-col items-center justify-end"
                          title={`${d.monthName}: ${d.count} finished`}
                        >
                          <motion.div
                            className="w-full rounded-t-xs bg-gradient-to-t from-accent-color/85 to-accent-color/60 transition-colors group-hover:from-accent-color group-hover:to-accent-color/80"
                            initial={{ height: 0 }}
                            animate={{
                              height:
                                d.count === 0
                                  ? '2px'
                                  : `${Math.round((d.count / Math.max(1, ...monthlyData.map((m) => m.count))) * 100)}%`,
                            }}
                            transition={{
                              type: 'spring',
                              stiffness: 200,
                              damping: 20,
                              delay: mIdx * 0.02,
                            }}
                          />
                          <span className="mt-1 font-mono text-[9px] text-text-muted/80 transition-colors group-hover:text-text">
                            {d.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Goal Progress Ring & Edit */}
                  <div className="flex items-center gap-3 border-border/50 border-t pt-2.5">
                    <div className="w-full space-y-1">
                      {!editingGoal ? (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-text-muted">Target:</span>
                            <strong className="text-text">
                              {completedThisYear} / {targetGoal} books
                            </strong>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Edit reading goal"
                            onClick={() => {
                              setGoalInput(String(targetGoal));
                              setEditingGoal(true);
                            }}
                            className="h-6 w-6 rounded-md p-0 text-accent-color text-xs transition-transform hover:scale-110 hover:bg-accent-color/10 active:scale-95"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={goalInput}
                            onChange={(e) => setGoalInput(e.target.value)}
                            className="h-7 w-16 rounded border border-border bg-card-bg px-2 text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={saveGoal}
                            disabled={savingGoal}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditingGoal(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      <Progress value={goalPct} className="groove-inset h-1.5 bg-border/40" />

                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-text-muted">
                        <span>{goalPct}% Achieved</span>
                        <span>Pace: {avgPacePerMonth} bks/mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Widget 2 Footer Badges */}
                  <div className="mt-2 grid grid-cols-2 gap-2 border-border/40 border-t pt-2.5 text-xs">
                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Annual Goal
                        </span>
                        <span className="font-bold text-xs text-text leading-tight">
                          {completedThisYear} / {targetGoal}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <Flame className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Pace Needed
                        </span>
                        <span className="font-bold text-xs text-text leading-tight">
                          {requiredPace} bks/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* WIDGET 3: RATING DISTRIBUTION */}
                <motion.div
                  whileHover={{ y: -2.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="surface-t2 group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between font-bold text-text-muted text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <motion.div
                        whileHover={{ scale: 1.3, rotate: 15 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 15 }}
                        className="inline-flex cursor-pointer"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow-xs" />
                      </motion.div>
                      Rating Breakdown
                    </span>
                  </div>

                  <div className="my-2 space-y-1.5">
                    {ratingDistribution.map(({ star, count, percentage }) => (
                      <div
                        key={star}
                        className="grid grid-cols-[24px_1fr_60px] items-center gap-2 rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-text/5"
                      >
                        <span className="flex items-center gap-0.5 font-semibold text-text">
                          {star}
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="groove-inset relative h-2 overflow-hidden rounded-full bg-border/40">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{
                              type: 'spring',
                              stiffness: 180,
                              damping: 24,
                              delay: (5 - star) * 0.04,
                            }}
                          />
                        </div>
                        <span className="text-right font-mono text-[11px] text-text-muted">
                          {count}x ({percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Widget 3 Footer Badges */}
                  <div className="mt-2 grid grid-cols-2 gap-2 border-border/40 border-t pt-2.5 text-xs">
                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <Award className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Top Rating
                        </span>
                        <span className="font-bold text-xs text-text leading-tight">
                          5★ ({fiveStarPct}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-surface/70 p-2 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card-bg text-text-muted">
                        <BarChart2 className="h-3.5 w-3.5 text-sky-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[10px] text-text-muted leading-tight">
                          Rated Books
                        </span>
                        <span className="font-bold text-xs text-text leading-tight">
                          {ratedCount} / {totalCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CardContent className="py-2">
              <div className="flex flex-wrap items-center gap-4 text-text-muted text-xs">
                <span>
                  Total: <strong className="text-text">{animatedTotalCount}</strong>
                </span>
                <span>
                  Completed ({thisYear}):{' '}
                  <strong className="text-text">{animatedCompletedThisYear}</strong>
                </span>
                <span>
                  Reading: <strong className="text-text">{animatedReadingCount}</strong>
                </span>
                <span>
                  Avg Rating: <strong className="text-text">{avgRating}★</strong>
                </span>
                <span>
                  Goal:{' '}
                  <strong className="text-text">
                    {completedThisYear}/{targetGoal} ({goalPct}%)
                  </strong>
                </span>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
