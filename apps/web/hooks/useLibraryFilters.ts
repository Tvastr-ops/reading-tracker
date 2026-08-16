'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { type Book, type SortDir, type SortField, STATUSES } from '@/lib/types';

export function useLibraryFilters(books: Book[]) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState<number | 'All' | 'Unrated'>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [ratingMode, setRatingMode] = useState<'stars' | 'decimal'>('stars');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Load saved preferences from localStorage on mount
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
    const savedRatingMode = window.localStorage.getItem('ratingMode');
    if (savedRatingMode === 'stars' || savedRatingMode === 'decimal') {
      setRatingMode(savedRatingMode);
    }
  }, []);

  // Sync state to localStorage
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

  const toggleViewMode = (mode: 'table' | 'grid') => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (
        document as unknown as { startViewTransition: (cb: () => void) => void }
      ).startViewTransition(() => {
        setViewMode(mode);
      });
    } else {
      setViewMode(mode);
    }
    window.localStorage.setItem('viewMode', mode);
  };

  const toggleRatingMode = () => {
    const next = ratingMode === 'stars' ? 'decimal' : 'stars';
    setRatingMode(next);
    window.localStorage.setItem('ratingMode', next);
    toast.info(`Switched rating mode to ${next === 'stars' ? 'Stars (★)' : 'Decimal (#.#)'}`);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const deferredSearch = useDeferredValue(search);

  const filteredBooks = useMemo(() => {
    let list = books;

    if (showFavoritesOnly) {
      list = list.filter((b) => b.is_favorite);
    }

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
        const sa = (va || '').toString().toLowerCase();
        const sb = (vb || '').toString().toLowerCase();
        if (sa < sb) return sortDir === 'asc' ? -1 : 1;
        if (sa > sb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }

      if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;

      if (typeof va === 'string' && typeof vb === 'string') {
        const sa = va.toLowerCase();
        const sb = vb.toLowerCase();
        if (sa < sb) return sortDir === 'asc' ? -1 : 1;
        if (sa > sb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [books, showFavoritesOnly, statusFilter, ratingFilter, deferredSearch, sortField, sortDir]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { All: books.length };
    STATUSES.forEach((s) => {
      c[s] = 0;
    });
    books.forEach((b) => {
      if (c[b.status] != null) c[b.status] += 1;
    });
    return c;
  }, [books]);

  const filtersActive =
    statusFilter !== 'All' || ratingFilter !== 'All' || showFavoritesOnly || search.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('All');
    setRatingFilter('All');
    setShowFavoritesOnly(false);
    setSearch('');
  };

  return {
    statusFilter,
    setStatusFilter,
    ratingFilter,
    setRatingFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    search,
    setSearch,
    ratingMode,
    toggleRatingMode,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    viewMode,
    toggleViewMode,
    filteredBooks,
    statusCounts,
    filtersActive,
    clearFilters,
    handleSort,
  };
}
