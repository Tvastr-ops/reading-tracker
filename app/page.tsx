'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Book, BookInput, STATUSES, STATUS_COLOR_VAR, SortField, SortDir } from '@/lib/types';
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
  const [ratingFilter, setRatingFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [ratingMode, setRatingMode] = useState<'stars' | 'decimal'>('stars');
  const [editing, setEditing] = useState<Partial<Book> | null | undefined>(undefined);
  const [sortOption, setSortOption] = useState<string>('updated_at_desc');
  const [showTrash, setShowTrash] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
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
    const savedStatus = window.localStorage.getItem('statusFilter');
    if (savedStatus) setStatusFilter(savedStatus);
    const savedSearch = window.localStorage.getItem('search');
    if (savedSearch != null) setSearch(savedSearch);
    const savedSort = window.localStorage.getItem('sortOption');
    if (savedSort) setSortOption(savedSort);
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => { window.localStorage.setItem('statusFilter', statusFilter); }, [statusFilter]);
  useEffect(() => { window.localStorage.setItem('search', search); }, [search]);
  useEffect(() => { window.localStorage.setItem('sortOption', sortOption); }, [sortOption]);

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
    setBooks((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: next } : x)));
    const res = await fetch(`/api/books/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) load();
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

  const filtered = useMemo(() => {
    let list = books.filter((b) => {
      if (!showTrash && statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (ratingFilter !== 'All') {
        const r = b.rating ?? -1;
        if (ratingFilter === '5' && r !== 5) return false;
        if (ratingFilter === '4+' && r < 4) return false;
        if (ratingFilter === '3+' && r < 3) return false;
        if (ratingFilter === '2+' && r < 2) return false;
        if (ratingFilter === '1+' && r < 1) return false;
        if (ratingFilter === 'unrated' && r >= 0) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${b.title} ${b.author || ''} ${b.genre_tags || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortOption) {
        case 'title_asc':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'title_desc':
          cmp = b.title.localeCompare(a.title);
          break;
        case 'rating_desc':
          cmp = (b.rating ?? -1) - (a.rating ?? -1);
          break;
        case 'author_asc':
          cmp = (a.author || '').localeCompare(b.author || '');
          break;
        case 'created_at_desc':
          cmp = (b.id || '').localeCompare(a.id || '');
          break;
        default: // updated_at_desc
          cmp = b.updated_at.localeCompare(a.updated_at);
      }
      return cmp;
    });

    return list;
  }, [books, statusFilter, ratingFilter, search, sortOption, showTrash]);

  const [currentSortField, currentSortDir] = useMemo(() => {
    if (sortOption.startsWith('title')) return ['title', sortOption.endsWith('desc') ? 'desc' : 'asc'] as [SortField, SortDir];
    if (sortOption.startsWith('rating')) return ['rating', 'desc'] as [SortField, SortDir];
    if (sortOption.startsWith('status')) return ['status', 'asc'] as [SortField, SortDir];
    return ['updated_at', 'desc'] as [SortField, SortDir];
  }, [sortOption]);

  function handleTableSort(field: SortField) {
    if (field === 'title') {
      setSortOption(sortOption === 'title_asc' ? 'title_desc' : 'title_asc');
    } else if (field === 'rating') {
      setSortOption('rating_desc');
    } else {
      setSortOption('updated_at_desc');
    }
  }

  useEffect(() => { setFocusedIndex(-1); }, [filtered.length, statusFilter, ratingFilter, search, sortOption, showTrash]);

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

      {/* 1:1 REBUILT TOOLBAR (Desktop & Mobile Sync) */}
      <div className="tb-card">
        
        {/* ROW 1 (Desktop) / ROWS 1 & 2 (Mobile) */}
        <div className="tb-top-row">
          
          {/* SEARCH (First on mobile, second on desktop) */}
          <div className="tb-search">
            <svg className="tb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search title, author, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search entries"
            />
            {search ? (
              <button className="tb-search-clear" onClick={() => setSearch('')}>×</button>
            ) : (
              <span className="tb-kbd tb-search-kbd">/</span>
            )}
          </div>

          {/* ADD ENTRY (First on desktop, second on mobile) */}
          {!showTrash && (
            <button className="tb-add-btn" onClick={() => setEditing(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Entry</span>
              <span className="tb-kbd">n</span>
            </button>
          )}

          {/* VIEW SWITCH (Third on both) */}
          {!showTrash && (
            <div className="tb-switch">
              <button
                type="button"
                className={`tb-switch-tab ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => viewMode !== 'grid' && toggleViewMode()}
              >
                <svg className="tb-switch-icon" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`tb-switch-tab ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => viewMode !== 'table' && toggleViewMode()}
              >
                <svg className="tb-switch-icon" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="5" width="18" height="3" rx="1"/>
                  <rect x="3" y="11" width="18" height="3" rx="1"/>
                  <rect x="3" y="17" width="18" height="3" rx="1"/>
                </svg>
                <span>Table</span>
              </button>
            </div>
          )}

          {/* DESKTOP TRASH (Fourth on desktop, hidden on mobile) */}
          <button
            className={`tb-trash-desktop ${showTrash ? 'active' : ''}`}
            onClick={() => setShowTrash((v) => !v)}
            title={showTrash ? 'Back to library' : 'Trash'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>{showTrash ? 'Library' : 'Trash'}</span>
          </button>
        </div>

        {/* BOTTOM ROWS (Filters and Metadata) */}
        <div className="tb-bottom-row">
          
          {/* Scrollable Filters Strip */}
          <div className="tb-filters">
            {/* Status */}
            {!showTrash && (
              <div className="tb-select-wrap tb-filter-status">
                <svg className="tb-select-icon left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tb-select">
                  <option value="All">Status</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <svg className="tb-select-icon right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            )}

            {/* Sort */}
            {!showTrash && (
              <div className="tb-select-wrap tb-filter-sort">
                <svg className="tb-select-icon left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V3M7 3L3 7M7 3l4 4M17 8v13M17 21l4-4M17 21l-4-4"/>
                </svg>
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="tb-select">
                  <option value="updated_at_desc">Sort: Recently updated</option>
                  <option value="created_at_desc">Sort: Recently added</option>
                  <option value="title_asc">Sort: Title (A–Z)</option>
                  <option value="title_desc">Sort: Title (Z–A)</option>
                  <option value="rating_desc">Sort: Rating</option>
                  <option value="author_asc">Sort: Author</option>
                </select>
                <svg className="tb-select-icon right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            )}

            {/* Rating */}
            {!showTrash && (
              <div className="tb-select-wrap tb-filter-rating">
                <svg className="tb-select-icon left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="tb-select">
                  <option value="All">Rating</option>
                  <option value="5">5★ Stars</option>
                  <option value="4+">4★ & Up</option>
                  <option value="3+">3★ & Up</option>
                  <option value="2+">2★ & Up</option>
                  <option value="1+">1★ & Up</option>
                  <option value="unrated">Unrated</option>
                </select>
                <svg className="tb-select-icon right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            )}

            {/* Up Next */}
            {!showTrash && (
              <button className="tb-upnext-btn tb-filter-upnext" onClick={pickUpNext} title="Get a random entry to read next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/>
                </svg>
                <span>Up next</span>
              </button>
            )}

            {/* MOBILE TRASH (Appears at end of scroll row on mobile) */}
            <button
              className={`tb-trash-mobile tb-filter-trash ${showTrash ? 'active' : ''}`}
              onClick={() => setShowTrash((v) => !v)}
              title={showTrash ? 'Back to library' : 'Trash'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>

          {/* DESKTOP ENTRY COUNT */}
          <div className="tb-count-desktop">
            <svg className="tb-count-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>{filtered.length} entries</span>
          </div>
        </div>

        {/* MOBILE BOTTOM META (Divider & Entries Count) */}
        <div className="tb-mobile-meta">
          <div className="tb-divider"></div>
          <div className="tb-count-mobile">
            <svg className="tb-count-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>{filtered.length} entries</span>
          </div>
        </div>
      </div>

      {viewMode === 'table' && selectMode && selected.size > 0 && (
        <div className="bulk-bar" style={{ marginTop: 12, marginBottom: 12 }}>
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
        <div style={{ marginTop: 16 }}>
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
          sortField={currentSortField}
          sortDir={currentSortDir}
          onSort={handleTableSort}
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