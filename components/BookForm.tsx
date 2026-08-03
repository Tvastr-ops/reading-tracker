'use client';

import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Book, type BookInput, STATUSES } from '@/lib/types';
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
  const [coverResults, setCoverResults] = useState<
    { title: string; author: string | null; cover_url: string }[]
  >([]);
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
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
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

  const inputClass =
    'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-card-bg text-text focus:outline-none focus:ring-2 focus:ring-accent-color transition-all';
  const labelClass = 'block text-xs font-semibold text-text-muted mb-1';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">
            {initial?.id ? 'Edit Entry' : 'Add New Entry'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="col-span-full">
              <label className={labelClass}>Title *</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Book title..."
                autoFocus
              />
              {isDuplicate && (
                <div className="mt-1.5 flex items-center gap-1.5 font-medium text-amber-600 text-xs dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>You already have an entry with this title.</span>
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <Select value={form.type} onValueChange={(val) => set('type', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <Select value={form.status} onValueChange={(val) => set('status', val as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelClass}>Author</label>
              <input
                className={inputClass}
                value={form.author || ''}
                onChange={(e) => set('author', e.target.value)}
                placeholder="Author name..."
              />
            </div>

            <div>
              <label className={labelClass}>Rating</label>
              <RatingSelect
                value={form.rating}
                onChange={(v) => set('rating', v)}
                mode={ratingMode}
              />
            </div>

            <div>
              <label className={labelClass}>Progress (units read)</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="0.5"
                value={form.progress ?? ''}
                onChange={(e) =>
                  set('progress', e.target.value === '' ? 0 : parseFloat(e.target.value))
                }
              />
            </div>

            <div>
              <label className={labelClass}>Total units</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="0.5"
                value={form.total_units ?? ''}
                onChange={(e) =>
                  set('total_units', e.target.value === '' ? null : parseFloat(e.target.value))
                }
                placeholder="e.g. 100"
              />
            </div>

            <div className="col-span-full">
              <label className={labelClass}>Genre / Tags</label>
              <input
                className={inputClass}
                value={form.genre_tags || ''}
                onChange={(e) => set('genre_tags', e.target.value)}
                placeholder="e.g. Fantasy, Sci-Fi, Time Loop"
              />
            </div>

            <div className="col-span-full">
              <label className={labelClass}>Source / Link</label>
              <input
                className={inputClass}
                value={form.source_link || ''}
                onChange={(e) => set('source_link', e.target.value)}
                placeholder="royalroad.com or website URL"
              />
            </div>

            <div className="col-span-full space-y-1.5">
              <label className={labelClass}>Cover Image</label>
              <div className="flex items-center gap-2">
                {form.cover_url ? (
                  <img
                    src={form.cover_url}
                    alt=""
                    className="h-11 w-8 shrink-0 rounded border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-8 shrink-0 items-center justify-center rounded border border-border bg-surface text-text-muted text-xs">
                    No img
                  </div>
                )}
                <input
                  className={`${inputClass} flex-1`}
                  value={form.cover_url || ''}
                  onChange={(e) => set('cover_url', e.target.value)}
                  placeholder="Paste an image URL, or search below"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={searchCover}
                  disabled={coverSearching || !form.title.trim()}
                >
                  {coverSearching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Search</span>
                </Button>
              </div>
              {coverResults.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {coverResults.map((r) => (
                    <button
                      type="button"
                      key={r.cover_url}
                      onClick={() => {
                        set('cover_url', r.cover_url);
                        setCoverResults([]);
                      }}
                      title={`${r.title}${r.author ? ` — ${r.author}` : ''}`}
                      className="cursor-pointer rounded-lg border border-border bg-card-bg p-0.5 transition-colors hover:border-accent-color"
                    >
                      <img
                        src={r.cover_url}
                        alt=""
                        className="block h-14 w-10 rounded object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Date started</label>
              <input
                className={inputClass}
                type="date"
                value={form.date_started || ''}
                onChange={(e) => set('date_started', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Date finished</label>
              <input
                className={inputClass}
                type="date"
                value={form.date_finished || ''}
                onChange={(e) => set('date_finished', e.target.value)}
              />
            </div>

            <div className="col-span-full">
              <label className={labelClass}>Notes</label>
              <textarea
                className={`${inputClass} min-h-[70px] resize-y py-2`}
                value={form.notes || ''}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Personal notes or review..."
              />
            </div>

            {initial?.id && (
              <div className="col-span-full mt-1 border-border border-t pt-3">
                <ReadingLog
                  bookId={initial.id}
                  currentProgress={form.progress ?? 0}
                  totalUnits={form.total_units ?? null}
                  onProgressUpdated={(p) => set('progress', p)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="font-semibold text-rose-600 text-xs dark:text-rose-400">{error}</div>
          )}

          <div className="sticky bottom-0 z-10 flex justify-end gap-2.5 border-border border-t bg-card-bg pt-3 pb-1">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{saving ? 'Saving...' : 'Save Entry'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
