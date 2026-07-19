'use client';

import { useState } from 'react';
import { Book, BookInput, STATUSES } from '@/lib/types';
import { RatingSelect } from './RatingInput';

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
    date_started: initial?.date_started || '',
    date_finished: initial?.date_finished || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof BookInput>(key: K, val: BookInput[K]) {
    setForm((f) => ({ ...f, [key]: val }));
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
