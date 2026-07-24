'use client';

import { useEffect, useState, useMemo } from 'react';
import { Book } from '@/lib/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StatsSummary({ books }: { books: Book[] }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activityView, setActivityView] = useState<'heatmap' | 'monthly'>('heatmap');

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

  // Status Counts
  const completedCount = books.filter((b) => b.status === 'Completed').length;
  const readingCount = books.filter((b) => b.status === 'Reading').length;
  const onHoldCount = books.filter((b) => b.status === 'On Hold').length;
  const planToReadCount = books.filter((b) => b.status === 'Plan to Read').length;

  const compPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const readPct = totalCount ? Math.round((readingCount / totalCount) * 100) : 0;
  const holdPct = totalCount ? Math.round((onHoldCount / totalCount) * 100) : 0;
  const planPct = totalCount ? Math.round((planToReadCount / totalCount) * 100) : 0;

  // Average Rating
  const rated = books.filter((b) => b.rating != null && b.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === thisYear;
  }).length;

  // Calculate real daily completions map (YYYY-MM-DD -> Array of Books)
  const dailyCompletions = useMemo(() => {
    const map: Record<string, Book[]> = {};
    for (const b of books) {
      if (b.date_finished) {
        const dateStr = new Date(b.date_finished).toISOString().split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(b);
      }
    }
    return map;
  }, [books]);

  // Generate 52 weeks x 7 days matrix for YTD Activity
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<{ dateStr: string; count: number; books: Book[]; isCurrentYear: boolean }>> = [];
    const startDate = new Date(thisYear, 0, 1);
    
    // Align to nearest Sunday
    const startDayOfWeek = startDate.getDay();
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - startDayOfWeek);

    const endDate = new Date(thisYear, 11, 31);

    let currentWeek: Array<{ dateStr: string; count: number; books: Book[]; isCurrentYear: boolean }> = [];

    while (currentDate <= endDate || currentWeek.length > 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const finishedBooks = dailyCompletions[dateStr] || [];
      const isCurrentYear = currentDate.getFullYear() === thisYear;

      currentWeek.push({
        dateStr,
        count: finishedBooks.length,
        books: finishedBooks,
        isCurrentYear,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate.getFullYear() > thisYear && currentWeek.length === 0) {
        break;
      }
    }

    return weeks;
  }, [thisYear, dailyCompletions]);

  // Books per month bar chart calculations
  const perMonthCounts = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      return books.filter((b) => {
        if (!b.date_finished) return false;
        const d = new Date(b.date_finished);
        return d.getFullYear() === thisYear && d.getMonth() === m;
      }).length;
    });
  }, [books, thisYear]);

  const maxMonthlyCount = Math.max(...perMonthCounts, 1);

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'hm-level-0';
    if (count === 1) return 'hm-level-1';
    if (count === 2) return 'hm-level-2';
    return 'hm-level-3';
  };

  const goalPct = goal ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0;

  return (
    <div className={`card summary-dashboard-card ${!isExpanded ? 'is-collapsed' : ''}`}>
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <div className="dashboard-header-right">
          <button
            className="stats-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Hide Stats ▴' : 'Show Stats ▾'}
          </button>
          <span className="badge-pill">
            {isExpanded ? 'Expanded' : 'Collapsed'}
          </span>
        </div>
      </div>

      {isExpanded ? (
        <div className="dashboard-grid fade-in">
          {/* CARD 1: STATUS BREAKDOWN */}
          <div className="dash-card">
            <div className="dash-card-title">STATUS BREAKDOWN</div>

            <div className="stacked-progress-bar">
              <div className="segment seg-completed" style={{ width: `${compPct}%` }}>
                {completedCount > 0 && <span>{completedCount}</span>}
              </div>
              <div className="segment seg-reading" style={{ width: `${readPct}%` }}>
                {readingCount > 0 && <span>{readingCount}</span>}
              </div>
              <div className="segment seg-hold" style={{ width: `${holdPct}%` }}>
                {onHoldCount > 0 && <span>{onHoldCount}</span>}
              </div>
              <div className="segment seg-plan" style={{ width: `${planPct}%` }}>
                {planToReadCount > 0 && <span>{planToReadCount}</span>}
              </div>
            </div>

            <div className="stacked-pct-labels">
              <span>{compPct}%</span>
              <span>{readPct}%</span>
              <span>{holdPct}%</span>
              <span>{planPct}%</span>
            </div>

            <div className="status-legend">
              <div className="legend-item">
                <span className="dot dot-completed" />
                <span>Completed ({completedCount})</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-reading" />
                <span>Reading ({readingCount})</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-hold" />
                <span>On Hold ({onHoldCount})</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-plan" />
                <span>Plan to Read ({planToReadCount})</span>
              </div>
            </div>

            <div className="dash-card-footer">
              <div>
                Total Entries: <strong>{totalCount}</strong>
              </div>
              <div>
                Average Rating: <strong>{avgRating}★</strong>
              </div>
            </div>
          </div>

          {/* CARD 2: READING ACTIVITY & YTD PROGRESS */}
          <div className="dash-card">
            <div className="dash-card-header-row">
              <div className="dash-card-title">READING ACTIVITY ({thisYear})</div>
              <div className="view-mode-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activityView === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setActivityView('heatmap')}
                >
                  Heatmap
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activityView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setActivityView('monthly')}
                >
                  Monthly
                </button>
              </div>
            </div>

            {activityView === 'heatmap' ? (
              <div className="heatmap-container">
                <div className="heatmap-grid-scroll">
                  <div className="heatmap-weeks-flex">
                    {calendarWeeks.map((week, wIdx) => (
                      <div key={wIdx} className="heatmap-week-col">
                        {week.map((day, dIdx) => {
                          const titleText = day.isCurrentYear
                            ? `${day.dateStr}: ${day.count} ${day.count === 1 ? 'book' : 'books'} completed`
                            : '';
                          return (
                            <div
                              key={dIdx}
                              className={`hm-cell ${day.isCurrentYear ? getIntensityClass(day.count) : 'hm-out-year'}`}
                              title={titleText}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="heatmap-legend">
                  <span>Less</span>
                  <span className="hm-sample hm-level-0" />
                  <span className="hm-sample hm-level-1" />
                  <span className="hm-sample hm-level-2" />
                  <span className="hm-sample hm-level-3" />
                  <span>More</span>
                </div>
              </div>
            ) : (
              /* Monthly Bars View */
              <div className="monthly-bars-container">
                <div className="monthly-bars-grid">
                  {perMonthCounts.map((count, monthIdx) => {
                    const heightPct = Math.round((count / maxMonthlyCount) * 100);
                    return (
                      <div key={monthIdx} className="monthly-bar-col" title={`${MONTH_NAMES[monthIdx]}: ${count} completed`}>
                        <div className="bar-wrapper">
                          <div
                            className="monthly-bar-fill"
                            style={{ height: `${count > 0 ? Math.max(heightPct, 18) : 0}%` }}
                          >
                            {count > 0 && <span className="bar-val">{count}</span>}
                          </div>
                        </div>
                        <span className="month-lbl">{MONTH_NAMES[monthIdx][0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Yearly Goal Footer */}
            <div className="yearly-goal-section">
              {!editingGoal ? (
                <div className="goal-display">
                  <span>
                    {thisYear} Goal: <strong>{completedThisYear}</strong> / {goal ?? 30} books
                  </span>
                  <button
                    className="goal-edit-btn"
                    onClick={() => {
                      setGoalInput(String(goal ?? 30));
                      setEditingGoal(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="goal-edit-form">
                  <input
                    type="number"
                    min={0}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                  <button disabled={savingGoal} onClick={saveGoal}>
                    Save
                  </button>
                  <button onClick={() => setEditingGoal(false)}>Cancel</button>
                </div>
              )}

              <div className="progress-bar goal-bar">
                <div style={{ width: `${goalPct}%` }} />
              </div>
            </div>
          </div>

          {/* CARD 3: RATING DISTRIBUTION */}
          <div className="dash-card">
            <div className="dash-card-title">RATING DISTRIBUTION</div>

            <div className="rating-dist-list">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="rating-dist-row">
                  <span className="star-label">{star}★</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(percentage, count > 0 ? 15 : 0)}%`,
                      }}
                    >
                      {count > 0 && <span className="bar-count-tag">{count}x</span>}
                    </div>
                  </div>
                  <span className="dist-pct-text">
                    {count > 0 ? `${percentage}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Summary View */
        <div className="collapsed-summary-bar fade-in">
          <div className="collapsed-item">
            <span className="collapsed-label">Total Entries:</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="collapsed-item">
            <span className="collapsed-label">Completed ({thisYear}):</span>
            <strong>{completedThisYear}</strong>
          </div>
          <div className="collapsed-item">
            <span className="collapsed-label">Reading:</span>
            <strong>{readingCount}</strong>
          </div>
          <div className="collapsed-item">
            <span className="collapsed-label">Avg Rating:</span>
            <strong>{avgRating}★</strong>
          </div>
          <div className="collapsed-item">
            <span className="collapsed-label">Goal:</span>
            <strong>
              {completedThisYear} / {goal ?? 30} ({goalPct}%)
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

