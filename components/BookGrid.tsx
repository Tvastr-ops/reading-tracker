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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(125px,1fr))] gap-[var(--space-3)] relative items-stretch">
      {/* Tap backdrop to dismiss active card overlay */}
      {activeTileId && (
        <div
          className="fixed inset-0 z-[1]"
          onClick={closeOverlay}
        />
      )}
      {books.map((b) => {
        const statusColor = STATUS_COLOR_VAR[b.status] || 'var(--border)';
        const pct = b.total_units ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100)) : null;
        const isActive = activeTileId === b.id;

        return (
          <div key={b.id} className="relative z-[2] flex flex-col h-full">
            <div
              className={`flex flex-col items-start text-left bg-card-bg border border-border-main border-l-[3px] rounded-[var(--radius-md)] p-[var(--space-2)] cursor-pointer font-inherit color-inherit overflow-hidden w-full h-full transition-[transform,box-shadow] duration-[150ms] ease-out hover:-translate-y-[2px] hover:shadow-[var(--shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-star-filled focus-visible:outline-offset-2 ${isActive ? 'bg-row-hover' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleTileTap(b)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(b); }
              }}
              style={{
                '--row-status-color': statusColor,
                borderLeftColor: 'var(--row-status-color)',
              } as React.CSSProperties}
              title={b.title}
            >
              <div className="relative w-full aspect-[2/3] overflow-hidden rounded-[2px] mb-[var(--space-2)] shrink-0">
                {b.cover_url ? (
                  <img src={b.cover_url} alt="" className="w-full h-full object-cover block book-cover" />
                ) : (
                  <div className="w-full h-full object-cover block placeholder-box" />
                )}

                {/* Active Tile Overlay with Direct Action Buttons */}
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center p-[var(--space-3)] bg-[rgba(15,10,5,0.65)] backdrop-blur-[3px] z-[2]">
                    <div className="flex flex-col w-[72%] max-w-[130px] bg-card-bg border border-border-main rounded-[var(--radius-md)] shadow-[var(--shadow-modal)] overflow-hidden animate-[fadeIn_0.12s_ease_both]">
                      <button
                        type="button"
                        className="flex items-center justify-center w-full bg-transparent border-none text-text-main text-[14px] font-semibold py-2.5 px-3.5 cursor-pointer transition-colors duration-[100ms] ease-out hover:bg-row-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeOverlay();
                          onEdit(b);
                        }}
                      >
                        Edit
                      </button>
                      <div className="w-full h-[1px] bg-border-soft" />
                      <button
                        type="button"
                        className="flex items-center justify-center w-full bg-transparent border-none text-danger text-[14px] font-semibold py-2.5 px-3.5 cursor-pointer transition-colors duration-[100ms] ease-out hover:bg-row-hover"
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

              <div className="text-[13px] leading-[1.35] line-clamp-2 overflow-hidden min-h-[2.7em] break-words w-full book-title">{b.title}</div>
              {b.author && <div className="text-[11px] mt-[2px] whitespace-nowrap overflow-hidden text-ellipsis w-full label">{b.author}</div>}

              <div className="mt-auto w-full flex flex-col gap-1 pt-[var(--space-2)]">
                <div className="flex justify-between items-center w-full">
                  <span className="status-text text-[10px]">
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
