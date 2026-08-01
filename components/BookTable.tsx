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
        className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em] cursor-pointer select-none"
        title={`Sort by ${label}`}
      >
        {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={`checkbox-cell ${selectMode ? '' : 'collapsed'} text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]`} style={{ width: 24 }}></th>
            <th className="spine-col p-0 w-1 text-left border-b border-border-soft align-middle"></th>
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]" style={{ width: 36 }}></th>
            {headerFor('title', 'Title')}
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]">Type</th>
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]">Author</th>
            {headerFor('status', 'Status')}
            {headerFor('rating', 'Rating')}
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]">Progress</th>
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]">Genre / Tags</th>
            {headerFor('date_finished', 'Finished')}
            <th className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-text-muted font-semibold text-[12px] uppercase tracking-[0.02em]"></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => {
            const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
            const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
            const nextStatus = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
            const isFocused = b.id === focusedId;

            return (
              <tr
                key={b.id}
                data-row-id={b.id}
                className={`transition-[background-color,border-color] duration-[150ms] ease-out hover:bg-row-hover [&:hover>td]:bg-row-hover [&:focus-within>td]:bg-row-hover ${isFocused ? 'row-focused shadow-[inset_0_0_0_2px_var(--star-filled)] [&>td]:bg-row-hover' : ''}`}
                style={{
                  '--row-status-color': statusColor,
                  borderColor: isFocused ? 'var(--star-filled)' : undefined,
                } as React.CSSProperties}
              >
                <td className={`checkbox-cell ${selectMode ? '' : 'collapsed'} text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle`}>
                  <input
                    type="checkbox"
                    className="row-checkbox cursor-pointer"
                    checked={selected.has(b.id)}
                    onChange={() => onToggleSelect(b.id)}
                    aria-label={`Select ${b.title}`}
                  />
                </td>
                <td className="spine-cell p-0 w-1 text-left border-b border-border-soft align-middle">
                  <span
                    className="block w-1 h-full min-h-[28px] rounded-r-[2px] bg-[var(--row-status-color,var(--border))]"
                    style={{ backgroundColor: 'var(--row-status-color)' }}
                  />
                </td>
                <td className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt="" width={28} height={40} className="object-cover book-cover" />
                  ) : (
                    <div className="w-7 h-10 placeholder-box" />
                  )}
                </td>
                <td className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  <strong className="font-serif font-semibold text-text-main book-title">{b.title}</strong>
                  {b.source_link && (
                    <div className="text-[11px] text-text-muted whitespace-nowrap overflow-hidden text-ellipsis w-full label source-link">
                      {hostnameOf(b.source_link)}
                    </div>
                  )}
                </td>
                <td data-label="Type" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">{b.type}</td>
                <td data-label="Author" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">{b.author || '—'}</td>
                <td data-label="Status" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  <span
                    className="text-[12px] cursor-pointer hover:underline status-text"
                    onClick={() => !trashMode && onQuickStatus(b)}
                    title={trashMode ? undefined : `Click to mark as "${nextStatus}"`}
                  >
                    {b.status}
                  </span>
                </td>
                <td data-label="Rating" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  <RatingDisplay rating={b.rating} mode={ratingMode} />
                </td>
                <td data-label="Progress" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  {b.total_units ? (
                    <>
                      <div className="w-full h-2 bg-progress-track rounded-full overflow-hidden progress-bar">
                        <div
                          className={`h-full bg-status-reading ${pct != null && pct >= 90 ? 'bg-status-completed' : ''}`}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct != null && pct >= 90 ? 'var(--status-completed)' : 'var(--status-reading)',
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5 label">
                        {b.progress ?? 0}/{b.total_units} ({pct}%)
                        {b.status === 'Reading' && b.reading_pace != null && ` · ~${b.reading_pace}/wk`}
                      </div>
                    </>
                  ) : (
                    <span className="text-[12px]">{b.progress ?? 0} units</span>
                  )}
                </td>
                <td data-label="Genre / Tags" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-[12px] text-text-muted label" title={b.genre_tags || undefined}>
                  {b.genre_tags ? truncateTags(b.genre_tags) : '—'}
                </td>
                <td data-label="Finished" className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle text-[12px] text-text-muted label">{b.date_finished || '—'}</td>
                <td className="text-left py-[var(--space-2)] px-[var(--space-3)] border-b border-border-soft align-middle">
                  <div className="flex gap-2 row-actions">
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