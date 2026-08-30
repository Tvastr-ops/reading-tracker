'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { type Book, type SortDir, type SortField, STATUSES } from '@/lib/types';

function parseShelves(shelfNames?: string | null): string[] {
  if (!shelfNames) return [];
  try {
    const parsed = JSON.parse(shelfNames);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    // fallback comma separated
  }
  return shelfNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useLibraryFilters(books: Book[]) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [shelfFilter, setShelfFilter] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | 'All' | 'Unrated'>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [ratingMode, setRatingMode] = useState<'stars' | 'decimal'>('stars');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [viewTransitionStyle, setViewTransitionStyleState] = useState<'instant' | 'fade'>(
    'instant',
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number | 'all'>(50);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    const savedView = window.localStorage.getItem('viewMode');
    if (savedView === 'grid' || savedView === 'table') setViewMode(savedView);
    const savedTransition = window.localStorage.getItem('view_transition_style');
    if (savedTransition === 'instant' || savedTransition === 'fade') {
      setViewTransitionStyleState(savedTransition);
    }
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
    const savedPageSize = window.localStorage.getItem('pageSize');
    if (savedPageSize === 'all') {
      setPageSizeState('all');
    } else if (savedPageSize) {
      const num = parseInt(savedPageSize, 10);
      if (Number.isFinite(num) && num > 0) setPageSizeState(num);
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
    setViewMode(mode);
    window.localStorage.setItem('viewMode', mode);
  };

  const setViewTransitionStyle = (style: 'instant' | 'fade') => {
    setViewTransitionStyleState(style);
    window.localStorage.setItem('view_transition_style', style);
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

    if (shelfFilter) {
      list = list.filter((b) => {
        const shelves = parseShelves(b.shelf_names);
        return shelves.some((s) => s.toLowerCase() === shelfFilter.toLowerCase());
      });
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
      if (q.startsWith('series:')) {
        const sq = q.substring(7).trim();
        list = list.filter((b) => !sq || (b.series_name?.toLowerCase().includes(sq) ?? false));
      } else if (q.startsWith('shelf:')) {
        const shq = q.substring(6).trim();
        list = list.filter(
          (b) => !shq || parseShelves(b.shelf_names).some((s) => s.toLowerCase().includes(shq)),
        );
      } else if (q.startsWith('#') || q.startsWith('tag:')) {
        const tq = (q.startsWith('#') ? q.substring(1) : q.substring(4)).trim();
        list = list.filter((b) => !tq || (b.genre_tags?.toLowerCase().includes(tq) ?? false));
      } else {
        list = list.filter((b) => {
          const shelves = parseShelves(b.shelf_names);
          return (
            b.title.toLowerCase().includes(q) ||
            (b.author?.toLowerCase().includes(q) ?? false) ||
            (b.series_name?.toLowerCase().includes(q) ?? false) ||
            (b.genre_tags?.toLowerCase().includes(q) ?? false) ||
            shelves.some((s) => s.toLowerCase().includes(q)) ||
            (b.type?.toLowerCase().includes(q) ?? false)
          );
        });
      }
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
  }, [
    books,
    showFavoritesOnly,
    statusFilter,
    shelfFilter,
    ratingFilter,
    deferredSearch,
    sortField,
    sortDir,
  ]);

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

  const allShelves = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      parseShelves(b.shelf_names).forEach((s) => {
        set.add(s);
      });
    });
    return Array.from(set).sort();
  }, [books]);

  const shelfCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allShelves.forEach((sh) => {
      counts[sh] = books.filter((b) =>
        parseShelves(b.shelf_names).some((s) => s.toLowerCase() === sh.toLowerCase()),
      ).length;
    });
    return counts;
  }, [books, allShelves]);

  const setPageSize = (size: number | 'all') => {
    setPageSizeState(size);
    setCurrentPage(1);
    window.localStorage.setItem('pageSize', String(size));
  };

  // Reset to page 1 whenever filters change and current page is out of range
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  }, [filteredBooks.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedBooks = useMemo(() => {
    if (pageSize === 'all') return filteredBooks;
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  const filtersActive =
    statusFilter !== 'All' ||
    shelfFilter !== null ||
    ratingFilter !== 'All' ||
    showFavoritesOnly ||
    search.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('All');
    setShelfFilter(null);
    setRatingFilter('All');
    setShowFavoritesOnly(false);
    setSearch('');
    setCurrentPage(1);
  };

  return {
    statusFilter,
    setStatusFilter: (s: string) => {
      setStatusFilter(s);
      setCurrentPage(1);
    },
    shelfFilter,
    setShelfFilter: (sh: string | null) => {
      setShelfFilter(sh);
      setCurrentPage(1);
    },
    allShelves,
    shelfCounts,
    ratingFilter,
    setRatingFilter: (r: number | 'All' | 'Unrated') => {
      setRatingFilter(r);
      setCurrentPage(1);
    },
    showFavoritesOnly,
    setShowFavoritesOnly: (f: boolean | ((prev: boolean) => boolean)) => {
      setShowFavoritesOnly(f);
      setCurrentPage(1);
    },
    search,
    setSearch: (s: string) => {
      setSearch(s);
      setCurrentPage(1);
    },
    ratingMode,
    toggleRatingMode,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    viewMode,
    toggleViewMode,
    viewTransitionStyle,
    setViewTransitionStyle,
    filteredBooks,
    paginatedBooks,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    statusCounts,
    filtersActive,
    clearFilters,
    handleSort,
  };
}
