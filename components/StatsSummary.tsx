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

  const compPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const readPct = totalCount ? Math.round((readingCount / totalCount) * 100) : 0;
  const holdPct = totalCount ? Math.round((onHoldCount / totalCount) * 100) : 0;
  const planPct = totalCount ? Math.round((planToReadCount / totalCount) * 100) : 0;

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
    const percentage = rated.length ? Math.round((count / totalRated) * 100) : 0;
    return { star, count, percentage };
  });

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const count = books.filter((b) => {
        if (!b.date_finished) return false;
        const d = new Date(b.date_finished);
        return d.getFullYear() === thisYear && d.getMonth() === m;
      }).length;
      return { monthName: MONTH_NAMES[m], label: MONTH_LABELS[m], count };
    });
  }, [books, thisYear]);

  const currentMonthIdx = new Date().getMonth() + 1;
  const avgPacePerMonth = (completedThisYear / Math.max(currentMonthIdx, 1)).toFixed(1);
  const targetGoal = goal ?? 30;
  const requiredPace = (targetGoal / 12).toFixed(1);
  const isOnTrack = Number(avgPacePerMonth) >= Number(requiredPace);

  const goalPct = goal ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0;

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;

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
                {compPct >= 8 && <span>{completedCount}</span>}
              </div>
              <div className="segment seg-reading" style={{ width: `${readPct}%` }}>
                {readPct >= 8 && <span>{readingCount}</span>}
              </div>
              <div className="segment seg-hold" style={{ width: `${holdPct}%` }}>
                {holdPct >= 8 && <span>{onHoldCount}</span>}
              </div>
              <div className="segment seg-plan" style={{ width: `${planPct}%` }}>
                {planPct >= 8 && <span>{planToReadCount}</span>}
              </div>
            </div>

            <div className="stacked-pct-labels">
              <span style={{ width: `${compPct}%`, textAlign: 'center' }}>{compPct > 0 ? `${compPct}%` : ''}</span>
              <span style={{ width: `${readPct}%`, textAlign: 'center' }}>{readPct > 0 ? `${readPct}%` : ''}</span>
              <span style={{ width: `${holdPct}%`, textAlign: 'center' }}>{holdPct > 0 ? `${holdPct}%` : ''}</span>
              <span style={{ width: `${planPct}%`, textAlign: 'center' }}>{planPct > 0 ? `${planPct}%` : ''}</span>
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

          {/* CARD 2: MINI SHELF */}
          <div className="dash-card">
            <div className="dash-card-header-row">
              <div className="dash-card-title">MINI SHELF ({thisYear})</div>
              <span className={`pace-badge ${isOnTrack ? 'on-track' : 'behind'}`}>
                {isOnTrack ? '⚡ On Track' : '📈 Pace Push'}
              </span>
            </div>

            <div className="mini-shelf-container">
              <div className="shelf-grid">
                {monthlyData.map((d, mIdx) => {
                  const visibleSpinesCount = Math.min(d.count, 4);

                  return (
                    <div
                      key={mIdx}
                      className="shelf-month-col"
                      title={`${d.monthName}: ${d.count} ${d.count === 1 ? 'book' : 'books'} completed`}
                    >
                      <div className="shelf-space">
                        {d.count === 0 ? (
                          <div className="shelf-empty-book" />
                        ) : (
                          <div className="spine-stack">
                            {Array.from({ length: visibleSpinesCount }).map((_, spineIdx) => {
                              const spineColor = SPINE_COLORS[(mIdx + spineIdx * 2) % SPINE_COLORS.length];
                              const heightPct = 68 + ((mIdx * 11 + spineIdx * 17) % 28);

                              return (
                                <div
                                  key={spineIdx}
                                  className="mini-book-spine"
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: spineColor,
                                  }}
                                >
                                  <span className="spine-rib" />
                                </div>
                              );
                            })}
                            {d.count > 4 && (
                              <span className="spine-overflow-badge">+{d.count - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="month-tag">{d.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bookshelf-ledge" />
            </div>

            <div className="goal-velocity-row">
              <div className="ring-container">
                <svg className="radial-ring" viewBox="0 0 80 80">
                  <circle className="ring-bg" cx="40" cy="40" r={radius} />
                  <circle
                    className="ring-fill"
                    cx="40"
                    cy="40"
                    r={radius}
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: strokeDashoffset,
                    }}
                  />
                </svg>
                <div className="ring-text">
                  <span className="ring-pct">{goalPct}%</span>
                </div>
              </div>

              <div className="goal-details">
                {!editingGoal ? (
                  <div className="goal-text-box">
                    <div className="goal-title-row">
                      <span>{thisYear} Goal</span>
                      <button
                        className="goal-edit-btn"
                        onClick={() => {
                          setGoalInput(String(targetGoal));
                          setEditingGoal(true);
                        }}
                      >
                        edit
                      </button>
                    </div>
                    <div className="goal-count-big">
                      <strong>{completedThisYear}</strong> / {targetGoal} books
                    </div>
                    <div className="velocity-sub">
                      Pace: <strong>{avgPacePerMonth}</strong> bks/mo (Req: {requiredPace})
                    </div>
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
              </div>
            </div>
          </div>

          {/* CARD 3: RATING DISTRIBUTION */}
          <div className="dash-card">
            <div className="dash-card-title">RATING DISTRIBUTION</div>

            <div className="rating-dist-list">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className={`rating-dist-row ${count === 0 ? 'zero-count' : ''}`}>
                  <span className="star-label">{star}★</span>
                  
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="rating-metrics">
                    <span className="count-tag">{count}x</span>
                    <span className="pct-tag">({percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
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
              {completedThisYear} / {targetGoal} ({goalPct}%)
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

