'use client';

import { useState } from 'react';
import { Book, BookInput, STATUSES } from '@/lib/types';
import { RatingSelect } from './RatingInput';
import ReadingLog from './ReadingLog';

const TYPES = ['Web Novel', 'Light Novel', 'Novel', 'Essay', 'Short Story', 'Fanfiction', 'Other'];

export default function BookForm({
  initial,
  ratingMode,
  onCancel,
  onSave,
}: {
  initial: Partial<Book> | null;
  ratingMode: 'stars' | 'decimal';
  onCancel: () => void;
  onSave: (data: BookInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BookInput>({
    title: initial?.title || '',
    type: initial?.type || 'Novel',
    author: initial?.author || '',
    status: (initial?.status as any) || 'Plan to Read',
    rating: initial?.rating ?? null,
    progress: initial?.progress ?? 0,
    total_units: initial?.total_units ?? null,
    genre_tags: initial?.genre_tags || '',
    source_link: initial?.source_link || '',
    cover_url: initial?.cover_url || '',
    date_started: initial?.date_started || '',
    date_finished: initial?.date_finished || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [coverResults, setCoverResults] = useState<{ title: string; author: string | null; cover_url: string }[]>([]);
  const [coverSearching, setCoverSearching] = useState(false);

  function set<K extends keyof BookInput>(key: K, val: BookInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function searchCover() {
    if (!form.title.trim()) return;
    setCoverSearching(true);
    setCoverResults([]);
    const res = await fetch(`/api/covers?title=${encodeURIComponent(form.title.trim())}`);
    setCoverSearching(false);
    if (res.ok) {
      const data = await res.json();
      setCoverResults(data.results || []);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial?.id ? 'Edit entry' : 'Add entry'}</h2>
        <div className="form-grid">
          <div className="full">
            <label>Title *</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>

          <div>
            <label>Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as any)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label>Author</label>
            <input value={form.author || ''} onChange={(e) => set('author', e.target.value)} />
          </div>

          <div>
            <label>Rating</label>
            <RatingSelect value={form.rating} onChange={(v) => set('rating', v)} mode={ratingMode} />
          </div>

          <div>
            <label>Progress (units read)</label>
            <input type="number" min={0} step="0.5" value={form.progress ?? ''} onChange={(e) => set('progress', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
          </div>

          <div>
            <label>Total units</label>
            <input type="number" min={0} step="0.5" value={form.total_units ?? ''} onChange={(e) => set('total_units', e.target.value === '' ? null : parseFloat(e.target.value))} />
          </div>

          <div className="full">
            <label>Genre / Tags</label>
            <input value={form.genre_tags || ''} onChange={(e) => set('genre_tags', e.target.value)} placeholder="Fantasy, Time Loop" />
          </div>

          <div className="full">
            <label>Source / Link</label>
            <input value={form.source_link || ''} onChange={(e) => set('source_link', e.target.value)} placeholder="royalroad.com" />
          </div>

          <div className="full">
            <label>Cover image</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {form.cover_url ? (
                <img src={form.cover_url} alt="" width={32} height={46} className="book-cover" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="placeholder-box" style={{ width: 32, height: 46, flexShrink: 0 }} />
              )}
              <input
                value={form.cover_url || ''}
                onChange={(e) => set('cover_url', e.target.value)}
                placeholder="Paste an image URL, or search below"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn secondary" onClick={searchCover} disabled={coverSearching || !form.title.trim()}>
                {coverSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {coverResults.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {coverResults.map((r) => (
                  <button
                    type="button"
                    key={r.cover_url}
                    onClick={() => { set('cover_url', r.cover_url); setCoverResults([]); }}
                    title={`${r.title}${r.author ? ' — ' + r.author : ''}`}
                    style={{ border: '1px solid var(--input-border)', borderRadius: 4, padding: 2, background: 'var(--card-bg)', cursor: 'pointer' }}
                  >
                    <img src={r.cover_url} alt="" width={40} height={58} className="book-cover" style={{ objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label>Date started</label>
            <input type="date" value={form.date_started || ''} onChange={(e) => set('date_started', e.target.value)} />
          </div>

          <div>
            <label>Date finished</label>
            <input type="date" value={form.date_finished || ''} onChange={(e) => set('date_finished', e.target.value)} />
          </div>

          <div className="full">
            <label>Notes</label>
            <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {initial?.id && (
            <ReadingLog
              bookId={initial.id}
              currentProgress={form.progress ?? 0}
              onProgressUpdated={(p) => set('progress', p)}
            />
          )}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
