'use client';

import { Book } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

const STATUS_CLASS: Record<string, string> = {
  Reading: 'reading',
  Completed: 'completed',
  'Plan to Read': 'plan',
  'On Hold': 'hold',
  Dropped: 'dropped',
};

export default function BookTable({
  books,
  ratingMode,
  onEdit,
  onDelete,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  if (books.length === 0) {
    return <p className="subtitle">No entries match your filters.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Author</th>
            <th>Status</th>
            <th>Rating</th>
            <th>Progress</th>
            <th>Genre / Tags</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => {
            const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
            return (
              <tr key={b.id}>
                <td>
                  <strong>{b.title}</strong>
                  {b.source_link && (
                    <div style={{ fontSize: 11, color: '#8a8880' }}>{b.source_link}</div>
                  )}
                </td>
                <td>{b.type}</td>
                <td>{b.author || '—'}</td>
                <td><span className={`badge ${STATUS_CLASS[b.status] || 'plan'}`}>{b.status}</span></td>
                <td><RatingDisplay rating={b.rating} mode={ratingMode} /></td>
                <td>
                  {b.total_units ? (
                    <>
                      <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
                      <div style={{ fontSize: 11, color: '#8a8880', marginTop: 2 }}>
                        {b.progress ?? 0}/{b.total_units} ({pct}%)
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12 }}>{b.progress ?? 0} units</span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: '#6b6b6b' }}>{b.genre_tags || '—'}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn secondary" onClick={() => onEdit(b)}>Edit</button>
                    <button className="btn danger" onClick={() => onDelete(b)}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
