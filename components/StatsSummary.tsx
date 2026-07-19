'use client';

import { Book, STATUSES } from '@/lib/types';

export default function StatsSummary({ books }: { books: Book[] }) {
  const byStatus: Record<string, number> = {};
  for (const s of STATUSES) byStatus[s] = 0;
  for (const b of books) byStatus[b.status] = (byStatus[b.status] || 0) + 1;

  const rated = books.filter((b) => b.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
    : '—';

  const completedThisYear = books.filter((b) => {
    if (b.status !== 'Completed' || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === new Date().getFullYear();
  }).length;

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
    </div>
  );
}
