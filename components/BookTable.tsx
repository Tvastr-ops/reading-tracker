'use client';

import { Book, SortField, SortDir, STATUSES, STATUS_COLOR_VAR } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

// The full URL/path was always shown, unconditionally — a long path could
// take two lines every row just for a secondary field. Showing only the
// hostname is enough to recognize the source at a glance.
function hostnameOf(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Same idea for genre/tag lists — some entries have 5-6 tags, all shown in
// full on every row regardless of how many. Cap the visible count.
function truncateTags(tags: string, max = 3): string {
  const list = tags.split(',').map((t) => t.trim()).filter(Boolean);
  if (list.length <= max) return list.join(', ');
  return `${list.slice(0, max).join(', ')} +${list.length - max} more`;
}

export default function BookTable({
  books,
  ratingMode,
  sortField,
  sortDir,
  onSort,
  trashMode = false,
  hasAnyBooks = true,
  selectMode = false,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
  onQuickStatus,
  focusedId = null,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  trashMode?: boolean;
  hasAnyBooks?: boolean;
  selectMode?: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
  onRestore?: (b: Book) => void;
  onPermanentDelete?: (b: Book) => void;
  onQuickStatus: (b: Book) => void;
  focusedId?: string | null;
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
            <th className={`checkbox-cell${selectMode ? '' : ' collapsed'}`} style={{ width: 24 }}></th>
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
            const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
            const nextStatus = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
            return (
              <tr
                key={b.id}
                data-row-id={b.id}
                className={b.id === focusedId ? 'row-focused' : ''}
                style={{ '--row-status-color': statusColor } as React.CSSProperties}
              >
                <td className={`checkbox-cell${selectMode ? '' : ' collapsed'}`}>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => onToggleSelect(b.id)}
                    aria-label={`Select ${b.title}`}
                  />
                </td>
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
                    <div className="label source-link" style={{ fontSize: 11 }}>{hostnameOf(b.source_link)}</div>
                  )}
                </td>
                <td data-label="Type">{b.type}</td>
                <td data-label="Author">{b.author || '—'}</td>
                <td data-label="Status">
                  <span
                    className="status-text"
                    onClick={() => !trashMode && onQuickStatus(b)}
                    title={trashMode ? undefined : `Click to mark as "${nextStatus}"`}
                  >
                    {b.status}
                  </span>
                </td>
                <td data-label="Rating"><RatingDisplay rating={b.rating} mode={ratingMode} /></td>
                <td data-label="Progress">
                  {b.total_units ? (
                    <>
                      <div className="progress-bar"><div className={pct != null && pct >= 90 ? 'near-complete' : ''} style={{ width: `${pct}%` }} /></div>
                      <div className="label" style={{ fontSize: 11, marginTop: 2 }}>
                        {b.progress ?? 0}/{b.total_units} ({pct}%)
                        {b.status === 'Reading' && b.reading_pace != null && ` · ~${b.reading_pace}/wk`}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12 }}>{b.progress ?? 0} units</span>
                  )}
                </td>
                <td data-label="Genre / Tags" className="label" style={{ fontSize: 12 }} title={b.genre_tags || undefined}>
                  {b.genre_tags ? truncateTags(b.genre_tags) : '—'}
                </td>
                <td data-label="Finished" className="label" style={{ fontSize: 12 }}>{b.date_finished || '—'}</td>
                <td>
                  <div className="row-actions">
                    {trashMode ? (
                      <>
                        <button className="btn secondary compact" onClick={() => onRestore?.(b)}>Restore</button>
                        <button className="btn danger compact" onClick={() => onPermanentDelete?.(b)}>Delete forever</button>
                      </>
                    ) : (
                      <>
                        <button className="btn secondary compact" onClick={() => onEdit(b)}>Edit</button>
                        <button className="btn danger compact" onClick={() => onDelete(b)}>Delete</button>
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