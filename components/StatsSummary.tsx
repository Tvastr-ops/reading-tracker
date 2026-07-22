'use client';

import { useEffect, useState } from 'react';
import { Book, STATUSES } from '@/lib/types';
import { BarChart } from './BarChart';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function StatsSummary({ books }: { books: Book[] }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.yearlyGoal != null) setGoal(d.yearlyGoal); })
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
    if (res.ok) { setGoal(n); setEditingGoal(false); }
  }

  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  for (const b of books) byStatus[b.status] = (byStatus[b.status] || 0) + 1;

  const rated = books.filter((b) => b.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const thisYear = new Date().getFullYear();
  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === thisYear;
  }).length;

  // Books completed per month, this year — computed live, nothing extra stored.
  const perMonth = Array.from({ length: 12 }, (_, m) => {
    const count = books.filter((b) => {
      if (b.status !== 'Completed' || !b.date_finished) return false;
      const d = new Date(b.date_finished);
      return d.getFullYear() === thisYear && d.getMonth() === m;
    }).length;
    return { label: MONTH_LABELS[m], value: count };
  });

  // Rating distribution (rounded to whole stars for readability).
  const ratingBuckets = [1, 2, 3, 4, 5].map((star) => ({
    label: `${star}★`,
    value: books.filter((b) => b.rating != null && Math.round(b.rating) === star).length,
  }));

  const goalPct = goal ? Math.min(100, Math.round((completedThisYear / goal) * 100)) : 0;

  return (
    <div className="card">
      <h2>Summary</h2>
      <div className="summary-grid">
        {STATUSES.map((s) => (
          <div className="summary-tile" key={s}>
            <div className="num">{byStatus[s]}</div>
            <div className="label">{s}</div>
          </div>
        ))}
        <div className="summary-tile">
          <div className="num">{avgRating}</div>
          <div className="label">Avg rating</div>
        </div>
        <div className="summary-tile">
          <div className="num">{completedThisYear}</div>
          <div className="label">Completed this year</div>
        </div>
        <div className="summary-tile">
          <div className="num">{books.length}</div>
          <div className="label">Total entries</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {goal == null && !editingGoal && (
          <button className="btn secondary" onClick={() => setEditingGoal(true)}>
            Set a yearly reading goal
          </button>
        )}
        {goal != null && !editingGoal && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{thisYear} goal: {completedThisYear} / {goal}</span>
              <button className="mono-btn" style={{ fontSize: 12, textDecoration: 'underline' }} onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}>
                edit
              </button>
            </div>
            <div className="progress-bar" style={{ width: '100%' }}>
              <div style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        )}
        {editingGoal && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              placeholder="e.g. 30"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              style={{ width: 100, padding: '6px 8px', border: '1px solid var(--input-border)', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)' }}
            />
            <button className="btn" disabled={savingGoal} onClick={saveGoal}>Save</button>
            <button className="btn secondary" onClick={() => setEditingGoal(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Completed per month ({thisYear})</div>
          <BarChart title={`Books completed per month, ${thisYear}`} data={perMonth} />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Rating distribution</div>
          <BarChart title="Rating distribution" data={ratingBuckets} />
        </div>
      </div>
    </div>
  );
}
