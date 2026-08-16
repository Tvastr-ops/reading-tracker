'use client';

import StatsSummary from '@/components/StatsSummary';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import type { Book } from '@/lib/types';

export function LibraryStats() {
  const { books, showTrash } = useLibraryData();
  const { setStatusFilter } = useLibraryFiltersContext();

  if (showTrash) return null;

  return (
    <StatsSummary
      books={books}
      onStatusSelect={(s) => setStatusFilter(s as Book['status'] | 'All')}
    />
  );
}
