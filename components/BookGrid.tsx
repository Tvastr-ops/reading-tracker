'use client';

import { useRef, useState } from 'react';
import { Book, STATUS_COLOR_VAR } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

const DOUBLE_TAP_MS = 350;

export default function BookGrid({
  books,
  ratingMode,
  hasAnyBooks = true,
  onEdit,
  onDelete,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  hasAnyBooks?: boolean;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const lastTap = useRef<{ id: string; time: number } | null>(null);

  if (books.length === 0) {
    const message = !hasAnyBooks
      ? 'Nothing on the shelf yet — add your first book to get started.'
      : 'No entries match your filters.';
    return <p className="empty-state">{message}</p>;
  }

  function handleTileTap(b: Book) {
    const now = Date.now();
    const last = lastTap.current;

    // Double tap direct edit shortcut
    if (last && last.id === b.id && now - last.time < DOUBLE_TAP_MS) {
      lastTap.current = null;
      setActiveTileId(null);
      onEdit(b);
      return;
    }
    lastTap.current = { id: b.id, time: now };

    // Toggle active card overlay
    setActiveTileId((cur) => (cur === b.id ? null : b.id));
  }

  function closeOverlay() {
    setActiveTileId(null);
  }

  return (
    <div className="book-grid">
      {/* Tap backdrop to dismiss active card overlay */}
      {activeTileId && (
        <div
          className="grid-menu-backdrop"
          onClick={closeOverlay}
        />
      )}
      {books.map((b) => {
        const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
        const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
        const isActive = activeTileId === b.id;

        return (
          <div key={b.id} className="grid-tile-wrap">
            <div
              className={`grid-tile${isActive ? ' action-mode' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleTileTap(b)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(b); }
              }}
              style={{ '--row-status-color': statusColor } as React.CSSProperties}
              title={b.title}
            >
              <div className="grid-cover-wrap">
                {b.cover_url ? (
                  <img src={b.cover_url} alt="" className="grid-cover book-cover" />
                ) : (
                  <div className="grid-cover placeholder-box" />
                )}

                {/* Active Tile Overlay with Direct Action Buttons */}
                {isActive && (
                  <div className="grid-cover-overlay">
                    <div className="pill-action-bar">
                      <button
                        type="button"
                        className="pill-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeOverlay();
                          onEdit(b);
                        }}
                      >
                        Edit
                      </button>
                      <div className="pill-divider" />
                      <button
                        type="button"
                        className="pill-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeOverlay();
                          onDelete(b);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid-tile-title book-title">{b.title}</div>
              {b.author && <div className="grid-tile-author label">{b.author}</div>}

              <div className="grid-tile-footer">
                <div className="grid-tile-meta">
                  <span className="status-text" style={{ fontSize: 10 }}>
                    {b.status}
                    {b.status === 'Reading' && b.reading_pace != null ? ` • ~${b.reading_pace}/wk` : ''}
                  </span>
                  <RatingDisplay rating={b.rating} mode={ratingMode} />
                </div>
                {pct != null && (
                  <div className="progress-bar" style={{ width: '100%', marginTop: 2 }}>
                    <div className={pct >= 90 ? 'near-complete' : ''} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
