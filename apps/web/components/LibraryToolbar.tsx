'use client';

import {
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckSquare,
  Heart,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
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
    statusCounts,
    shelfFilter,
    setShelfFilter,
    allShelves,
    shelfCounts,
    typeFilter,
    setTypeFilter,
    allTypes,
    typeCounts,
    tagFilter,
    setTagFilter,
    allTags,
    tagCounts,
    ongoingFilter,
    setOngoingFilter,
    ongoingCounts,
    ratingFilter,
    setRatingFilter,
    sortField,
    sortDir,
    handleSort,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filteredBooks,
    activeFilterCount,
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
              onClick={() => {
                clearFilters();
                setShowTrash(false);
              }}
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
                onClick={() => {
                  clearFilters();
                  setShowTrash(true);
                }}
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

          {/* Master Filter Hub Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={filtersActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 min-w-0 flex-1 justify-center border-2 px-2.5 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none sm:px-3 transition-all',
                  filtersActive
                    ? 'border-accent-color bg-accent-bg text-accent-text font-black shadow-[2px_2px_0px_var(--border)]'
                    : 'border-border text-text hover:bg-surface',
                )}
                title="Filter Library"
                aria-label="Filter Library"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-current sm:mr-1.5" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-accent-text/20 px-1.5 py-0.2 text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span>Filter Library</span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="cursor-pointer text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Reset All
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <span className="mr-2">📊</span>
                  <span className="flex-1">Status</span>
                  {statusFilter !== 'All' && (
                    <span className="ml-auto pr-1 text-[11px] font-bold text-accent-color">
                      {statusFilter}
                    </span>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter('All')}
                    className="flex items-center justify-between"
                  >
                    <span>All Statuses</span>
                    <span className="text-xs text-text-muted">({statusCounts.All})</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {statusFilter === s && <Check className="h-3.5 w-3.5 text-accent-color" />}
                        <span className={statusFilter === s ? 'font-bold text-accent-color' : ''}>
                          {s}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">({statusCounts[s] ?? 0})</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Format / Type Submenu */}
              {allTypes.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <span className="mr-2">📖</span>
                    <span className="flex-1">Format</span>
                    {typeFilter && (
                      <span className="ml-auto max-w-[80px] truncate pr-1 text-[11px] font-bold text-accent-color">
                        {typeFilter}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                      All Formats
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {allTypes.map((t) => (
                      <DropdownMenuItem
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {typeFilter?.toLowerCase() === t.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-accent-color" />
                          )}
                          <span
                            className={
                              typeFilter?.toLowerCase() === t.toLowerCase()
                                ? 'font-bold text-accent-color'
                                : ''
                            }
                          >
                            {t}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">({typeCounts[t] ?? 0})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Custom Shelves Submenu */}
              {allShelves.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <span className="mr-2">🔖</span>
                    <span className="flex-1">Custom Shelves</span>
                    {shelfFilter && (
                      <span className="ml-auto max-w-[80px] truncate pr-1 text-[11px] font-bold text-accent-color">
                        {shelfFilter}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setShelfFilter(null)}>
                      All Shelves
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {allShelves.map((sh) => (
                      <DropdownMenuItem
                        key={sh}
                        onClick={() => setShelfFilter(sh)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {shelfFilter?.toLowerCase() === sh.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-accent-color" />
                          )}
                          <span
                            className={
                              shelfFilter?.toLowerCase() === sh.toLowerCase()
                                ? 'font-bold text-accent-color'
                                : ''
                            }
                          >
                            🔖 {sh}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">({shelfCounts[sh] ?? 0})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Genres & Tags Submenu */}
              {allTags.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <span className="mr-2">🏷️</span>
                    <span className="flex-1">Genres & Tags</span>
                    {tagFilter && (
                      <span className="ml-auto max-w-[80px] truncate pr-1 text-[11px] font-bold text-accent-color">
                        {tagFilter}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                    <DropdownMenuItem onClick={() => setTagFilter(null)}>All Tags</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {allTags.map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => setTagFilter(tag)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {tagFilter?.toLowerCase() === tag.toLowerCase() && (
                            <Check className="h-3.5 w-3.5 text-accent-color" />
                          )}
                          <span
                            className={
                              tagFilter?.toLowerCase() === tag.toLowerCase()
                                ? 'font-bold text-accent-color'
                                : ''
                            }
                          >
                            {tag}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">({tagCounts[tag] ?? 0})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Serialization State Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <span className="mr-2">⚡</span>
                  <span className="flex-1">Serialization</span>
                  {ongoingFilter !== 'all' && (
                    <span className="ml-auto pr-1 text-[11px] font-bold text-accent-color">
                      {ongoingFilter === 'ongoing' ? 'Ongoing' : 'Standalone'}
                    </span>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setOngoingFilter('all')}>
                    All Works ({ongoingCounts.all})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setOngoingFilter('ongoing')}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {ongoingFilter === 'ongoing' && (
                        <Check className="h-3.5 w-3.5 text-accent-color" />
                      )}
                      <span
                        className={ongoingFilter === 'ongoing' ? 'font-bold text-accent-color' : ''}
                      >
                        Ongoing Serializations
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">({ongoingCounts.ongoing})</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setOngoingFilter('standalone')}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {ongoingFilter === 'standalone' && (
                        <Check className="h-3.5 w-3.5 text-accent-color" />
                      )}
                      <span
                        className={
                          ongoingFilter === 'standalone' ? 'font-bold text-accent-color' : ''
                        }
                      >
                        Completed / Standalone
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">({ongoingCounts.standalone})</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {filtersActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={clearFilters}
                    className="cursor-pointer font-bold text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400"
                  >
                    <X className="mr-2 h-3.5 w-3.5" />
                    <span>Reset All Filters</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rating Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={ratingFilter !== 'All' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 min-w-0 flex-1 justify-center border-2 px-3 font-bold text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:flex-none transition-all',
                  ratingFilter !== 'All'
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black'
                    : 'border-border',
                )}
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

      {/* Composable Active Filters Bar */}
      {filtersActive && (
        <div className="flex items-center justify-between border-2 border-border bg-surface p-2 text-xs shadow-[2px_2px_0px_var(--border)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
              Active:
            </span>
            {statusFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 text-[11px] font-bold uppercase shadow-[1px_1px_0px_var(--border)]">
                Status: <strong className="text-text">{statusFilter}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setStatusFilter('All')}
                />
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 text-[11px] font-bold shadow-[1px_1px_0px_var(--border)]">
                Format: <strong className="text-text">{typeFilter}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setTypeFilter(null)}
                />
              </span>
            )}
            {shelfFilter && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-accent-color/40 bg-accent-color/15 px-2 py-0.5 text-[11px] font-bold text-accent-color shadow-[1px_1px_0px_var(--border)]">
                🔖 <strong className="text-accent-color">{shelfFilter}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-accent-color hover:opacity-70"
                  onClick={() => setShelfFilter(null)}
                />
              </span>
            )}
            {tagFilter && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 text-[11px] font-bold shadow-[1px_1px_0px_var(--border)]">
                🏷️ <strong className="text-text">{tagFilter}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setTagFilter(null)}
                />
              </span>
            )}
            {ongoingFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 text-[11px] font-bold shadow-[1px_1px_0px_var(--border)]">
                ⚡{' '}
                <strong className="text-text">
                  {ongoingFilter === 'ongoing' ? 'Ongoing Only' : 'Standalone'}
                </strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setOngoingFilter('all')}
                />
              </span>
            )}
            {ratingFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 shadow-[1px_1px_0px_var(--border)] dark:text-amber-400">
                <Sparkles className="h-3 w-3 fill-current text-amber-500" />
                <strong>{ratingFilter === 'Unrated' ? 'Unrated' : `${ratingFilter}★+`}</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-amber-500/70 hover:text-amber-500"
                  onClick={() => setRatingFilter('All')}
                />
              </span>
            )}
            {search.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-border bg-card-bg px-2 py-0.5 text-[11px] font-bold shadow-[1px_1px_0px_var(--border)]">
                Search: <strong className="text-text">"{search}"</strong>
                <X
                  className="h-3 w-3 cursor-pointer text-text-muted hover:text-text"
                  onClick={() => setSearch('')}
                />
              </span>
            )}
            {showFavoritesOnly && (
              <span className="inline-flex items-center gap-1.5 border-1.5 border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 shadow-[1px_1px_0px_var(--border)] dark:text-amber-400">
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
              className="h-6 px-2 text-xs font-black uppercase text-accent-color hover:bg-accent-color/10"
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
