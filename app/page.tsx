'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Book, BookInput, STATUSES, SortField, SortDir } from '@/lib/types';
import BookTable from '@/components/BookTable';
import BookForm from '@/components/BookForm';
import StatsSummary from '@/components/StatsSummary';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem('ratingMode');
    if (saved === 'decimal' || saved === 'stars') setRatingMode(saved);
    // layout.tsx already set the real data-theme attribute before paint
    // (avoids a flash); this just syncs React state to match it so the
    // toggle button shows the right icon.
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  useEffect(() => { load(); }, [showTrash]);

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
    if (res.ok) load();
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
        setImportMsg(`Imported ${result.imported} entries${result.skippedRows?.length ? `, skipped ${result.skippedRows.length} row(s) without a title` : ''}.`);
        load();
      }
    } catch {
      setImportMsg('Could not read that file.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Reading Tracker</h1>
          <p className="subtitle">Web novels, light novels, novels, essays, short stories, fanfiction, and more.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle dark mode">
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

      {!showTrash && <StatsSummary books={books} />}

      <div className="card">
        <div className="filters">
          {!showTrash && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            type="text"
            placeholder="Search title, author, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn secondary" onClick={toggleRatingMode}>
            Rating: {ratingMode === 'stars' ? '★ stars' : '#.# decimal'}
          </button>
          <button className="btn secondary" onClick={() => setShowTrash((v) => !v)}>
            {showTrash ? '← Back to library' : 'Trash'}
          </button>
          <div className="filter-spacer" style={{ flex: 1 }} />
          {!showTrash && <button className="btn" onClick={() => setEditing(null)}>+ Add entry</button>}
        </div>

        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <p className="subtitle">Loading...</p>
        ) : (
          <BookTable
            books={filtered}
            ratingMode={ratingMode}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            trashMode={showTrash}
            hasAnyBooks={books.length > 0}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
            onRestore={restoreBook}
            onPermanentDelete={permanentlyDeleteBook}
          />
        )}
      </div>

      {editing !== undefined && (
        <BookForm
          initial={editing}
          ratingMode={ratingMode}
          onCancel={() => setEditing(undefined)}
          onSave={saveBook}
        />
      )}
    </div>
  );
}
