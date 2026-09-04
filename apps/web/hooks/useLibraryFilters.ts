import {
  parseAsArrayOf,
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
  // 1. Type-Safe Multi-Select URL Query State via nuqs
  const [statusFilterArray, setStatusFilterArrayState] = useQueryState(
    'status',
    parseAsArrayOf(parseAsString, ',').withDefault([]),
  );

  const [shelfFilterArray, setShelfFilterArrayState] = useQueryState(
    'shelf',
    parseAsArrayOf(parseAsString, ',').withDefault([]),
  );

  const [typeFilterArray, setTypeFilterArrayState] = useQueryState(
    'type',
    parseAsArrayOf(parseAsString, ',').withDefault([]),
  );

  const [tagFilterArray, setTagFilterArrayState] = useQueryState(
    'tag',
    parseAsArrayOf(parseAsString, ',').withDefault([]),
  );

  const [ongoingFilter, setOngoingFilterState] = useQueryState(
    'ongoing',
    parseAsStringLiteral(['all', 'ongoing', 'standalone'] as const).withDefault('all'),
  );

  const [ratingParam, setRatingParamState] = useQueryState('r', parseAsString.withDefault('All'));

  const [showFavoritesOnly, setShowFavoritesOnlyState] = useQueryState(
    'fav',
    parseAsBoolean.withDefault(false),
  );

  const [groupBySeries, setGroupBySeriesState] = useQueryState(
    'series',
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

  // 2. Parse Rating filter from URL param
  const ratingFilter: number | 'All' | 'Unrated' = useMemo(() => {
    if (ratingParam === 'All' || !ratingParam) return 'All';
    if (ratingParam === 'Unrated') return 'Unrated';
    const num = parseFloat(ratingParam);
    return Number.isNaN(num) ? 'All' : num;
  }, [ratingParam]);

  // 3. Local-only preferences (Rating mode, Transition style)
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

  // Multi-Select Toggle Helpers
  const toggleStatusFilter = (status: string) => {
    if (status === 'All') {
      setStatusFilterArrayState([]);
    } else {
      setStatusFilterArrayState((prev) => {
        const current = prev || [];
        const clean = current.filter((s) => s !== 'All');
        return clean.includes(status) ? clean.filter((s) => s !== status) : [...clean, status];
      });
    }
    setCurrentPageState(1);
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilterArrayState((prev) => {
      const current = prev || [];
      return current.some((t) => t.toLowerCase() === type.toLowerCase())
        ? current.filter((t) => t.toLowerCase() !== type.toLowerCase())
        : [...current, type];
    });
    setCurrentPageState(1);
  };

  const toggleShelfFilter = (shelf: string) => {
    setShelfFilterArrayState((prev) => {
      const current = prev || [];
      return current.some((s) => s.toLowerCase() === shelf.toLowerCase())
        ? current.filter((s) => s.toLowerCase() !== shelf.toLowerCase())
        : [...current, shelf];
    });
    setCurrentPageState(1);
  };

  const toggleTagFilter = (tag: string) => {
    setTagFilterArrayState((prev) => {
      const current = prev || [];
      return current.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? current.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...current, tag];
    });
    setCurrentPageState(1);
  };

  // 4. Multi-Dimensional Multi-Select Filter Pipeline
  const filteredBooks = useMemo(() => {
    let list = books;

    // Favorites
    if (showFavoritesOnly) {
      list = list.filter((b) => b.is_favorite);
    }

    // Multi-Status Filter
    if (statusFilterArray.length > 0 && !statusFilterArray.includes('All')) {
      list = list.filter((b) => statusFilterArray.includes(b.status));
    }

    // Multi-Shelf Filter
    if (shelfFilterArray.length > 0) {
      list = list.filter((b) => {
        const shelves = parseShelves(b.shelf_names).map((s) => s.toLowerCase());
        return shelfFilterArray.some((sh) => shelves.includes(sh.toLowerCase()));
      });
    }

    // Multi-Format / Type Filter
    if (typeFilterArray.length > 0) {
      list = list.filter((b) =>
        b.type?.trim()
          ? typeFilterArray.some((t) => t.toLowerCase() === b.type?.trim().toLowerCase())
          : false,
      );
    }

    // Multi-Tag Filter
    if (tagFilterArray.length > 0) {
      list = list.filter((b) => {
        const tags = b.genre_tags?.split(',').map((t) => t.trim().toLowerCase()) || [];
        return tagFilterArray.some((tg) => tags.includes(tg.toLowerCase()));
      });
    }

    // Serialization State
    if (ongoingFilter === 'ongoing') {
      list = list.filter((b) => Boolean(b.is_ongoing));
    } else if (ongoingFilter === 'standalone') {
      list = list.filter((b) => !b.is_ongoing);
    }

    // Rating
    if (ratingFilter !== 'All') {
      if (ratingFilter === 'Unrated') {
        list = list.filter((b) => !b.rating || b.rating === 0);
      } else {
        list = list.filter((b) => b.rating && b.rating >= (ratingFilter as number));
      }
    }

    // Freeform Boolean / Structured Search
    if (deferredSearch.trim()) {
      const matcher = compileSearchQuery(deferredSearch);
      list = list.filter(matcher);
    }

    // Sort
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
    statusFilterArray,
    shelfFilterArray,
    typeFilterArray,
    tagFilterArray,
    ongoingFilter,
    ratingFilter,
    deferredSearch,
    sortField,
    sortDir,
  ]);

  // Single-pass O(N) Metadata and Filter Aggregation
  const {
    statusCounts,
    allShelves,
    shelfCounts,
    allTypes,
    typeCounts,
    allTags,
    tagCounts,
    ongoingCounts,
  } = useMemo(() => {
    const sCounts: Record<string, number> = { All: books.length };
    STATUSES.forEach((s) => {
      sCounts[s] = 0;
    });

    const shCounts: Record<string, number> = {};
    const tCounts: Record<string, number> = {};
    const tgCounts: Record<string, number> = {};
    let ongoingCount = 0;
    let standaloneCount = 0;

    for (let i = 0; i < books.length; i++) {
      const b = books[i];

      // Status
      if (sCounts[b.status] != null) sCounts[b.status]++;

      // Shelves
      const shelves = parseShelves(b.shelf_names);
      for (let j = 0; j < shelves.length; j++) {
        const sh = shelves[j];
        shCounts[sh] = (shCounts[sh] || 0) + 1;
      }

      // Format / Type
      if (b.type?.trim()) {
        const t = b.type.trim();
        tCounts[t] = (tCounts[t] || 0) + 1;
      }

      // Tags
      if (b.genre_tags) {
        const tags = b.genre_tags.split(',');
        for (let k = 0; k < tags.length; k++) {
          const tag = tags[k].trim();
          if (tag) tgCounts[tag] = (tgCounts[tag] || 0) + 1;
        }
      }

      // Ongoing
      if (b.is_ongoing) ongoingCount++;
      else standaloneCount++;
    }

    return {
      statusCounts: sCounts,
      allShelves: Object.keys(shCounts).sort(),
      shelfCounts: shCounts,
      allTypes: Object.keys(tCounts).sort(),
      typeCounts: tCounts,
      allTags: Object.keys(tgCounts).sort(),
      tagCounts: tgCounts,
      ongoingCounts: {
        all: books.length,
        ongoing: ongoingCount,
        standalone: standaloneCount,
      },
    };
  }, [books]);

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

  const isStatusActive = statusFilterArray.length > 0 && !statusFilterArray.includes('All');

  const activeFilterCount =
    (isStatusActive ? statusFilterArray.length : 0) +
    shelfFilterArray.length +
    typeFilterArray.length +
    tagFilterArray.length +
    (ongoingFilter !== 'all' ? 1 : 0) +
    (ratingFilter !== 'All' ? 1 : 0) +
    (showFavoritesOnly ? 1 : 0) +
    (search.trim() !== '' ? 1 : 0);

  const filtersActive = activeFilterCount > 0;

  const clearFilters = () => {
    setStatusFilterArrayState([]);
    setShelfFilterArrayState([]);
    setTypeFilterArrayState([]);
    setTagFilterArrayState([]);
    setOngoingFilterState('all');
    setRatingParamState('All');
    setShowFavoritesOnlyState(false);
    setSearchState('');
    setCurrentPageState(1);
  };

  return {
    // Status
    statusFilter: statusFilterArray,
    isStatusActive,
    toggleStatusFilter,
    setStatusFilter: (s: string[] | string | 'All') => {
      if (Array.isArray(s)) setStatusFilterArrayState(s);
      else if (s === 'All' || !s) setStatusFilterArrayState([]);
      else setStatusFilterArrayState([s]);
      setCurrentPageState(1);
    },
    statusCounts,

    // Shelves
    shelfFilter: shelfFilterArray,
    toggleShelfFilter,
    setShelfFilter: (sh: string[] | string | null) => {
      if (Array.isArray(sh)) setShelfFilterArrayState(sh);
      else if (!sh) setShelfFilterArrayState([]);
      else setShelfFilterArrayState([sh]);
      setCurrentPageState(1);
    },
    allShelves,
    shelfCounts,

    // Types / Formats
    typeFilter: typeFilterArray,
    toggleTypeFilter,
    setTypeFilter: (t: string[] | string | null) => {
      if (Array.isArray(t)) setTypeFilterArrayState(t);
      else if (!t) setTypeFilterArrayState([]);
      else setTypeFilterArrayState([t]);
      setCurrentPageState(1);
    },
    allTypes,
    typeCounts,

    // Tags
    tagFilter: tagFilterArray,
    toggleTagFilter,
    setTagFilter: (tag: string[] | string | null) => {
      if (Array.isArray(tag)) setTagFilterArrayState(tag);
      else if (!tag) setTagFilterArrayState([]);
      else setTagFilterArrayState([tag]);
      setCurrentPageState(1);
    },
    allTags,
    tagCounts,

    // Ongoing
    ongoingFilter,
    setOngoingFilter: (o: 'all' | 'ongoing' | 'standalone') => {
      setOngoingFilterState(o);
      setCurrentPageState(1);
    },
    ongoingCounts,

    // Rating
    ratingFilter,
    setRatingFilter: (r: number | 'All' | 'Unrated') => {
      setRatingParamState(String(r));
      setCurrentPageState(1);
    },

    // Favorites & Series Grouping
    showFavoritesOnly,
    setShowFavoritesOnly: (f: boolean | ((prev: boolean) => boolean)) => {
      setShowFavoritesOnlyState(f);
      setCurrentPageState(1);
    },
    groupBySeries,
    setGroupBySeries: (g: boolean | ((prev: boolean) => boolean)) => {
      setGroupBySeriesState(g);
      setCurrentPageState(1);
    },
    toggleGroupBySeries: () => {
      setGroupBySeriesState((prev) => !prev);
      setCurrentPageState(1);
    },

    // Search
    search,
    setSearch: (s: string) => {
      setSearchState(s);
      setCurrentPageState(1);
    },

    // UI Preferences & Sorting
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
    activeFilterCount,
    filtersActive,
    clearFilters,
    handleSort,
  };
}
