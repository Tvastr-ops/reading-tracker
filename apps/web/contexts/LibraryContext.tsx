'use client';

export { useLibraryData } from './LibraryDataContext';
export { useLibraryFiltersContext } from './LibraryFiltersContext';
export { useLibraryUI } from './LibraryUIContext';

import { LibraryDataProvider } from './LibraryDataContext';
import { LibraryFiltersProvider } from './LibraryFiltersContext';
import { LibraryUIProvider } from './LibraryUIContext';

/**
 * Composes the 3 split contexts in strict dependency order:
 * LibraryDataProvider → LibraryFiltersProvider → LibraryUIProvider
 *
 * Nesting order matters:
 * - FiltersProvider consumes books from DataProvider
 * - UIProvider consumes filteredBooks from FiltersProvider and setBooks/load from DataProvider
 */
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  return (
    <LibraryDataProvider>
      <LibraryFiltersProvider>
        <LibraryUIProvider>{children}</LibraryUIProvider>
      </LibraryFiltersProvider>
    </LibraryDataProvider>
  );
}
