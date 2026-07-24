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
  // Which tile is currently showing its Edit/⋮ overlay. Tapping a tile
  // toggles this rather than opening the modal directly — a tiny
  // always-visible corner button was a precision problem on touch, so the
  // whole tile is the tap target instead. The overlay sits on top of the
  // cover art (not in place of the title/author/rating/progress below it)
  // so a tile's height never changes between states — an earlier version
  // replaced the metadata with the overlay, which made the grid's rows
  // jump/misalign whenever a tile was active.
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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
    // Double-tap the tile itself as a shortcut straight to editing —
    // bypasses the reveal step for anyone who knows the gesture. The
    // visible "Edit" button (below) is the reliable, discoverable path;
    // this is just a bonus.
    if (last && last.id === b.id && now - last.time < DOUBLE_TAP_MS) {
      lastTap.current = null;
      setActiveTileId(null);
      setOpenMenuId(null);
      onEdit(b);
      return;
    }
    lastTap.current = { id: b.id, time: now };
    // Any tap on a tile body closes a lingering dropdown from any tile —
    // otherwise tapping "elsewhere" only hid the Edit/⋮ row (via
    // activeTileId below) while the dropdown itself, having no trigger
    // button left to toggle it, stayed stuck open indefinitely.
    setOpenMenuId(null);
    setActiveTileId((cur) => (cur === b.id ? null : b.id));
  }

  return (
    <div className="book-grid">
      {/* Closes the active tile's overlay, or an open ⋮ menu, on outside
          tap. Every tile sits above this in z-index (see .grid-tile-wrap
          in globals.css) — without that, this backdrop would intercept
          taps meant for a tile's own buttons instead of the tile getting
          them, since it's the only element here with an explicit z-index. */}
      {(activeTileId || openMenuId) && (
        <div
          className="grid-menu-backdrop"
          onClick={() => { setActiveTileId(null); setOpenMenuId(null); }}
        />
      )}
      {books.map((b) => {
        const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
        const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
        const isActive = activeTileId === b.id;
        const menuOpen = openMenuId === b.id;

        return (
          <div key={b.id} className="grid-tile-wrap">
            <div
              className={`grid-tile${isActive ? ' action-mode' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleTileTap(b)}
              onKeyDown={(e) => {
                // Keyboard users get the direct behavior (no reveal step —
                // there's no touch precision problem to solve for them).
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
                {isActive && (
                  <div className="grid-cover-overlay">
                    <button
                      type="button"
                      className="btn secondary compact"
                      onClick={(e) => { e.stopPropagation(); setActiveTileId(null); onEdit(b); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="grid-tile-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : b.id); }}
                      aria-label={`More actions for ${b.title}`}
                      aria-expanded={menuOpen}
                    >
                      ⋮
                    </button>
                  </div>
                )}
                {menuOpen && (
                  <div className="grid-tile-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setOpenMenuId(null); setActiveTileId(null); onEdit(b); }}>Edit</button>
                    <button type="button" className="danger-text" onClick={() => { setOpenMenuId(null); setActiveTileId(null); onDelete(b); }}>Delete</button>
                  </div>
                )}
              </div>

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
              {b.status === 'Reading' && b.reading_pace != null && (
                <div className="label" style={{ fontSize: 10, marginTop: 3 }}>~{b.reading_pace}/wk</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
