'use client';

import { useEffect, useState } from 'react';
import { Book } from '@/lib/types';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function StatsSummary({ books }: { books: Book[] }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  
  // State for collapsible dashboard stats
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

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

  // Status counts
  const completedCount = books.filter((b) => b.status === 'Completed').length;
  const readingCount = books.filter((b) => b.status === 'Reading').length;
  const onHoldCount = books.filter((b) => b.status === 'On Hold').length;
  const planToReadCount = books.filter((b) => b.status === 'Plan to Read').length;

  // Status percentages for breakdown bar
  const compPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const readPct = totalCount ? Math.round((readingCount / totalCount) * 100) : 0;
  const holdPct = totalCount ? Math.round((onHoldCount / totalCount) * 100) : 0;
  const planPct = totalCount ? Math.round((planToReadCount / totalCount) * 100) : 0;

  // Average Rating
  const rated = books.filter((b) => b.rating != null && b.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const thisYear = new Date().getFullYear();
  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === thisYear;
  }).length;

  // Heatmap generation (7 rows x 12 months)
  const heatmapData = Array.from({ length: 12 }, (_, monthIdx) => {
    return Array.from({ length: 7 }, (_, dayIdx) => {
      const count = books.filter((b) => {
        if (!b.date_finished) return false;
        const d = new Date(b.date_finished);
        return (
          d.getFullYear() === thisYear &&
          d.getMonth() === monthIdx &&
          d.getDate() % 7 === dayIdx
        );
      }).length;
      return count;
    });
  });

  const getHeatmapColorClass = (count: number) => {
    if (count === 0) return 'hm-0';
    if (count <= 2) return 'hm-1';
    if (count <= 5) return 'hm-2';
    if (count <= 9) return 'hm-3';
    return 'hm-4';
  };

  // Rating Distribution (5 stars down to 1 star)
  const totalRated = rated.length || 1;
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = books.filter(
      (b) => b.rating != null && Math.round(b.rating) === star
    ).length;
    const percentage = Math.round((count / totalRated) * 100);
    return { star, count, percentage };
  });

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

      {/* Expanded Detailed Grid */}
      {isExpanded ? (
        <div className="dashboard-grid fade-in">
          {/* CARD 1: STATUS BREAKDOWN */}
          <div className="dash-card">
            <div className="dash-card-title">STATUS BREAKDOWN</div>

            <div className="stacked-progress-bar">
              <div
                className="segment seg-completed"
                style={{ width: `${compPct}%` }}
              >
                {completedCount > 0 && <span>{completedCount}</span>}
              </div>
              <div
                className="segment seg-reading"
                style={{ width: `${readPct}%` }}
              >
                {readingCount > 0 && <span>{readingCount}</span>}
              </div>
              <div
                className="segment seg-hold"
                style={{ width: `${holdPct}%` }}
              >
                {onHoldCount > 0 && <span>{onHoldCount}</span>}
              </div>
              <div
                className="segment seg-plan"
                style={{ width: `${planPct}%` }}
              >
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
                <span>Completed</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-reading" />
                <span>Reading</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-hold" />
                <span>On Hold</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-plan" />
                <span>Plan to Read</span>
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

          {/* CARD 2: READING ACTIVITY HEATMAP (YTD) */}
          <div className="dash-card">
            <div className="dash-card-title">READING ACTIVITY HEATMAP (YTD)</div>

            <div className="heatmap-months">
              {MONTH_LABELS.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>

            <div className="heatmap-matrix">
              {Array.from({ length: 7 }).map((_, rowIdx) => (
                <div key={rowIdx} className="heatmap-row">
                  {heatmapData.map((monthData, colIdx) => {
                    const val = monthData[rowIdx];
                    return (
                      <div
                        key={colIdx}
                        className={`hm-cell ${getHeatmapColorClass(val)}`}
                        title={`${val} books`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="heatmap-legend">
              <span>Legend:</span>
              <span className="hm-sample hm-0" /> 0
              <span className="hm-sample hm-1" /> 1-2
              <span className="hm-sample hm-2" /> 3-5
              <span className="hm-sample hm-3" /> 6-9
              <span className="hm-sample hm-4" /> 10+ books
            </div>

            <div className="yearly-goal-section">
              {!editingGoal ? (
                <div className="goal-display">
                  <span>
                    {thisYear} goal: {completedThisYear} / {goal ?? 30}
                  </span>
                  <button
                    className="goal-edit-btn"
                    onClick={() => {
                      setGoalInput(String(goal ?? 30));
                      setEditingGoal(true);
                    }}
                    title="Edit yearly goal"
                  >
                    ✏️
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
        /* Collapsed Compact View */
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
            <span className="collapsed-label">Goal ({thisYear}):</span>
            <strong>
              {completedThisYear} / {goal ?? 30} ({goalPct}%)
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

