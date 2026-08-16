'use client';

import { BookOpen, Plus, SearchX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasAnyBooks: boolean;
  isTrashMode?: boolean;
  filtersActive?: boolean;
  onClearFilters?: () => void;
  onAddEntry: () => void;
}

export function EmptyState({
  hasAnyBooks,
  isTrashMode,
  filtersActive,
  onClearFilters,
  onAddEntry,
}: EmptyStateProps) {
  if (isTrashMode) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/80 shadow-xs ring-1 ring-border">
          <Trash2 className="h-6 w-6 text-text-muted/60" />
        </div>
        <h3 className="mt-4 font-semibold text-base text-text">Trash is empty</h3>
        <p className="mt-1.5 max-w-sm text-text-muted text-xs sm:text-sm">
          No books or novels are currently marked as deleted.
        </p>
      </div>
    );
  }

  if (!hasAnyBooks) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-color/10 shadow-xs ring-1 ring-accent-color/20">
          <BookOpen className="h-8 w-8 text-accent-color" />
        </div>
        <h3 className="mt-4 font-bold font-serif text-lg text-text">Your library is empty</h3>
        <p className="mt-1.5 max-w-sm text-text-muted text-xs sm:text-sm">
          Start tracking your web novels, light novels, literature, and fanfictions in one place.
        </p>
        <Button onClick={onAddEntry} className="mt-5 shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Add your first book</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/80 shadow-xs ring-1 ring-border">
        <SearchX className="h-6 w-6 text-text-muted/60" />
      </div>
      <h3 className="mt-4 font-semibold text-base text-text">No books match your criteria</h3>
      <p className="mt-1.5 max-w-sm text-text-muted text-xs sm:text-sm">
        Try adjusting your search terms or clearing your status, rating, or favorites filters.
      </p>
      {filtersActive && onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4">
          Clear all filters
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
