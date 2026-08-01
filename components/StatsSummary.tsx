'use client';

import { useEffect, useState, useMemo } from 'react';
import { Book } from '@/lib/types';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SPINE_COLORS = [
  '#8a3b30', // Terracotta
  '#3f6b4f', // Sage
  '#a6752f', // Amber
  '#4a6fa5', // Slate Blue
  '#7c5295', // Violet
  '#994e36', // Rust
];

export default function StatsSummary({ books }: { books: Book[] }) {
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

  const [compPct, readPct, holdPct, planPct] = distributePercentages(
    [completedCount, readingCount, onHoldCount, planToReadCount],
    totalCount
  );

  const rated = books.filter((b) => b.rating != null && b.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === thisYear;
  }).length;

  const totalRated = rated.length || 1;
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = books.filter(
      (b) => b.rating != null && Math.round(b.rating) === star
    ).length;
    const percentage = Math.round((count / totalRated) * 100);
    return { star, count, percentage };
  });

  const monthlyData = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => 0);
    books.forEach((b) => {
      if (b.status === 'Completed' && b.date_finished) {
        const d = new Date(b.date_finished);
        if (d.getFullYear() === thisYear) {
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

  const avgPacePerMonth = completedThisYear ? (completedThisYear / elapsedMonths).toFixed(1) : '0.0';
  const remainingBooksNeeded = Math.max(0, targetGoal - completedThisYear);
  const requiredPace = (remainingBooksNeeded / remainingMonths).toFixed(1);
  const isOnTrack = completedThisYear >= targetGoal || Number(avgPacePerMonth) >= Number(requiredPace);

  const goalPct = goal ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0;

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;

  return (
    <div className={`p-[var(--space-4)] bg-card-bg border border-border-main rounded-[var(--radius-lg)] shadow-[var(--shadow)] transition-all duration-[300ms] ease-out ${!isExpanded ? 'pb-[var(--space-3)]' : ''}`}>
      <div className={`flex justify-between items-center ${isExpanded ? 'mb-[var(--space-4)]' : 'mb-[var(--space-2)]'}`}>
        <h2 className="text-[18px] font-bold m-0">Dashboard</h2>
        <div className="flex items-center gap-[var(--space-3)] text-[13px] text-text-muted">
          <button
            className="bg-transparent border-none text-text-muted text-[13px] font-medium cursor-pointer py-0.5 px-1.5 rounded-[var(--radius-sm)] transition-all duration-[100ms] hover:text-text-main hover:bg-row-hover"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Hide Stats ▴' : 'Show Stats ▾'}
          </button>
          <span className="bg-bg border border-border-main px-2.5 py-0.5 rounded-[12px] text-[12px] text-text-muted">
            {isExpanded ? 'Expanded' : 'Collapsed'}
          </span>
        </div>
      </div>

      {isExpanded ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-4)] animate-[fadeIn_0.12s_ease_both]">
          {/* CARD 1: STATUS BREAKDOWN */}
          <div className="bg-bg border border-border-soft rounded-[var(--radius-md)] p-[var(--space-4)] flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="text-[12px] font-bold tracking-[0.05em] text-text-muted uppercase">STATUS BREAKDOWN</div>

            <div className="flex h-[38px] rounded-[var(--radius-sm)] overflow-hidden mt-[var(--space-3)] mb-[4px]">
              <div className="flex items-center justify-center text-[13px] font-bold text-white transition-[width] duration-[300ms] bg-status-completed" style={{ width: `${compPct}%` }}>
                {compPct >= 8 && <span>{completedCount}</span>}
              </div>
              <div className="flex items-center justify-center text-[13px] font-bold text-white transition-[width] duration-[300ms] bg-status-reading" style={{ width: `${readPct}%` }}>
                {readPct >= 8 && <span>{readingCount}</span>}
              </div>
              <div className="flex items-center justify-center text-[13px] font-bold text-white transition-[width] duration-[300ms] bg-status-hold" style={{ width: `${holdPct}%` }}>
                {holdPct >= 8 && <span>{onHoldCount}</span>}
              </div>
              <div className="flex items-center justify-center text-[13px] font-bold text-white transition-[width] duration-[300ms] bg-status-plan" style={{ width: `${planPct}%` }}>
                {planPct >= 8 && <span>{planToReadCount}</span>}
              </div>
            </div>

            <div className="flex w-full text-[11px] text-text-muted mb-[var(--space-4)]">
              <span style={{ width: `${compPct}%`, textAlign: 'center' }}>{compPct > 0 ? `${compPct}%` : ''}</span>
              <span style={{ width: `${readPct}%`, textAlign: 'center' }}>{readPct > 0 ? `${readPct}%` : ''}</span>
              <span style={{ width: `${holdPct}%`, textAlign: 'center' }}>{holdPct > 0 ? `${holdPct}%` : ''}</span>
              <span style={{ width: `${planPct}%`, textAlign: 'center' }}>{planPct > 0 ? `${planPct}%` : ''}</span>
            </div>

            <div className="grid grid-cols-2 gap-[var(--space-2)] mb-[var(--space-4)] text-[12px]">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-[9px] h-[9px] rounded-[2px] inline-block shrink-0 bg-status-completed" />
                <span>Completed ({completedCount})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-[9px] h-[9px] rounded-[2px] inline-block shrink-0 bg-status-reading" />
                <span>Reading ({readingCount})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-[9px] h-[9px] rounded-[2px] inline-block shrink-0 bg-status-hold" />
                <span>On Hold ({onHoldCount})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-[9px] h-[9px] rounded-[2px] inline-block shrink-0 bg-status-plan" />
                <span>Plan to Read ({planToReadCount})</span>
              </div>
            </div>

            <div className="border-t border-border-soft pt-[var(--space-3)] text-[13px] text-text-main flex flex-col gap-1">
              <div>
                Total Entries: <strong>{totalCount}</strong>
              </div>
              <div>
                Average Rating: <strong>{avgRating}★</strong>
              </div>
            </div>
          </div>

          {/* CARD 2: MINI SHELF */}
          <div className="bg-bg border border-border-soft rounded-[var(--radius-md)] p-[var(--space-4)] flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="flex justify-between items-center mb-[var(--space-2)]">
              <div className="text-[12px] font-bold tracking-[0.05em] text-text-muted uppercase">MINI SHELF ({thisYear})</div>
              <span className={`text-[11px] font-bold padding-[2px_8px] rounded-[10px] py-[2px] px-[8px] ${isOnTrack ? 'bg-[rgba(63,107,79,0.2)] text-status-completed' : 'bg-[rgba(138,59,48,0.2)] text-status-reading'}`}>
                {isOnTrack ? '⚡ On Track' : '📈 Pace Push'}
              </span>
            </div>

            <div className="w-full mb-[var(--space-3)] flex flex-col">
              <div className="grid grid-cols-12 gap-[2px] w-full h-[90px] items-end">
                {monthlyData.map((d, mIdx) => {
                  const visibleSpinesCount = Math.min(d.count, 4);

                  return (
                    <div
                      key={mIdx}
                      className="flex flex-col items-center h-full justify-end min-w-0"
                      title={`${d.monthName}: ${d.count} ${d.count === 1 ? 'book' : 'books'} completed`}
                    >
                      <div className="w-full h-[70px] flex items-end justify-center">
                        {d.count === 0 ? (
                          <div className="w-[3px] h-[14px] rounded-[1px] bg-border-soft opacity-40" />
                        ) : (
                          <div className="flex items-end justify-center gap-[1.5px] w-full h-full relative">
                            {Array.from({ length: visibleSpinesCount }).map((_, spineIdx) => {
                              const spineColor = SPINE_COLORS[(mIdx + spineIdx * 2) % SPINE_COLORS.length];
                              const heightPct = 68 + ((mIdx * 11 + spineIdx * 17) % 28);

                              return (
                                <div
                                  key={spineIdx}
                                  className="flex-1 max-w-[7px] rounded-[2px_2px_0_0] shadow-[inset_-1px_0_2px_rgba(0,0,0,0.25),_1px_0_2px_rgba(0,0,0,0.15)] relative transition-all duration-[100ms] ease-out cursor-pointer hover:-translate-y-[3px] hover:scale-x-[1.1] hover:brightness-[1.15]"
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: spineColor,
                                  }}
                                >
                                  <span className="absolute top-[20%] left-0 right-0 h-[2px] bg-[rgba(255,255,255,0.35)]" />
                                </div>
                              );
                            })}
                            {d.count > 4 && (
                              <span className="absolute top-[-2px] text-[8px] font-extrabold text-text-muted">+{d.count - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted mt-1">{d.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="w-full h-[5px] bg-border-main dark:bg-[#3d3527] rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_5px_rgba(0,0,0,0.4)] mt-[1px]" />
            </div>

            <div className="border-t border-border-soft pt-[var(--space-3)] flex items-center gap-[var(--space-3)]">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle className="fill-none stroke-border-soft stroke-[8px]" cx="40" cy="40" r={radius} />
                  <circle
                    className="fill-none stroke-status-reading stroke-[8px] stroke-linecap-round transition-[stroke-dashoffset] duration-[600ms] ease-out"
                    cx="40"
                    cy="40"
                    r={radius}
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: strokeDashoffset,
                    }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[13px] font-bold text-text-main">{goalPct}%</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {!editingGoal ? (
                  <div className="flex flex-col">
                    <div className="flex justify-between text-[12px] text-text-muted">
                      <span>{thisYear} Goal</span>
                      <button
                        className="bg-none border-none cursor-pointer text-[11px] p-0 text-text-muted underline"
                        onClick={() => {
                          setGoalInput(String(targetGoal));
                          setEditingGoal(true);
                        }}
                      >
                        edit
                      </button>
                    </div>
                    <div className="text-[14px] my-0.5">
                      <strong>{completedThisYear}</strong> / {targetGoal} books
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Pace: <strong>{avgPacePerMonth}</strong> bks/mo (Req: {requiredPace})
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="w-[60px] py-[2px] px-[6px] border border-input-border bg-input-bg rounded-[var(--radius-sm)] text-[12px]"
                    />
                    <button className="text-[11px] py-[2px] px-[8px] border border-btn-border bg-card-bg rounded-[var(--radius-sm)] cursor-pointer" disabled={savingGoal} onClick={saveGoal}>
                      Save
                    </button>
                    <button className="text-[11px] py-[2px] px-[8px] border border-btn-border bg-card-bg rounded-[var(--radius-sm)] cursor-pointer" onClick={() => setEditingGoal(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: RATING DISTRIBUTION */}
          <div className="bg-bg border border-border-soft rounded-[var(--radius-md)] p-[var(--space-4)] flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="text-[12px] font-bold tracking-[0.05em] text-text-muted uppercase">RATING DISTRIBUTION</div>

            <div className="flex flex-col gap-3 mt-[var(--space-3)]">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className={`grid grid-cols-[28px_1fr_64px] items-center gap-2.5 text-[13px] ${count === 0 ? 'opacity-45' : ''}`}>
                  <span className="font-semibold text-text-main">{star}★</span>
                  
                  <div className="w-full h-2 bg-border-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-star-filled rounded-full transition-[width] duration-[600ms] ease-in-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[11px] font-mono">
                    <span className="font-bold text-text-main">{count}x</span>
                    <span className="text-text-muted">({percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-[var(--space-4)] items-center py-[var(--space-2)] px-[var(--space-3)] bg-bg border border-border-soft rounded-[var(--radius-md)] text-[13px] animate-[fadeIn_0.12s_ease_both]">
          <div className="flex items-center gap-[var(--space-1)]">
            <span className="text-text-muted">Total Entries:</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="flex items-center gap-[var(--space-1)]">
            <span className="text-text-muted">Completed ({thisYear}):</span>
            <strong>{completedThisYear}</strong>
          </div>
          <div className="flex items-center gap-[var(--space-1)]">
            <span className="text-text-muted">Reading:</span>
            <strong>{readingCount}</strong>
          </div>
          <div className="flex items-center gap-[var(--space-1)]">
            <span className="text-text-muted">Avg Rating:</span>
            <strong>{avgRating}★</strong>
          </div>
          <div className="flex items-center gap-[var(--space-1)]">
            <span className="text-text-muted">Goal:</span>
            <strong>
              {completedThisYear} / {targetGoal} ({goalPct}%)
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}