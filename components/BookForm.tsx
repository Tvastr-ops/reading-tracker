'use client';

import { useMemo, useState } from 'react';
import { Book, BookInput, STATUSES } from '@/lib/types';
import { RatingSelect } from './RatingInput';
import ReadingLog from './ReadingLog';

const TYPES = ['Web Novel', 'Light Novel', 'Novel', 'Essay', 'Short Story', 'Fanfiction', 'Other'];

export default function BookForm({
  initial,
  ratingMode,
  existingBooks,
  onCancel,
  onSave,
}: {
  initial: Partial<Book> | null;
  ratingMode: 'stars' | 'decimal';
  existingBooks: Book[];
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

  const isDuplicate = useMemo(() => {
    const t = form.title.trim().toLowerCase();
    if (!t) return false;
    return existingBooks.some((b) => b.id !== initial?.id && b.title.trim().toLowerCase() === t);
  }, [form.title, existingBooks, initial?.id]);

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

  // The modal owns its own Escape-to-close and Tab focus trap rather than
  // relying on a page-level keydown listener — keeps this component
  // self-contained so it behaves correctly regardless of what else is on
  // the page it's used from.
  function handleModalKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const inputClass = "w-full py-[var(--space-2)] px-[var(--space-3)] border border-input-border rounded-[var(--radius-sm)] bg-input-bg text-text-main font-inherit";
  const labelClass = "block text-[12px] text-text-muted mb-[var(--space-1)]";

  return (
    <div className="fixed inset-0 bg-[rgba(20,15,5,0.45)] flex items-start justify-center py-[var(--space-6)] px-[var(--space-4)] overflow-y-auto z-50 animate-[fadeIn_150ms_ease_both]" onClick={onCancel}>
      <form
        className="bg-card-bg rounded-[var(--radius-md)] p-[var(--space-5)] w-full max-w-[560px] shadow-[var(--shadow-modal)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        onKeyDown={handleModalKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-form-heading"
      >
        <h2 id="book-form-heading" className="text-[18px] font-bold m-0 mb-4">{initial?.id ? 'Edit entry' : 'Add entry'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-3)]">
          <div className="col-span-full">
            <label className={labelClass}>Title *</label>
            <input className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
            {isDuplicate && (
              <div className="text-[12px] text-status-hold mt-1">
                You already have an entry with this title — saving will create a duplicate.
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as any)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Author</label>
            <input className={inputClass} value={form.author || ''} onChange={(e) => set('author', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Rating</label>
            <RatingSelect value={form.rating} onChange={(v) => set('rating', v)} mode={ratingMode} />
          </div>

          <div>
            <label className={labelClass}>Progress (units read)</label>
            <input className={inputClass} type="number" min={0} step="0.5" value={form.progress ?? ''} onChange={(e) => set('progress', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
          </div>

          <div>
            <label className={labelClass}>Total units</label>
            <input className={inputClass} type="number" min={0} step="0.5" value={form.total_units ?? ''} onChange={(e) => set('total_units', e.target.value === '' ? null : parseFloat(e.target.value))} />
          </div>

          <div className="col-span-full">
            <label className={labelClass}>Genre / Tags</label>
            <input className={inputClass} value={form.genre_tags || ''} onChange={(e) => set('genre_tags', e.target.value)} placeholder="Fantasy, Time Loop" />
          </div>

          <div className="col-span-full">
            <label className={labelClass}>Source / Link</label>
            <input className={inputClass} value={form.source_link || ''} onChange={(e) => set('source_link', e.target.value)} placeholder="royalroad.com" />
          </div>

          <div className="col-span-full">
            <label className={labelClass}>Cover image</label>
            <div className="flex gap-2 items-center">
              {form.cover_url ? (
                <img src={form.cover_url} alt="" width={32} height={46} className="object-cover book-cover" />
              ) : (
                <div className="w-8 h-[46px] shrink-0 placeholder-box" />
              )}
              <input
                className={`${inputClass} flex-1`}
                value={form.cover_url || ''}
                onChange={(e) => set('cover_url', e.target.value)}
                placeholder="Paste an image URL, or search below"
              />
              <button type="button" className="btn secondary" onClick={searchCover} disabled={coverSearching || !form.title.trim()}>
                {coverSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {coverResults.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {coverResults.map((r) => (
                  <button
                    type="button"
                    key={r.cover_url}
                    onClick={() => { set('cover_url', r.cover_url); setCoverResults([]); }}
                    title={`${r.title}${r.author ? ' — ' + r.author : ''}`}
                    className="border border-input-border rounded-[4px] p-0.5 bg-card-bg cursor-pointer"
                  >
                    <img src={r.cover_url} alt="" width={40} height={58} className="object-cover block book-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Date started</label>
            <input className={inputClass} type="date" value={form.date_started || ''} onChange={(e) => set('date_started', e.target.value)} />
          </div>

          <div>
            <label className={labelClass}>Date finished</label>
            <input className={inputClass} type="date" value={form.date_finished || ''} onChange={(e) => set('date_finished', e.target.value)} />
          </div>

          <div className="col-span-full">
            <label className={labelClass}>Notes</label>
            <textarea className={`${inputClass} resize-y min-h-[60px]`} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {initial?.id && (
            <ReadingLog
              bookId={initial.id}
              currentProgress={form.progress ?? 0}
              totalUnits={form.total_units ?? null}
              onProgressUpdated={(p) => set('progress', p)}
            />
          )}
        </div>

        {error && <div className="text-[12px] text-danger mt-3 font-semibold">{error}</div>}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
