'use client';

import { createContext, useContext } from 'react';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import { useLibraryData } from './LibraryDataContext';

type LibraryFiltersContextValue = ReturnType<typeof useLibraryFilters>;

const LibraryFiltersContext = createContext<LibraryFiltersContextValue | null>(null);

export function LibraryFiltersProvider({ children }: { children: React.ReactNode }) {
  const { books } = useLibraryData();
  const filters = useLibraryFilters(books);
  return (
    <LibraryFiltersContext.Provider value={filters}>{children}</LibraryFiltersContext.Provider>
  );
}

export function useLibraryFiltersContext(): LibraryFiltersContextValue {
  const ctx = useContext(LibraryFiltersContext);
  if (!ctx) {
    throw new Error('useLibraryFiltersContext must be used within a <LibraryFiltersProvider>');
  }
  return ctx;
}
