'use client';

import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  Filter,
  Heart,
  LayoutGrid,
  List,
  Plus,
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
    modKey,
    searchInputRef,
    selectMode,
    setSelectMode,
    allSelected,
    toggleSelectAll,
    resetSelection,
    pickUpNext,
    onAddEntry,
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
    <div className="mb-4 space-y-3">
      {/* Row 1: Add Entry / Search / View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          {!showTrash ? (
            <Button onClick={onAddEntry} className="shadow-sm">
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
                  onClick={() => handleToggleViewMode('grid')}
                  className={cn(
                    'relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 font-semibold text-xs transition-colors',
                    viewMode === 'grid' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                  )}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="relative z-10 h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('table')}
                  className={cn(
                    'relative z-10 flex h-7 cursor-pointer items-center justify-center rounded-lg px-2.5 font-semibold text-xs transition-colors',
                    viewMode === 'table' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                  )}
                  title="Table view"
                  aria-label="Table view"
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
                aria-label="View Trash"
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
            placeholder={`Search title, author, tags... (/ or ${modKey})`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card-bg pr-8 pl-9 text-text text-xs transition-all focus:outline-none focus:ring-2 focus:ring-accent-color sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-text-muted hover:text-text"
              aria-label="Clear search"
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
                onClick={() => handleToggleViewMode('grid')}
                className={cn(
                  'relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-semibold text-xs transition-colors',
                  viewMode === 'grid' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                )}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10 hidden sm:inline">Grid</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleViewMode('table')}
                className={cn(
                  'relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-3 font-semibold text-xs transition-colors',
                  viewMode === 'table' ? 'text-accent-text' : 'text-text-muted hover:text-text',
                )}
                title="Table view"
                aria-label="Table view"
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
              aria-label="View Trash"
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
          {/* When Selection Mode is ACTIVE, show Done & Select All at the FRONT */}
          {selectMode && (
            <>
              <Button
                variant="default"
                size="sm"
                className="h-7 shrink-0 px-2.5 font-semibold text-xs shadow-xs sm:px-3"
                onClick={resetSelection}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                <span>Done</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 px-2 text-accent-color text-xs hover:bg-accent-color/10 sm:px-2.5"
                onClick={() => toggleSelectAll(filteredBooks)}
              >
                {allSelected ? 'Deselect All' : `Select All (${filteredCount})`}
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

          {/* Favorites Filter */}
          {!showTrash && (
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              size="sm"
              className={`h-7 min-w-0 flex-1 justify-center px-2 text-xs sm:flex-none sm:px-3 transition-all ${
                showFavoritesOnly
                  ? 'bg-amber-500/90 text-amber-950 hover:bg-amber-400 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)] font-semibold'
                  : 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 border-amber-500/30'
              }`}
              onClick={() => setShowFavoritesOnly((v) => !v)}
              title={showFavoritesOnly ? 'Show All' : 'Show Favorites Only'}
            >
              <Heart
                className={`h-3.5 w-3.5 sm:mr-1 ${
                  showFavoritesOnly ? 'fill-amber-950 text-amber-950' : 'text-amber-500'
                }`}
              />
              <span className="hidden sm:inline">{showFavoritesOnly ? 'Fav ✓' : 'Favorites'}</span>
            </Button>
          )}

          {/* Up Next */}
          {!showTrash && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 min-w-0 flex-1 justify-center px-2 text-accent-color text-xs hover:bg-accent-color/10 sm:flex-none sm:px-3"
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
              className="h-7 min-w-0 flex-1 justify-center px-2.5 font-medium text-xs sm:flex-none sm:px-3"
              onClick={() => {
                setSelectMode(true);
                resetSelection();
              }}
            >
              Select
            </Button>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-text-muted text-xs sm:flex">
          <span>
            <strong>{filteredCount}</strong>
            {filteredCount !== totalCount && <span> / {totalCount}</span>}{' '}
            {filteredCount === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Filters Quick Action Bar */}
      {filtersActive && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-2 text-xs">
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
            {showFavoritesOnly && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-500 dark:text-amber-400">
                <Heart className="h-3 w-3 fill-amber-500 text-amber-500" /> Favorites
                <X
                  className="h-3 w-3 cursor-pointer text-amber-500/70 hover:text-amber-500 dark:hover:text-amber-300"
                  onClick={() => setShowFavoritesOnly(false)}
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
    </div>
  );
}

export default LibraryToolbar;
