'use client';

import { createContext, useContext } from 'react';
import { useLibrary } from '@/hooks/useLibrary';

type LibraryDataContextValue = ReturnType<typeof useLibrary>;

const LibraryDataContext = createContext<LibraryDataContextValue | null>(null);

export function LibraryDataProvider({ children }: { children: React.ReactNode }) {
  const library = useLibrary();
  return <LibraryDataContext.Provider value={library}>{children}</LibraryDataContext.Provider>;
}

export function useLibraryData(): LibraryDataContextValue {
  const ctx = useContext(LibraryDataContext);
  if (!ctx) {
    throw new Error('useLibraryData must be used within a <LibraryDataProvider>');
  }
  return ctx;
}
