'use client';

import {
  AlertTriangle,
  BookOpen,
  Clock,
  Image as ImageIcon,
  Loader2,
  Search,
  Settings2,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDefaultUnitType } from '@/lib/progress';
import {
  type Book,
  type BookInput,
  type ProgressStructure,
  PUBLICATION_TYPES,
  STATUSES,
  type UnitType,
} from '@/lib/types';
import { RatingSelect } from './RatingInput';
import ReadingLog from './ReadingLog';

const UNIT_OPTIONS: { label: string; value: UnitType }[] = [
  { label: 'Pages', value: 'pages' },
  { label: 'Chapters', value: 'chapters' },
  { label: 'Volumes', value: 'volumes' },
  { label: 'Words', value: 'words' },
  { label: 'Percent (%)', value: 'percent' },
  { label: 'Units', value: 'units' },
];

function getStructureOptions(unitType: UnitType): { label: string; value: ProgressStructure }[] {
  const singularUnit =
    unitType === 'chapters'
      ? 'Chapter'
      : unitType === 'volumes'
        ? 'Volume'
        : unitType === 'words'
          ? 'Word'
          : unitType === 'percent'
            ? '%'
            : unitType === 'units'
              ? 'Unit'
              : 'Page';

  if (unitType === 'volumes') {
    return [
      { label: 'Single Level (Volumes)', value: 'single' },
      { label: 'Volume Hierarchy (Vol. X / Total)', value: 'volume_chapter' },
      { label: 'Part → Volume (Part II • Vol. 3)', value: 'part_chapter' },
    ];
  }

  return [
    { label: `Single Level (${singularUnit}s)`, value: 'single' },
    { label: `Volume → ${singularUnit} (Vol. X • ${singularUnit} Y)`, value: 'volume_chapter' },
    { label: `Part → ${singularUnit} (Part X • ${singularUnit} Y)`, value: 'part_chapter' },
  ];
}

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
    unit_type: initial?.unit_type || getDefaultUnitType(initial?.type || 'Novel'),
    progress_structure: initial?.progress_structure || 'single',
    parent_progress: initial?.parent_progress ?? null,
    parent_total: initial?.parent_total ?? null,
    latest_units: initial?.latest_units ?? null,
    is_ongoing: initial?.is_ongoing ?? false,
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

  const [activeTab, setActiveTab] = useState<'general' | 'metadata' | 'log'>('general');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    return (
      (initial?.unit_type && initial.unit_type !== 'pages') ||
      (initial?.progress_structure && initial.progress_structure !== 'single') ||
      !!initial?.is_ongoing ||
      initial?.latest_units != null ||
      initial?.parent_progress != null
    );
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

  function handleTypeChange(newType: string) {
    setForm((f) => {
      const defaultUnit = getDefaultUnitType(newType);
      return {
        ...f,
        type: newType,
        unit_type: defaultUnit,
      };
    });
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
      setActiveTab('general');
      return;
    }
    setSaving(true);
    setError('');

    const payload = { ...form };

    // Sanitization rule 1: If structure is single, clear parent progress/total
    if (payload.progress_structure === 'single') {
      payload.parent_progress = null;
      payload.parent_total = null;
    }

    // Sanitization rule 2: If status is Completed
    if (payload.status === 'Completed') {
      payload.is_ongoing = false;
      if (payload.total_units != null) {
        payload.progress = payload.total_units;
      } else if (payload.latest_units != null) {
        payload.total_units = payload.latest_units;
        payload.progress = payload.latest_units;
      }
      if (payload.progress_structure !== 'single' && payload.parent_total != null) {
        payload.parent_progress = payload.parent_total;
      }
    } else if (!payload.is_ongoing && payload.total_units == null && payload.latest_units != null) {
      // If ongoing is unchecked and total_units is null, copy latest_units to total_units
      payload.total_units = payload.latest_units;
    }

    try {
      await onSave(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-card-bg text-text focus:outline-none focus:ring-2 focus:ring-accent-color transition-all';
  const labelClass = 'block text-xs font-semibold text-text-muted mb-1';

  const unitLabel =
    form.unit_type === 'chapters'
      ? 'chapters'
      : form.unit_type === 'volumes'
        ? 'volumes'
        : form.unit_type === 'words'
          ? 'words'
          : form.unit_type === 'percent'
            ? '%'
            : 'pages';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[580px] flex-col overflow-hidden rounded-2xl border border-border bg-card-bg p-0 shadow-2xl sm:max-h-[85vh]">
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="flex w-full flex-1 flex-col overflow-hidden"
        >
          <DialogHeader className="shrink-0 border-border/80 border-b bg-surface/40 px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-bold text-lg sm:text-xl">
                {initial?.id ? 'Edit Entry' : 'Add New Entry'}
              </DialogTitle>
            </div>

            <TabsList className="mt-2 grid w-full grid-cols-3 bg-surface/80 p-1">
              <TabsTrigger
                value="general"
                className="gap-1 px-1.5 text-[11px] sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="metadata"
                className="gap-1 px-1.5 text-[11px] sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">Details</span>
              </TabsTrigger>
              <TabsTrigger
                value="log"
                disabled={!initial?.id}
                className="gap-1 px-1.5 text-[11px] disabled:opacity-40 sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">Reading Log</span>
              </TabsTrigger>
            </TabsList>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {/* TAB 1: GENERAL INFO */}
              <TabsContent value="general" className="mt-0 space-y-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                  <div className="col-span-full">
                    <label className={labelClass}>Title *</label>
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder="Publication title..."
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
                    <label className={labelClass}>Format Type</label>
                    <Select value={form.type} onValueChange={handleTypeChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select format type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICATION_TYPES.map((t) => (
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
                    <label className={labelClass}>Current Progress ({unitLabel} read)</label>
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
                    <label className={labelClass}>
                      Total {unitLabel} {form.is_ongoing ? '(expected)' : ''}
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.total_units ?? ''}
                      onChange={(e) =>
                        set(
                          'total_units',
                          e.target.value === '' ? null : parseFloat(e.target.value),
                        )
                      }
                      placeholder={form.is_ongoing ? 'Optional if ongoing' : 'e.g. 500'}
                    />
                  </div>

                  {/* Inline Compact Tracking Settings Expander */}
                  <div className="col-span-full pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-1.5 font-semibold text-accent-color text-xs hover:underline"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>
                        {showAdvanced
                          ? 'Hide Units & Structure Settings'
                          : 'Custom Units, Hierarchy & Serialization Settings'}
                      </span>
                    </button>

                    {showAdvanced && (
                      <div className="mt-2.5 space-y-3 rounded-xl border border-border/60 bg-surface/50 p-3 text-xs">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Unit Type</label>
                            <Select
                              value={form.unit_type || 'pages'}
                              onValueChange={(val) => set('unit_type', val as UnitType)}
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_OPTIONS.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className={labelClass}>Progress Structure</label>
                            <Select
                              value={form.progress_structure || 'single'}
                              onValueChange={(val) =>
                                set('progress_structure', val as ProgressStructure)
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Select structure" />
                              </SelectTrigger>
                              <SelectContent>
                                {getStructureOptions(form.unit_type || 'pages').map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {form.progress_structure && form.progress_structure !== 'single' && (
                          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/40 bg-card-bg p-2.5">
                            <div>
                              <label className={labelClass}>
                                {form.progress_structure === 'volume_chapter'
                                  ? 'Current Volume'
                                  : 'Current Part'}
                              </label>
                              <input
                                className={inputClass}
                                type="number"
                                min={0}
                                value={form.parent_progress ?? ''}
                                onChange={(e) =>
                                  set(
                                    'parent_progress',
                                    e.target.value === '' ? null : parseFloat(e.target.value),
                                  )
                                }
                                placeholder="e.g. 3"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>
                                {form.progress_structure === 'volume_chapter'
                                  ? 'Total Volumes'
                                  : 'Total Parts'}
                              </label>
                              <input
                                className={inputClass}
                                type="number"
                                min={0}
                                value={form.parent_total ?? ''}
                                onChange={(e) =>
                                  set(
                                    'parent_total',
                                    e.target.value === '' ? null : parseFloat(e.target.value),
                                  )
                                }
                                placeholder="e.g. 10"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 rounded-lg border border-border/40 bg-card-bg p-2.5">
                          <label className="flex cursor-pointer items-center gap-2 font-semibold text-text">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-accent-color focus:ring-accent-color"
                              checked={form.is_ongoing || false}
                              onChange={(e) => set('is_ongoing', e.target.checked)}
                            />
                            <span>Ongoing Serialization (Actively Releasing)</span>
                          </label>

                          {form.is_ongoing && (
                            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>
                                  Latest Released by Author ({unitLabel})
                                </label>
                                <input
                                  className={inputClass}
                                  type="number"
                                  min={0}
                                  value={form.latest_units ?? ''}
                                  onChange={(e) =>
                                    set(
                                      'latest_units',
                                      e.target.value === '' ? null : parseFloat(e.target.value),
                                    )
                                  }
                                  placeholder="e.g. 250"
                                />
                              </div>
                              {form.latest_units != null && (
                                <div className="flex items-end pb-0.5">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="w-full gap-1 text-sky-600 text-xs dark:text-sky-400"
                                    onClick={() => set('progress', form.latest_units!)}
                                  >
                                    <span>I'm Caught Up</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-full">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      className={`${inputClass} min-h-[65px] resize-y py-2`}
                      value={form.notes || ''}
                      onChange={(e) => set('notes', e.target.value)}
                      placeholder="Personal notes or review..."
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: METADATA, LINKS & COVER */}
              <TabsContent value="metadata" className="mt-0 space-y-4">
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
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
                        placeholder="Paste image URL, or search Open Library..."
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
                    <label className={labelClass}>Genre / Tags</label>
                    <input
                      className={inputClass}
                      value={form.genre_tags || ''}
                      onChange={(e) => set('genre_tags', e.target.value)}
                      placeholder="e.g. Fantasy, Sci-Fi, Time Loop"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Source / Website Link</label>
                    <input
                      className={inputClass}
                      value={form.source_link || ''}
                      onChange={(e) => set('source_link', e.target.value)}
                      placeholder="royalroad.com or reading web link"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className={labelClass}>Date started</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              set('date_started', new Date().toISOString().split('T')[0])
                            }
                            className="font-medium text-[10px] text-accent-color hover:underline"
                          >
                            Today
                          </button>
                          {form.date_started && (
                            <>
                              <span className="text-[10px] text-text-muted">·</span>
                              <button
                                type="button"
                                onClick={() => set('date_started', null)}
                                className="font-medium text-[10px] text-rose-400 hover:underline"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.date_started || ''}
                        onChange={(e) => set('date_started', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className={labelClass}>Date finished</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              set('date_finished', new Date().toISOString().split('T')[0])
                            }
                            className="font-medium text-[10px] text-accent-color hover:underline"
                          >
                            Today
                          </button>
                          {form.date_finished && (
                            <>
                              <span className="text-[10px] text-text-muted">·</span>
                              <button
                                type="button"
                                onClick={() => set('date_finished', null)}
                                className="font-medium text-[10px] text-rose-400 hover:underline"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <input
                        className={inputClass}
                        type="date"
                        value={form.date_finished || ''}
                        onChange={(e) => set('date_finished', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: READING LOG */}
              {initial?.id && (
                <TabsContent value="log" className="mt-0">
                  <ReadingLog
                    bookId={initial.id}
                    currentProgress={form.progress ?? 0}
                    totalUnits={form.total_units ?? null}
                    onProgressUpdated={(p) => set('progress', p)}
                  />
                </TabsContent>
              )}
            </div>

            {error && (
              <div className="px-4 pt-2 font-semibold text-rose-600 text-xs sm:px-6 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="flex shrink-0 justify-end gap-2.5 border-border border-t bg-card-bg p-4 sm:px-6 sm:py-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{saving ? 'Saving...' : 'Save Entry'}</span>
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
