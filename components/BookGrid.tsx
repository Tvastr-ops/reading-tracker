'use client';

import { Book, STATUS_COLOR_VAR } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

export default function BookGrid({
  books,
  ratingMode,
  hasAnyBooks = true,
  onEdit,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  hasAnyBooks?: boolean;
  onEdit: (b: Book) => void;
}) {
  if (books.length === 0) {
    const message = !hasAnyBooks
      ? 'Nothing on the shelf yet — add your first book to get started.'
      : 'No entries match your filters.';
    return <p className="empty-state">{message}</p>;
  }

  return (
    <div className="book-grid">
      {books.map((b) => {
        const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
        const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
        return (
          <button
            key={b.id}
            className="grid-tile"
            onClick={() => onEdit(b)}
            style={{ '--row-status-color': statusColor } as React.CSSProperties}
            title={b.title}
          >
            {b.cover_url ? (
              <img src={b.cover_url} alt="" className="grid-cover book-cover" />
            ) : (
              <div className="grid-cover placeholder-box" />
            )}
            <div className="grid-tile-title book-title">{b.title}</div>
            {b.author && <div className="grid-tile-author label">{b.author}</div>}
            <div className="grid-tile-meta">
              <span className="status-text" style={{ fontSize: 10 }}>{b.status}</span>
              <RatingDisplay rating={b.rating} mode={ratingMode} />
            </div>
            {pct != null && (
              <div className="progress-bar" style={{ width: '100%', marginTop: 6 }}>
                <div className={pct >= 90 ? 'near-complete' : ''} style={{ width: `${pct}%` }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
