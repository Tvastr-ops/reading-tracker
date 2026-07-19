'use client';

import { useEffect, useMemo, useState } from 'react';
import { Book, BookInput, STATUSES } from '@/lib/types';
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
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem('ratingMode');
    if (saved === 'decimal' || saved === 'stars') setRatingMode(saved);
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/books');
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
    if (!confirm(`Delete "${b.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/books/${b.id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${b.title} ${b.author || ''} ${b.genre_tags || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [books, statusFilter, search]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Reading Tracker</h1>
          <p className="subtitle">Web novels, light novels, novels, essays, short stories, fanfiction, and more.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn secondary" href="/api/export">Export CSV</a>
          <button className="btn secondary" onClick={logout}>Log out</button>
        </div>
      </div>

      <StatsSummary books={books} />

      <div className="card">
        <div className="filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="text"
            placeholder="Search title, author, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn secondary" onClick={toggleRatingMode}>
            Rating: {ratingMode === 'stars' ? '★ stars' : '#.# decimal'}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setEditing(null)}>+ Add entry</button>
        </div>

        {error && <div className="error-text">{error}</div>}
        {loading ? (
          <p className="subtitle">Loading...</p>
        ) : (
          <BookTable
            books={filtered}
            ratingMode={ratingMode}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
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
