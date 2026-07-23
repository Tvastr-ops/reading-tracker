'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Book, BookInput, STATUSES, SortField, SortDir } from '@/lib/types';
import BookTable from '@/components/BookTable';
import BookGrid from '@/components/BookGrid';
import BookForm from '@/components/BookForm';
import StatsSummary from '@/components/StatsSummary';
import Toast, { ToastState } from '@/components/Toast';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [ratingMode, setRatingMode] = useState<'stars' | 'decimal'>('stars');
  const [editing, setEditing] = useState<Partial<Book> | null | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showTrash, setShowTrash] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectMode, setSelectMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>(STATUSES[0]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [upNext, setUpNext] = useState<Book | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem('ratingMode');
    if (saved === 'decimal' || saved === 'stars') setRatingMode(saved);
    const savedView = window.localStorage.getItem('viewMode');
    if (savedView === 'grid' || savedView === 'table') setViewMode(savedView);
    // Status filter, search, and sort used to reset every visit — habitual
    // preferences (e.g. always sorting by rating) meant redoing the same
    // clicks every session.
    const savedStatus = window.localStorage.getItem('statusFilter');
    if (savedStatus) setStatusFilter(savedStatus);
    const savedSearch = window.localStorage.getItem('search');
    if (savedSearch != null) setSearch(savedSearch);
    const savedSortField = window.localStorage.getItem('sortField');
    if (savedSortField) setSortField(savedSortField as SortField);
    const savedSortDir = window.localStorage.getItem('sortDir');
    if (savedSortDir === 'asc' || savedSortDir === 'desc') setSortDir(savedSortDir);
    // layout.tsx already set the real data-theme attribute before paint
    // (avoids a flash); this just syncs React state to match it so the
    // toggle button shows the right icon.
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => { window.localStorage.setItem('statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { window.localStorage.setItem('search', search); }, [search]);
  useEffect(() => { window.localStorage.setItem('sortField', sortField); }, [sortField]);
  useEffect(() => { window.localStorage.setItem('sortDir', sortDir); }, [sortDir]);

  function toggleViewMode() {
    const next = viewMode === 'table' ? 'grid' : 'table';
    setViewMode(next);
    window.localStorage.setItem('viewMode', next);
    if (next === 'grid') { setSelectMode(false); setSelected(new Set()); }
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  useEffect(() => { load(); setSelected(new Set()); setSelectMode(false); }, [showTrash]);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/books${showTrash ? '?trash=1' : ''}`);
    if (res.status === 401) { router.push('/login'); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to load'); setLoading(false); return; }
    setBooks(data.books);
    setLoading(false);
  }

  function toggleRatingMode() {
    const next = ratingMode === 'stars' ? 'decimal' : 'stars';
    setRatingMode(next);
    window.localStorage.setItem('ratingMode', next);
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  async function saveBook(data: BookInput) {
    const isEdit = editing && editing.id;
    const res = await fetch(isEdit ? `/api/books/${editing!.id}` : '/api/books', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Save failed');
    setEditing(undefined);
    load();
  }

  async function deleteBook(b: Book) {
    if (!confirm(`Move "${b.title}" to trash?`)) return;
    const res = await fetch(`/api/books/${b.id}`, { method: 'DELETE' });
    if (res.ok) {
      load();
      setToast({
        message: `Moved "${b.title}" to trash`,
        actionLabel: 'Undo',
        onAction: () => restoreBook(b),
      });
    }
  }

  async function restoreBook(b: Book) {
    const res = await fetch(`/api/books/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore: true }),
    });
    if (res.ok) load();
  }

  async function permanentlyDeleteBook(b: Book) {
    if (!confirm(`Permanently delete "${b.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/books/${b.id}?permanent=1`, { method: 'DELETE' });
    if (res.ok) load();
  }

  async function quickStatusChange(b: Book) {
    const next = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
    // Optimistic update so the click feels instant.
    setBooks((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: next } : x)));
    const res = await fetch(`/api/books/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) load(); // revert to server truth if it failed
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const result = await res.json();
      if (!res.ok) {
        setImportMsg(result.error || 'Import failed');
      } else {
        const parts = [`Imported ${result.imported} entries`];
        if (result.skippedRows?.length) parts.push(`skipped ${result.skippedRows.length} row(s) without a title`);
        if (result.skippedDuplicates) parts.push(`skipped ${result.skippedDuplicates} duplicate title(s)`);
        setImportMsg(parts.join(', ') + '.');
        load();
      }
    } catch {
      setImportMsg('Could not read that file.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: 'status' | 'delete' | 'restore' | 'delete_permanent') {
    if (selected.size === 0) return;
    if (action === 'delete_permanent' && !confirm(`Permanently delete ${selected.size} entries? This can't be undone.`)) return;
    const body: Record<string, unknown> = { action, ids: Array.from(selected) };
    if (action === 'status') body.status = bulkStatus;
    const res = await fetch('/api/books/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const count = selected.size;
      setSelected(new Set());
      load();
      if (action === 'delete') {
        setToast({ message: `Moved ${count} entries to trash`, actionLabel: undefined, onAction: undefined });
      }
    }
  }

  function pickUpNext() {
    const candidates = books.filter((b) => b.status === 'Plan to Read');
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setUpNext(pick);
  }

  async function startReadingUpNext() {
    if (!upNext) return;
    await quickStatusChangeById(upNext.id, 'Reading');
    setUpNext(null);
    load();
  }

  async function quickStatusChangeById(id: string, status: string) {
    await fetch(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  // Keyboard shortcuts: "/" focuses search, "n" opens the add-entry modal.
  // Ignored while typing in any field so normal typing (e.g. a note
  // containing the letter "n") is never hijacked. Escape-closes-modal is
  // handled by BookForm itself, not here — keeps this listener decoupled
  // from the modal's internals.
  // (keyboard shortcut effect moved below, after `filtered` is defined —
  // row navigation needs to read the current filtered/sorted list)

  const filtered = useMemo(() => {
    let list = books.filter((b) => {
      if (!showTrash && statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${b.title} ${b.author || ''} ${b.genre_tags || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'rating':
          cmp = (a.rating ?? -1) - (b.rating ?? -1);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'date_finished':
          cmp = (a.date_finished || '').localeCompare(b.date_finished || '');
          break;
        default:
          cmp = a.updated_at.localeCompare(b.updated_at);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [books, statusFilter, search, sortField, sortDir, showTrash]);

  // Reset the keyboard-nav cursor whenever the visible list changes shape
  // (new filter/search/sort, or switching library/trash) — an old index
  // could otherwise point at the wrong row after the list reorders.
  useEffect(() => { setFocusedIndex(-1); }, [filtered.length, statusFilter, search, sortField, sortDir, showTrash]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    document
      .querySelector(`[data-row-id="${filtered[focusedIndex]?.id}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, filtered]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (typing) return;

      // Table-only row navigation: Up/Down moves a highlighted row, Enter
      // opens it for editing. Disabled in grid view (no row concept there),
      // trash (different action set), and while the modal is open.
      const rowNavActive = viewMode === 'table' && !showTrash && editing === undefined;
      if (rowNavActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        setFocusedIndex((i) => {
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const next = i + delta;
          return Math.max(0, Math.min(filtered.length - 1, next < 0 ? 0 : next));
        });
        return;
      }
      if (rowNavActive && e.key === 'Enter' && focusedIndex >= 0 && filtered[focusedIndex]) {
        e.preventDefault();
        setEditing(filtered[focusedIndex]);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' && !showTrash) {
        e.preventDefault();
        setEditing(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTrash, viewMode, editing, filtered, focusedIndex]);

  return (
    <main className="container">
      <div className="topbar">
        <div>
          <h1>Reading Tracker</h1>
          <p className="subtitle">Web novels, light novels, novels, essays, short stories, fanfiction, and more.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn icon-only" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <a className="btn secondary" href="/api/export">Export CSV</a>
          <button className="btn secondary" onClick={logout}>Log out</button>
        </div>
      </div>

      {importMsg && <div className="card" style={{ padding: 10, fontSize: 13 }}>{importMsg}</div>}

      {!showTrash && (
        loading ? (
          <div className="card">
            <h2>Summary</h2>
            <div className="summary-grid">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="summary-tile">
                  <div className="skeleton" style={{ height: 20, width: '55%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '80%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <StatsSummary books={books} />
        )
      )}

      {!showTrash && upNext && (
        <div className="card up-next-card">
          {upNext.cover_url ? (
            <img src={upNext.cover_url} alt="" width={32} height={46} className="book-cover" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="placeholder-box" style={{ width: 32, height: 46 }} />
          )}
          <div style={{ flex: 1 }}>
            <div className="label">Up next</div>
            <strong className="book-title">{upNext.title}</strong>
            {upNext.author && <span className="label"> — {upNext.author}</span>}
          </div>
          <button className="btn secondary" onClick={pickUpNext}>Pick another</button>
          <button className="btn" onClick={startReadingUpNext}>Start reading</button>
          <button className="mono-btn" onClick={() => setUpNext(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="card">
        <div className="filters">
          {!showTrash && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search title, author, tags... (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn secondary" onClick={toggleRatingMode}>
            Rating: {ratingMode === 'stars' ? '★ stars' : '#.# decimal'}
          </button>
          {!showTrash && (
            <button className="btn secondary" onClick={pickUpNext} title="Randomly pick from Plan to Read">
              🎲 Up next
            </button>
          )}
          {!showTrash && (
            <button className="btn secondary" onClick={toggleViewMode} title="Switch between table and cover grid">
              {viewMode === 'table' ? '▦ Grid' : '☰ Table'}
            </button>
          )}
          {viewMode === 'table' && (
            <button
              className="btn secondary"
              onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
            >
              {selectMode ? 'Done selecting' : 'Select'}
            </button>
          )}
          <button className="btn secondary" onClick={() => setShowTrash((v) => !v)}>
            {showTrash ? '← Back to library' : 'Trash'}
          </button>
          <div className="filter-spacer" style={{ flex: 1 }} />
          {!showTrash && <button className="btn" onClick={() => setEditing(null)}>+ Add entry (n)</button>}
        </div>

        {viewMode === 'table' && selectMode && selected.size > 0 && (
          <div className="bulk-bar">
            <strong>{selected.size} selected</strong>
            {!showTrash && (
              <>
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn secondary" onClick={() => bulkAction('status')}>Set status</button>
                <button className="btn danger" onClick={() => bulkAction('delete')}>Delete selected</button>
              </>
            )}
            {showTrash && (
              <>
                <button className="btn secondary" onClick={() => bulkAction('restore')}>Restore selected</button>
                <button className="btn danger" onClick={() => bulkAction('delete_permanent')}>Delete forever</button>
              </>
            )}
            <button className="mono-btn" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        ) : viewMode === 'grid' && !showTrash ? (
          <BookGrid
            books={filtered}
            ratingMode={ratingMode}
            hasAnyBooks={books.length > 0}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
          />
        ) : (
          <BookTable
            books={filtered}
            ratingMode={ratingMode}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            trashMode={showTrash}
            hasAnyBooks={books.length > 0}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            focusedId={focusedIndex >= 0 ? filtered[focusedIndex]?.id ?? null : null}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
            onRestore={restoreBook}
            onPermanentDelete={permanentlyDeleteBook}
            onQuickStatus={quickStatusChange}
          />
        )}
      </div>

      {editing !== undefined && (
        <BookForm
          initial={editing}
          ratingMode={ratingMode}
          existingBooks={books}
          onCancel={() => setEditing(undefined)}
          onSave={saveBook}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}