'use client';

import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckSquare,
  Filter,
  Heart,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';
import { STATUSES } from '@/lib/types';
import { cn } from '@/lib/utils';

export function LibraryToolbar() {
  const { books, showTrash, setShowTrash } = useLibraryData();
  const {
    search,
    setSearch,
    viewMode,
    toggleViewMode,
    statusFilter,
    setStatusFilter,
    shelfFilter,
    setShelfFilter,
    allShelves,
    shelfCounts,
    ratingFilter,
    setRatingFilter,
    sortField,
    sortDir,
    handleSort,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filteredBooks,
    filtersActive,
    clearFilters,
  } = useLibraryFiltersContext();
  const {
    searchInputRef,
    selectMode,
    setSelectMode,
    allSelected,
    toggleSelectAll,
    resetSelection,
    deselectAll,
    pickUpNext,
  } = useLibraryUI();

  const totalCount = books.length;
  const filteredCount = filteredBooks.length;

  const handleToggleViewMode = (mode: 'table' | 'grid') => {
    toggleViewMode(mode);
    if (mode === 'grid') {
      setSelectMode(false);
      resetSelection();
    }
  };

  return (
    <div className="mb-5 space-y-3">
      {/* Row 1: Search Bar & View Mode Controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input (Expands across available space) */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search title, author, series, tags... (Press / to focus)`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full border-2 border-border bg-card-bg pr-9 pl-9 text-text text-xs sm:text-sm font-medium shadow-[2px_2px_0px_var(--border)] transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-border focus:shadow-[3.5px_3.5px_0px_var(--border)] focus:translate-x-[-1px] focus:translate-y-[-1px] focus:bg-surface/90"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-text-muted hover:text-text"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute top-1/2 right-3 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-muted">
              /
            </kbd>
          )}
        </div>

        {/* View Mode & Utility Controls */}
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {showTrash ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrash(false)}
              className="h-10 border-2 border-border font-black text-xs uppercase shadow-[2px_2px_0px_var(--border)]"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              <span>Back to Library</span>
            </Button>
          ) : (
            <>
              {/* Neo-Brutalist Grid / Table Switcher */}
              <div className="flex items-center border-2 border-border bg-surface p-1 shadow-[2px_2px_0px_var(--border)]">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('grid')}
                  className={cn(
                    'flex h-7 cursor-pointer items-center gap-1.5 px-3 font-black text-xs uppercase tracking-wider transition-all',
                    viewMode === 'grid'
                      ? 'bg-accent-bg text-accent-text shadow-[1.5px_1.5px_0px_var(--border)]'
                      : 'text-text-muted hover:text-text',
                  )}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleViewMode('table')}
                  className={cn(
                    'flex h-7 cursor-pointer items-center gap-1.5 px-3 font-black text-xs uppercase tracking-wider transition-all',
                    viewMode === 'table'
                      ? 'bg-accent-bg text-accent-text shadow-[1.5px_1.5px_0px_var(--border)]'
                      : 'text-text-muted hover:text-text',
                  )}
                  title="Table view"
                  aria-label="Table view"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>

              {/* Trash View Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-9.5 border-2 border-border px-3 text-text-muted text-xs shadow-[2px_2px_0px_var(--border)] hover:text-rose-500 hover:border-rose-500/80 transition-all"
                onClick={() => setShowTrash(true)}
                title="View Trash"
                aria-label="View Trash"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline font-bold uppercase">Trash</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Filter Pills Bar */}
      <div className="flex items-center justify-between gap-2 border-t-2 border-border/40 pt-2.5">
        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5 sm:flex-wrap sm:gap-2">
          {/* When Selection Mode is ACTIVE, show Done & Select All at the FRONT */}
          {selectMode && (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-8 shrink-0 border-2 border-border px-2.5 font-black text-xs uppercase shadow-[2px_2px_0px_var(--border)] sm:px-3"
                onClick={resetSelection}
                title="Done Selecting"
              >
                <Check className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Done</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 border-2 border-border px-2 text-accent-color font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] hover:bg-accent-color/10 sm:px-2.5"
                onClick={() => toggleSelectAll(filteredBooks)}
                title={allSelected ? 'Deselect All Entries' : 'Select All Filtered Entries'}
              >
                {allSelected ? (
                  <>
                    <span className="inline sm:hidden">None</span>
                    <span className="hidden sm:inline">Deselect All</span>
                  </>
                ) : (
                  <>
                    <span className="inline sm:hidden">All ({filteredCount})</span>
                    <span className="hidden sm:inline">Select All ({filteredCount})</span>
                  </>
                )}
              </Button>
            </>
          )}

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-0 flex-1 justify-center border-2 border-border px-3 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none"
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
              <DropdownMenuItem
                onClick={() => {
                  setStatusFilter('All');
                  setShelfFilter(null);
                }}
              >
                All Statuses
              </DropdownMenuItem>
              {STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                  {s}
                </DropdownMenuItem>
              ))}

              {allShelves.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <span className="mr-2">🔖</span>
                      <span>Custom Shelves</span>
                      {shelfFilter && (
                        <span className="ml-auto pr-2 text-accent-color text-xs font-semibold">
                          ({shelfFilter})
                        </span>
                      )}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setShelfFilter(null)}>
                        All Shelves
                      </DropdownMenuItem>
                      {allShelves.map((sh) => (
                        <DropdownMenuItem key={sh} onClick={() => setShelfFilter(sh)}>
                          <span className="mr-1.5">🔖</span>
                          <span className="flex-1 font-medium">{sh}</span>
                          <span className="ml-2 text-text-muted text-xs">
                            ({shelfCounts[sh] ?? 0})
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Shelf Filter Chip */}
          {shelfFilter && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 gap-1.5 border-2 border-border bg-accent-color/15 px-2.5 font-bold text-accent-color text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] hover:bg-accent-color/25"
              onClick={() => setShelfFilter(null)}
              title="Clear shelf filter"
            >
              <span>🔖 {shelfFilter.toUpperCase()}</span>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Rating Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-0 flex-1 justify-center border-2 border-border px-3 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none"
                title={
                  ratingFilter === 'All'
                    ? 'Filter by Rating'
                    : ratingFilter === 'Unrated'
                      ? 'Unrated'
                      : `${ratingFilter}+ Stars`
                }
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 sm:mr-1.5" />
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
              <DropdownMenuItem onClick={() => setRatingFilter(5)}>5 Stars (5.0)</DropdownMenuItem>
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
                className="h-8 min-w-0 flex-1 justify-center border-2 border-border px-3 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none"
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

          {/* Favorites Filter */}
          {!showTrash && (
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              className={`h-8 min-w-0 flex-1 justify-center border-2 px-3 text-xs uppercase font-bold shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none transition-all ${
                showFavoritesOnly
                  ? 'bg-amber-500 text-amber-950 border-amber-600 font-black'
                  : 'border-border text-amber-500 hover:bg-amber-500/10'
              }`}
              onClick={() => setShowFavoritesOnly((v) => !v)}
              title={showFavoritesOnly ? 'Show All' : 'Show Favorites Only'}
            >
              <Heart
                className={`h-3.5 w-3.5 sm:mr-1 ${
                  showFavoritesOnly ? 'fill-amber-950 text-amber-950' : 'text-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {showFavoritesOnly ? 'Favorites ✓' : 'Favorites'}
              </span>
            </Button>
          )}

          {/* Up Next */}
          {!showTrash && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-0 flex-1 justify-center border-2 border-border px-3 text-accent-color font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] hover:bg-accent-color/10 sm:flex-none"
              onClick={pickUpNext}
              title="Random Up Next"
            >
              <Sparkles className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Up Next</span>
            </Button>
          )}

          {/* Selection Mode Button (when selectMode is INACTIVE) */}
          {!selectMode && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-0 flex-1 justify-center border-2 border-border px-2.5 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none sm:px-3"
              onClick={() => {
                deselectAll();
                setSelectMode(true);
              }}
              title="Select Multiple Entries"
              aria-label="Select Multiple Entries"
            >
              <CheckSquare className="h-3.5 w-3.5 text-text-muted sm:mr-1" />
              <span className="hidden sm:inline">Select</span>
            </Button>
          )}
        </div>

        {/* Entries Counter Badge */}
        <div className="hidden shrink-0 items-center border-2 border-border bg-surface px-2.5 py-1 text-xs font-mono font-bold shadow-[1.5px_1.5px_0px_var(--border)] text-text sm:flex">
          <span>
            {filteredCount}
            {filteredCount !== totalCount && <span> / {totalCount}</span>}{' '}
            <span className="text-text-muted text-[10px] uppercase font-sans font-black">
              {filteredCount === 1 ? 'Entry' : 'Entries'}
            </span>
          </span>
        </div>
      </div>

      {/* Filters Quick Action Bar */}
      {filtersActive && (
        <div className="flex items-center justify-between border-2 border-border bg-surface p-2 text-xs shadow-[2px_2px_0px_var(--border)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-text-muted text-[10.5px]">
              Active:
            </span>
            {statusFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 font-bold uppercase text-[11px] shadow-[1px_1px_0px_var(--border)]">
                Status: <strong className="text-text">{statusFilter}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setStatusFilter('All')}
                />
              </span>
            )}
            {search.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 font-bold text-[11px] shadow-[1px_1px_0px_var(--border)]">
                Search: <strong className="text-text">"{search}"</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setSearch('')}
                />
              </span>
            )}
            {showFavoritesOnly && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-amber-500/50 bg-amber-500/15 px-2 py-0.5 font-bold text-[11px] text-amber-600 dark:text-amber-400 shadow-[1px_1px_0px_var(--border)]">
                <Heart className="h-3 w-3 fill-current text-amber-500" /> Favorites
                <X
                  className="h-3 w-3 cursor-pointer text-amber-500/70 hover:text-amber-500 dark:hover:text-amber-300"
                  onClick={() => setShowFavoritesOnly(false)}
                />
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-accent-color font-black text-xs uppercase hover:bg-accent-color/10"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibraryToolbar;
