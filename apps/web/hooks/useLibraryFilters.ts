import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { compileSearchQuery, parseShelves } from '@/lib/searchParser';
import { type Book, SORT_FIELDS, type SortDir, type SortField, STATUSES } from '@/lib/types';

export function useLibraryFilters(books: Book[]) {
  // 1. Type-Safe URL Query State via nuqs
  const [statusFilter, setStatusFilterState] = useQueryState(
    'status',
    parseAsStringLiteral(['All', ...STATUSES] as const).withDefault('All'),
  );

  const [shelfFilter, setShelfFilterState] = useQueryState('shelf', parseAsString);

  const [showFavoritesOnly, setShowFavoritesOnlyState] = useQueryState(
    'fav',
    parseAsBoolean.withDefault(false),
  );

  const [search, setSearchState] = useQueryState(
    'q',
    parseAsString.withDefault('').withOptions({ shallow: true, throttleMs: 150 }),
  );

  const [sortField, setSortFieldState] = useQueryState(
    'sort',
    parseAsStringLiteral(SORT_FIELDS).withDefault('updated_at'),
  );

  const [sortDir, setSortDirState] = useQueryState(
    'dir',
    parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
  );

  const [viewMode, setViewModeState] = useQueryState(
    'view',
    parseAsStringLiteral(['grid', 'table'] as const).withDefault('grid'),
  );

  const [currentPage, setCurrentPageState] = useQueryState('page', parseAsInteger.withDefault(1));

  const [pageSizeParam, setPageSizeParam] = useQueryState('size', parseAsString.withDefault('50'));

  // 2. Local-only preferences (Rating mode, Transition style, Rating filter)
  const [ratingFilter, setRatingFilterState] = useState<number | 'All' | 'Unrated'>('All');
  const [ratingMode, setRatingMode] = useState<'stars' | 'decimal'>('stars');
  const [viewTransitionStyle, setViewTransitionStyleState] = useState<'instant' | 'fade'>(
    'instant',
  );

  // Load local preferences on mount
  useEffect(() => {
    const savedTransition = window.localStorage.getItem('view_transition_style');
    if (savedTransition === 'instant' || savedTransition === 'fade') {
      setViewTransitionStyleState(savedTransition);
    }
    const savedRatingMode = window.localStorage.getItem('ratingMode');
    if (savedRatingMode === 'stars' || savedRatingMode === 'decimal') {
      setRatingMode(savedRatingMode);
    }
  }, []);

  const pageSize: number | 'all' =
    pageSizeParam === 'all' ? 'all' : parseInt(pageSizeParam, 10) || 50;

  const setPageSize = (size: number | 'all') => {
    setPageSizeParam(String(size));
    setCurrentPageState(1);
  };

  const toggleViewMode = (mode: 'table' | 'grid') => {
    setViewModeState(mode);
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
      setSortDirState((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortFieldState(field);
      setSortDirState('asc');
    }
    setCurrentPageState(1);
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
      const matcher = compileSearchQuery(deferredSearch);
      list = list.filter(matcher);
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

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredBooks.length / pageSize));
  }, [filteredBooks.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPageState(1);
    }
  }, [totalPages, currentPage, setCurrentPageState]);

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
    setStatusFilterState('All');
    setShelfFilterState(null);
    setRatingFilterState('All');
    setShowFavoritesOnlyState(false);
    setSearchState('');
    setCurrentPageState(1);
  };

  return {
    statusFilter,
    setStatusFilter: (s: string) => {
      setStatusFilterState(s as any);
      setCurrentPageState(1);
    },
    shelfFilter,
    setShelfFilter: (sh: string | null) => {
      setShelfFilterState(sh);
      setCurrentPageState(1);
    },
    allShelves,
    shelfCounts,
    ratingFilter,
    setRatingFilter: (r: number | 'All' | 'Unrated') => {
      setRatingFilterState(r);
      setCurrentPageState(1);
    },
    showFavoritesOnly,
    setShowFavoritesOnly: (f: boolean | ((prev: boolean) => boolean)) => {
      setShowFavoritesOnlyState(f);
      setCurrentPageState(1);
    },
    search,
    setSearch: (s: string) => {
      setSearchState(s);
      setCurrentPageState(1);
    },
    ratingMode,
    toggleRatingMode,
    sortField,
    setSortField: (f: SortField) => {
      setSortFieldState(f);
      setCurrentPageState(1);
    },
    sortDir,
    setSortDir: (d: SortDir) => {
      setSortDirState(d);
      setCurrentPageState(1);
    },
    viewMode,
    toggleViewMode,
    viewTransitionStyle,
    setViewTransitionStyle,
    filteredBooks,
    paginatedBooks,
    currentPage,
    setCurrentPage: (p: number | ((prev: number) => number)) => {
      if (typeof p === 'function') {
        setCurrentPageState((prev) => p(prev || 1));
      } else {
        setCurrentPageState(p);
      }
    },
    pageSize,
    setPageSize,
    totalPages,
    statusCounts,
    filtersActive,
    clearFilters,
    handleSort,
  };
}
