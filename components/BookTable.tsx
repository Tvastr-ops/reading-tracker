'use client';

import { Book, SortField, SortDir } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

const STATUS_VAR: Record<string, string> = {
  Reading: 'var(--status-reading)',
  Completed: 'var(--status-completed)',
  'Plan to Read': 'var(--status-plan)',
  'On Hold': 'var(--status-hold)',
  Dropped: 'var(--status-dropped)',
};

const SORTABLE: { field: SortField; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'status', label: 'Status' },
  { field: 'rating', label: 'Rating' },
  { field: 'date_finished', label: 'Finished' },
  { field: 'updated_at', label: 'Updated' },
];

export default function BookTable({
  books,
  ratingMode,
  sortField,
  sortDir,
  onSort,
  trashMode = false,
  hasAnyBooks = true,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  trashMode?: boolean;
  hasAnyBooks?: boolean;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
}) {
  if (books.length === 0) {
    let message = 'No entries match your filters.';
    if (trashMode) message = 'Nothing in the trash.';
    else if (!hasAnyBooks) message = 'Nothing on the shelf yet — add your first book to get started.';
    return <p className="empty-state">{message}</p>;
  }

  function headerFor(field: SortField, label: string) {
    const active = sortField === field;
    return (
      <th
        key={field}
        onClick={() => onSort(field)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title={`Sort by ${label}`}
      >
        {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th className="spine-col"></th>
            <th style={{ width: 36 }}></th>
            {headerFor('title', 'Title')}
            <th>Type</th>
            <th>Author</th>
            {headerFor('status', 'Status')}
            {headerFor('rating', 'Rating')}
            <th>Progress</th>
            <th>Genre / Tags</th>
            {headerFor('date_finished', 'Finished')}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => {
            const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
            const statusColor = STATUS_VAR[b.status] || 'var(--border)';
            return (
              <tr key={b.id} style={{ '--row-status-color': statusColor } as React.CSSProperties}>
                <td className="spine-cell"><span className="spine" /></td>
                <td>
                  {b.cover_url ? (
                    <img src={b.cover_url} alt="" width={28} height={40} className="book-cover" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="placeholder-box" style={{ width: 28, height: 40 }} />
                  )}
                </td>
                <td>
                  <strong className="book-title">{b.title}</strong>
                  {b.source_link && (
                    <div className="label" style={{ fontSize: 11 }}>{b.source_link}</div>
                  )}
                </td>
                <td data-label="Type">{b.type}</td>
                <td data-label="Author">{b.author || '—'}</td>
                <td data-label="Status"><span className="status-text">{b.status}</span></td>
                <td data-label="Rating"><RatingDisplay rating={b.rating} mode={ratingMode} /></td>
                <td data-label="Progress">
                  {b.total_units ? (
                    <>
                      <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
                      <div className="label" style={{ fontSize: 11, marginTop: 2 }}>
                        {b.progress ?? 0}/{b.total_units} ({pct}%)
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12 }}>{b.progress ?? 0} units</span>
                  )}
                </td>
                <td data-label="Genre / Tags" className="label" style={{ fontSize: 12 }}>{b.genre_tags || '—'}</td>
                <td data-label="Finished" className="label" style={{ fontSize: 12 }}>{b.date_finished || '—'}</td>
                <td>
                  <div className="row-actions">
                    {trashMode ? (
                      <>
                        <button className="btn secondary" onClick={() => onRestore?.(b)}>Restore</button>
                        <button className="btn danger" onClick={() => onPermanentDelete?.(b)}>Delete forever</button>
                      </>
                    ) : (
                      <>
                        <button className="btn secondary" onClick={() => onEdit(b)}>Edit</button>
                        <button className="btn danger" onClick={() => onDelete(b)}>Delete</button>
                      </>
                    )}
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
