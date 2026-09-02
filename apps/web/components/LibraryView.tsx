'use client';

import BookGrid from '@/components/BookGrid';
import BookInspectorDrawer from '@/components/BookInspectorDrawer';
import BookTable from '@/components/BookTable';
import EmptyState from '@/components/EmptyState';
import { PaginationControls } from '@/components/PaginationControls';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';

export function LibraryView() {
  const {
    books,
    loading,
    showTrash,
    deleteBook,
    restoreBook,
    permanentlyDeleteBook,
    quickStatusChange,
    handleSaveInspectorBook,
    handleToggleFavorite,
  } = useLibraryData();

  const {
    filteredBooks,
    paginatedBooks,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    viewMode,
    viewTransitionStyle,
    ratingMode,
    sortField,
    sortDir,
    handleSort,
    filtersActive,
    clearFilters,
  } = useLibraryFiltersContext();

  const {
    focusedIndex,
    selected,
    selectMode,
    toggleSelect,
    toggleSelectAll,
    inspectedBook,
    setInspectedBook,
    setEditing,
    onAddEntry,
  } = useLibraryUI();

  const focusedId = focusedIndex >= 0 ? (filteredBooks[focusedIndex]?.id ?? null) : null;

  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-surface/60" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        key={viewTransitionStyle === 'fade' ? viewMode : undefined}
        className={viewTransitionStyle === 'fade' ? 'view-transition-fade' : ''}
      >
        {filteredBooks.length === 0 ? (
          <EmptyState
            hasAnyBooks={books.length > 0}
            isTrashMode={showTrash}
            filtersActive={filtersActive}
            onClearFilters={clearFilters}
            onAddEntry={onAddEntry}
          />
        ) : viewMode === 'grid' ? (
          <>
            <BookGrid
              books={paginatedBooks}
              ratingMode={ratingMode}
              hasAnyBooks={books.length > 0}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={toggleSelect}
              trashMode={showTrash}
              focusedId={focusedId}
              onEdit={(b) => setInspectedBook(b)}
              onFullEdit={(b) => setEditing(b)}
              onDelete={deleteBook}
              onRestore={restoreBook}
              onPermanentDelete={permanentlyDeleteBook}
              onToggleFavorite={handleToggleFavorite}
            />
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredBooks.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        ) : (
          <>
            <BookTable
              books={paginatedBooks}
              ratingMode={ratingMode}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              trashMode={showTrash}
              hasAnyBooks={books.length > 0}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={() => toggleSelectAll(filteredBooks)}
              focusedId={focusedId}
              onEdit={(b) => setInspectedBook(b)}
              onFullEdit={(b) => setEditing(b)}
              onDelete={deleteBook}
              onRestore={restoreBook}
              onPermanentDelete={permanentlyDeleteBook}
              onQuickStatus={quickStatusChange}
              onToggleFavorite={handleToggleFavorite}
            />
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredBooks.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {inspectedBook && (
        <BookInspectorDrawer
          book={inspectedBook}
          onClose={() => setInspectedBook(null)}
          onEdit={(b) => setEditing(b)}
          onSaveInspectorBook={async (draft) => {
            const updated = await handleSaveInspectorBook(draft);
            if (updated) setInspectedBook(updated);
          }}
          onDelete={deleteBook}
        />
      )}
    </div>
  );
}
