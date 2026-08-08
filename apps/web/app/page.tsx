'use client';

import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Download,
  Filter,
  LayoutGrid,
  List,
  LogOut,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import BookGrid from '@/components/BookGrid';
import BookTable from '@/components/BookTable';
import StatsSummary from '@/components/StatsSummary';
import { cn } from '@/lib/utils';

const BookForm = dynamic(() => import('@/components/BookForm'), { ssr: false });

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Book, type BookInput, type SortDir, type SortField, STATUSES } from '@/lib/types';

const _SORT_PRESETS: { label: string; field: SortField; dir: SortDir }[] = [
  { label: 'Recently added', field: 'created_at', dir: 'desc' },
  { label: 'Recently updated', field: 'updated_at', dir: 'desc' },
  { label: 'Title (A–Z)', field: 'title', dir: 'asc' },
  { label: 'Title (Z–A)', field: 'title', dir: 'desc' },
  { label: 'Progress', field: 'progress', dir: 'desc' },
  { label: 'Rating', field: 'rating', dir: 'desc' },
  { label: 'Author', field: 'author', dir: 'asc' },
];

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState<number | 'All' | 'Unrated'>('All');
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
  const [upNext, setUpNext] = useState<Book | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const savedView = window.localStorage.getItem('viewMode');
    if (savedView === 'grid' || savedView === 'table') setViewMode(savedView);
    const savedStatus = window.localStorage.getItem('statusFilter');
    if (savedStatus) setStatusFilter(savedStatus);
    const savedSearch = window.localStorage.getItem('search');
    if (savedSearch != null) setSearch(savedSearch);
    const savedSortField = window.localStorage.getItem('sortField');
    if (savedSortField) setSortField(savedSortField as SortField);
    const savedSortDir = window.localStorage.getItem('sortDir');
    if (savedSortDir === 'asc' || savedSortDir === 'desc') setSortDir(savedSortDir);
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    window.localStorage.setItem('statusFilter', statusFilter);
  }, [statusFilter]);
  useEffect(() => {
    window.localStorage.setItem('search', search);
  }, [search]);
  useEffect(() => {
    window.localStorage.setItem('sortField', sortField);
  }, [sortField]);
  useEffect(() => {
    window.localStorage.setItem('sortDir', sortDir);
  }, [sortDir]);

  function toggleViewMode(mode: 'table' | 'grid') {
    setViewMode(mode);
    window.localStorage.setItem('viewMode', mode);
    if (mode === 'grid') {
      setSelectMode(false);
      setSelected(new Set());
    }
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  useEffect(() => {
    load();
    setSelected(new Set());
    setSelectMode(false);
  }, [showTrash]);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/books${showTrash ? '?trash=1' : ''}`);
    if (res.status === 401) {
      router.push('/login');
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load');
      setLoading(false);
      return;
    }
    setBooks(data.books);
    setLoading(false);
  }

  function _toggleRatingMode() {
    const next = ratingMode === 'stars' ? 'decimal' : 'stars';
    setRatingMode(next);
    window.localStorage.setItem('ratingMode', next);
    toast.info(`Switched rating mode to ${next === 'stars' ? 'Stars (★)' : 'Decimal (#.#)'}`);
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
    const today = new Date().toISOString().split('T')[0];
    const payload = { ...data };
    if (payload.status === 'Reading' && !payload.date_started) {
      payload.date_started = today;
    } else if (payload.status === 'Completed') {
      if (!payload.date_finished) payload.date_finished = today;
      if (!payload.date_started) payload.date_started = today;
    }

    const isEdit = editing?.id;
    const res = await fetch(isEdit ? `/api/books/${editing!.id}` : '/api/books', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Save failed');
    setEditing(undefined);
    toast.success(isEdit ? `Updated "${data.title}"` : `Added "${data.title}" to library`);
    load();
  }

  async function deleteBook(b: Book) {
    if (!confirm(`Move "${b.title}" to trash?`)) return;
    const res = await fetch(`/api/books/${b.id}`, { method: 'DELETE' });
    if (res.ok) {
      load();
      toast(`Moved "${b.title}" to trash`, {
        action: {
          label: 'Undo',
          onClick: () => restoreBook(b),
        },
      });
    }
  }

  async function restoreBook(b: Book) {
    const res = await fetch(`/api/books/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restore: true }),
    });
    if (res.ok) {
      toast.success(`Restored "${b.title}"`);
      load();
    }
  }

  async function permanentlyDeleteBook(b: Book) {
    if (!confirm(`Permanently delete "${b.title}"? This can't be undone.`)) return;
    const res = await fetch(`/api/books/${b.id}?permanent=1`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(`Permanently deleted "${b.title}"`);
      load();
    }
  }

  async function quickStatusChange(b: Book) {
    const next = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
    const today = new Date().toISOString().split('T')[0];
    const patchData: Partial<Book> = { status: next };

    if (next === 'Reading' && !b.date_started) {
      patchData.date_started = today;
    } else if (next === 'Completed') {
      if (!b.date_finished) patchData.date_finished = today;
      if (!b.date_started) patchData.date_started = today;
      patchData.is_ongoing = false;
      if (b.total_units != null) {
        patchData.progress = b.total_units;
      } else if (b.latest_units != null) {
        patchData.total_units = b.latest_units;
        patchData.progress = b.latest_units;
      }
      if (b.progress_structure && b.progress_structure !== 'single' && b.parent_total != null) {
        patchData.parent_progress = b.parent_total;
      }
    }

    setBooks((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patchData } : x)));
    const res = await fetch(`/api/books/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchData),
    });
    if (!res.ok) {
      toast.error(`Failed to update status for "${b.title}"`);
      load();
    } else {
      toast.info(`Marked "${b.title}" as ${next}`);
    }
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
        toast.error('Import failed');
      } else {
        const parts = [`Imported ${result.imported} entries`];
        if (result.skippedRows?.length)
          parts.push(`skipped ${result.skippedRows.length} row(s) without a title`);
        if (result.skippedDuplicates)
          parts.push(`skipped ${result.skippedDuplicates} duplicate title(s)`);
        setImportMsg(`${parts.join(', ')}.`);
        toast.success(`Successfully imported ${result.imported} books`);
        load();
      }
    } catch {
      setImportMsg('Could not read that file.');
      toast.error('Could not read file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: 'status' | 'delete' | 'restore' | 'delete_permanent') {
    if (selected.size === 0) return;
    if (
      action === 'delete_permanent' &&
      !confirm(`Permanently delete ${selected.size} entries? This can't be undone.`)
    )
      return;
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
        toast(`Moved ${count} entries to trash`);
      } else if (action === 'status') {
        toast.success(`Updated status for ${count} entries`);
      }
    }
  }

  function pickUpNext() {
    const candidates = books.filter((b) => b.status === 'Plan to Read');
    if (candidates.length === 0) {
      toast.info('No books currently in "Plan to Read"');
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setUpNext(pick);
  }

  async function startReadingUpNext() {
    if (!upNext) return;
    const b = upNext;
    setUpNext(null);
    await quickStatusChange(b);
  }

  const _statusCounts = useMemo(() => {
    const c: Record<string, number> = { All: books.length };
    STATUSES.forEach((s) => {
      c[s] = 0;
    });
    books.forEach((b) => {
      if (c[b.status] != null) c[b.status] += 1;
    });
    return c;
  }, [books]);

  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    let list = books;

    if (statusFilter !== 'All') {
      list = list.filter((b) => b.status === statusFilter);
    }

    if (ratingFilter !== 'All') {
      if (ratingFilter === 'Unrated') {
        list = list.filter((b) => !b.rating || b.rating === 0);
      } else {
        list = list.filter((b) => b.rating && b.rating >= (ratingFilter as number));
      }
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.genre_tags?.toLowerCase().includes(q) ||
          b.type?.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];

      if (sortField === 'title' || sortField === 'author') {
        va = (va || '').toString().toLowerCase();
        vb = (vb || '').toString().toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }

      if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, statusFilter, ratingFilter, deferredSearch, sortField, sortDir]);

  const filtersActive = statusFilter !== 'All' || ratingFilter !== 'All' || search.trim() !== '';

  function clearFilters() {
    setStatusFilter('All');
    setRatingFilter('All');
    setSearch('');
  }

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const typing =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT');
      if (typing) return;

      const currentFiltered = filteredRef.current;
      const rowNavActive = viewMode === 'table' && !showTrash && editing === undefined;
      if (rowNavActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        setFocusedIndex((i) => {
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          const next = i + delta;
          return Math.max(0, Math.min(currentFiltered.length - 1, next < 0 ? 0 : next));
        });
        return;
      }
      if (rowNavActive && e.key === 'Enter' && focusedIndex >= 0 && currentFiltered[focusedIndex]) {
        e.preventDefault();
        setEditing(currentFiltered[focusedIndex]);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' && !showTrash && editing === undefined) {
        e.preventDefault();
        setEditing(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTrash, viewMode, editing, focusedIndex]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-screen-2xl">
      {/* DNS prefetch to cover image CDN — resolves domain without triggering Lighthouse unused preconnect warning */}
      <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
      {/* Header Bar */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold font-serif text-2xl text-text tracking-tight sm:text-3xl">
            Reading Tracker
          </h1>
          <p className="mt-1 line-clamp-1 text-text-muted text-xs sm:line-clamp-none sm:text-sm">
            Web novels, light novels, literature, essays, short stories, and fanfiction.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-border/60 border-t pt-3 sm:w-auto sm:border-0 sm:pt-0">
          <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              <span>{importing ? '...' : 'Import'}</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              asChild
              className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
            >
              <a href="/api/export">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span>Export</span>
              </a>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-text sm:h-9 sm:w-9"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {importMsg && (
        <Card className="mb-4 border-accent-color/30 bg-accent-color/10 p-3 text-text text-xs">
          {importMsg}
        </Card>
      )}

      {/* Dashboard Stats */}
      {!showTrash && <StatsSummary books={books} />}

      {/* Up Next Card Popup */}
      {!showTrash && upNext && (
        <Card className="mb-6 flex flex-col items-center gap-4 border-accent-color/40 bg-accent-color/5 p-4 shadow-sm sm:flex-row">
          {upNext.cover_url ? (
            <img
              src={upNext.cover_url}
              alt=""
              className="h-14 w-10 shrink-0 rounded border border-border object-cover"
            />
          ) : (
            <div className="h-14 w-10 shrink-0 rounded border border-border bg-surface" />
          )}
          <div className="flex-1 text-center sm:text-left">
            <span className="font-bold text-accent-color text-xs uppercase tracking-wider">
              Up Next
            </span>
            <h4 className="line-clamp-1 font-bold text-sm text-text">{upNext.title}</h4>
            {upNext.author && <p className="text-text-muted text-xs">{upNext.author}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={pickUpNext}>
              Pick another
            </Button>
            <Button size="sm" onClick={startReadingUpNext}>
              Start reading
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUpNext(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      <Card className="p-2.5 shadow-xs sm:p-5">
        {/* Toolbar */}
        <div className="mb-4 space-y-3">
          {/* Row 1: Add Entry / Search / View Toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              {!showTrash ? (
                <Button onClick={() => setEditing(null)} className="shadow-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span>Add Entry</span>
                  <kbd className="ml-2 hidden rounded bg-accent-text/15 px-1.5 py-0.5 text-[10px] text-accent-text/70 sm:inline-block">
                    n
                  </kbd>
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShowTrash(false)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  <span>Back to Library</span>
                </Button>
              )}

              {/* View Mode & Trash toggle for Mobile */}
              <div className="flex items-center gap-1.5 sm:hidden">
                {!showTrash && (
                  <div className="relative flex items-center rounded-xl border border-border/80 bg-surface/80 p-0.5 backdrop-blur-md">
                    <div
                      className={cn(
                        'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-lg bg-accent-color shadow-xs transition-all duration-200 ease-out',
                        viewMode === 'grid' ? 'left-0.5' : 'left-[calc(50%+1px)]',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => toggleViewMode('grid')}
                      className={cn(
                        'relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 font-semibold text-xs transition-colors',
                        viewMode === 'grid'
                          ? 'text-accent-text'
                          : 'text-text-muted hover:text-text',
                      )}
                      title="Grid view"
                    >
                      <LayoutGrid className="relative z-10 h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleViewMode('table')}
                      className={cn(
                        'relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 font-semibold text-xs transition-colors',
                        viewMode === 'table'
                          ? 'text-accent-text'
                          : 'text-text-muted hover:text-text',
                      )}
                      title="Table view"
                    >
                      <List className="relative z-10 h-4 w-4" />
                    </button>
                  </div>
                )}
                {!showTrash && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setShowTrash(true)}
                    title="Trash"
                  >
                    <Trash2 className="h-4 w-4 text-text-muted" />
                  </Button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-md sm:flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search title, author, tags... (/)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card-bg pr-8 pl-9 text-text text-xs transition-all focus:outline-none focus:ring-2 focus:ring-accent-color sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-text-muted hover:text-text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Controls Right Group (Desktop) */}
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              {!showTrash && (
                <div className="relative flex items-center rounded-xl border border-border/80 bg-surface/80 p-1 shadow-xs backdrop-blur-md">
                  <div
                    className={cn(
                      'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-accent-color shadow-xs transition-all duration-200 ease-out',
                      viewMode === 'grid' ? 'left-1' : 'left-[calc(50%+2px)]',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => toggleViewMode('grid')}
                    className={cn(
                      'relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-semibold text-xs transition-colors',
                      viewMode === 'grid' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                    )}
                    title="Grid view"
                  >
                    <LayoutGrid className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10 hidden sm:inline">Grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleViewMode('table')}
                    className={cn(
                      'relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-semibold text-xs transition-colors',
                      viewMode === 'table' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                    )}
                    title="Table view"
                  >
                    <List className="relative z-10 h-3.5 w-3.5" />
                    <span className="relative z-10 hidden sm:inline">Table</span>
                  </button>
                </div>
              )}

              {!showTrash && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-text-muted text-xs hover:text-text"
                  onClick={() => setShowTrash(true)}
                  title="View Trash"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Trash</span>
                </Button>
              )}
            </div>
          </div>

          {/* Row 2: Filter Pills Bar */}
          <div className="flex items-center justify-between gap-2 border-border/40 border-t pt-2">
            <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto py-0.5 sm:flex-wrap sm:gap-2">
              {/* When Selection Mode is ACTIVE, show Done & Select All at the VERY FRONT */}
              {selectMode && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 shrink-0 px-2.5 font-semibold text-xs shadow-xs sm:px-3"
                    onClick={() => {
                      setSelectMode(false);
                      setSelected(new Set());
                    }}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    <span>Done</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-accent-color text-xs hover:bg-accent-color/10 sm:px-2.5"
                    onClick={() => {
                      const allSelected =
                        filtered.length > 0 && filtered.every((b) => selected.has(b.id));
                      if (allSelected) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(filtered.map((b) => b.id)));
                      }
                    }}
                  >
                    {filtered.length > 0 && filtered.every((b) => selected.has(b.id))
                      ? 'Deselect All'
                      : `Select All (${filtered.length})`}
                  </Button>
                </>
              )}

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 min-w-0 flex-1 justify-center px-2 text-xs sm:flex-none sm:px-3"
                    title={statusFilter === 'All' ? 'Filter Status' : statusFilter}
                  >
                    <Filter className="h-3.5 w-3.5 text-text-muted sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {statusFilter === 'All' ? 'Status' : statusFilter}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('All')}>
                    All Statuses
                  </DropdownMenuItem>
                  {STATUSES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Rating Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 min-w-0 flex-1 justify-center px-2 text-xs sm:flex-none sm:px-3"
                    title={
                      ratingFilter === 'All'
                        ? 'Filter by Rating'
                        : ratingFilter === 'Unrated'
                          ? 'Unrated'
                          : `${ratingFilter}+ Stars`
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {ratingFilter === 'All'
                        ? 'Rating'
                        : ratingFilter === 'Unrated'
                          ? 'Unrated'
                          : `${ratingFilter}★+`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Filter by Rating</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRatingFilter('All')}>
                    All Ratings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRatingFilter(5)}>
                    5 Stars (5.0)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRatingFilter(4)}>
                    4+ Stars (4.0+)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRatingFilter(3)}>
                    3+ Stars (3.0+)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRatingFilter(2)}>
                    2+ Stars (2.0+)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRatingFilter('Unrated')}>
                    Unrated
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 min-w-0 flex-1 justify-center px-2 text-xs sm:flex-none sm:px-3"
                    title="Sort entries"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-text-muted sm:mr-1.5" />
                    <span className="hidden sm:inline">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSort('updated_at')}>
                    Last Updated {sortField === 'updated_at' && (sortDir === 'desc' ? '↓' : '↑')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('title')}>
                    Title {sortField === 'title' && (sortDir === 'asc' ? 'A-Z' : 'Z-A')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('rating')}>
                    Rating {sortField === 'rating' && (sortDir === 'desc' ? 'High' : 'Low')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && (sortDir === 'asc' ? 'A-Z' : 'Z-A')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('date_finished')}>
                    Finished Date{' '}
                    {sortField === 'date_finished' && (sortDir === 'desc' ? 'Newest' : 'Oldest')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Up Next */}
              {!showTrash && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 min-w-0 flex-1 justify-center px-2 text-accent-color text-xs hover:bg-accent-color/10 sm:flex-none sm:px-3"
                  onClick={pickUpNext}
                  title="Random Up Next"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  <span>
                    <span className="inline sm:hidden">Next</span>
                    <span className="hidden sm:inline">Up Next</span>
                  </span>
                </Button>
              )}

              {/* Selection Mode Button (when selectMode is INACTIVE) */}
              {!selectMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 min-w-0 flex-1 justify-center px-2.5 font-medium text-xs sm:flex-none sm:px-3"
                  onClick={() => {
                    setSelectMode(true);
                    setSelected(new Set());
                  }}
                >
                  Select
                </Button>
              )}
            </div>

            <div className="hidden shrink-0 items-center gap-2 text-text-muted text-xs sm:flex">
              <span>
                <strong>{filtered.length}</strong>
                {filtered.length !== books.length && <span> / {books.length}</span>}{' '}
                {filtered.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectMode && selected.size > 0 && (
          <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-accent-color/40 bg-accent-color/10 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text">{selected.size} selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-text-muted text-xs hover:text-text sm:hidden"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!showTrash && (
                <>
                  <Select value={bulkStatus} onValueChange={(val) => setBulkStatus(val)}>
                    <SelectTrigger className="h-8 w-32 text-xs sm:w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!bulkStatus}
                    onClick={() => bulkAction('status')}
                  >
                    Set Status
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => bulkAction('delete')}>
                    Move to Trash
                  </Button>
                </>
              )}
              {showTrash && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => bulkAction('restore')}>
                    Restore Selected
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => bulkAction('delete_permanent')}
                  >
                    Delete Permanently
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-8 sm:inline-flex"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filters Quick Action Bar */}
        {filtersActive && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-surface/50 p-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text-muted">Active Filters:</span>
              {statusFilter !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card-bg px-2 py-0.5">
                  Status: <strong>{statusFilter}</strong>
                  <X
                    className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                    onClick={() => setStatusFilter('All')}
                  />
                </span>
              )}
              {search.trim() !== '' && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card-bg px-2 py-0.5">
                  Search: <strong>"{search}"</strong>
                  <X
                    className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                    onClick={() => setSearch('')}
                  />
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-accent-color text-xs"
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Content View */}
        {error && <div className="mb-3 font-semibold text-rose-600 text-xs">{error}</div>}

        {loading ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface/60" />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <BookGrid
            books={filtered}
            ratingMode={ratingMode}
            hasAnyBooks={books.length > 0}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={toggleSelect}
            trashMode={showTrash}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
            onRestore={restoreBook}
            onPermanentDelete={permanentlyDeleteBook}
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
            onToggleSelectAll={() => {
              const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
              if (allSelected) {
                setSelected(new Set());
              } else {
                setSelected(new Set(filtered.map((b) => b.id)));
              }
            }}
            focusedId={focusedIndex >= 0 ? (filtered[focusedIndex]?.id ?? null) : null}
            onEdit={(b) => setEditing(b)}
            onDelete={deleteBook}
            onRestore={restoreBook}
            onPermanentDelete={permanentlyDeleteBook}
            onQuickStatus={quickStatusChange}
          />
        )}
      </Card>

      {/* Book Form Modal Dialog */}
      {editing !== undefined && (
        <BookForm
          initial={editing}
          ratingMode={ratingMode}
          existingBooks={books}
          onCancel={() => setEditing(undefined)}
          onSave={saveBook}
        />
      )}
    </div>
  );
}
