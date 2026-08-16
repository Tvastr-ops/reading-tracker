'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import type { Book } from '@/lib/types';
import { useLibraryData } from './LibraryDataContext';
import { useLibraryFiltersContext } from './LibraryFiltersContext';

interface LibraryUIContextValue {
  // Multi-selection
  selected: Set<string>;
  selectMode: boolean;
  setSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  pendingStatus: Book['status'] | '';
  setPendingStatus: React.Dispatch<React.SetStateAction<Book['status'] | ''>>;
  pendingRating: number | 'unrated' | null;
  setPendingRating: React.Dispatch<React.SetStateAction<number | 'unrated' | null>>;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  toggleSelectAll: (books: Book[]) => void;
  resetSelection: () => void;
  bulkAction: (
    action: 'status' | 'rating' | 'delete' | 'restore' | 'delete_permanent',
    overrideValue?: string | number,
    keepSelection?: boolean,
  ) => Promise<void>;
  allSelected: boolean;
  // Keyboard nav
  focusedIndex: number;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  modKey: string;
  // Modal state
  editing: Partial<Book> | null | undefined;
  setEditing: React.Dispatch<React.SetStateAction<Partial<Book> | null | undefined>>;
  inspectedBook: Book | null;
  setInspectedBook: React.Dispatch<React.SetStateAction<Book | null>>;
  upNext: Book | null;
  setUpNext: React.Dispatch<React.SetStateAction<Book | null>>;
  // Actions
  onAddEntry: () => void;
  onEditBook: (book: Book) => void;
  pickUpNext: () => void;
  startReadingUpNext: () => Promise<void>;
  // Shared refs
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const LibraryUIContext = createContext<LibraryUIContextValue | null>(null);

export function LibraryUIProvider({ children }: { children: React.ReactNode }) {
  const { books, setBooks, load, showTrash, quickStatusChange } = useLibraryData();
  const { filteredBooks, viewMode } = useLibraryFiltersContext();

  // Modal state — undefined = closed, null = new entry, Book = edit existing
  const [editing, setEditing] = useState<Partial<Book> | null | undefined>(undefined);
  const [inspectedBook, setInspectedBook] = useState<Book | null>(null);
  const [upNext, setUpNext] = useState<Book | null>(null);

  // Shared DOM ref owned here, attached by LibraryToolbar's search <input>
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Stable modal action callbacks
  const onAddEntry = useCallback(() => setEditing(null), []);
  const onEditBook = useCallback((b: Book) => setEditing(b), []);

  // Up Next logic — extracted from page.tsx
  const pickUpNext = useCallback(() => {
    const candidates = books.filter((b) => b.status === 'Plan to Read');
    if (candidates.length === 0) {
      toast.info('No books currently in "Plan to Read"');
      return;
    }
    setUpNext(candidates[Math.floor(Math.random() * candidates.length)]);
  }, [books]);

  const startReadingUpNext = useCallback(async () => {
    if (!upNext) return;
    const b = upNext;
    setUpNext(null);
    await quickStatusChange(b);
  }, [upNext, quickStatusChange]);

  // Bulk actions — correct signature: { setBooks, onReload }
  const bulk = useBulkActions({ setBooks, onReload: load });

  const allSelected =
    filteredBooks.length > 0 && filteredBooks.every((b) => bulk.selected.has(b.id));

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex, isCommandPaletteOpen, setIsCommandPaletteOpen, modKey } =
    useKeyboardNav({
      filteredBooks,
      inspectedBook,
      showTrash,
      isEditing: editing !== undefined,
      viewMode,
      onAddEntry,
      onEditBook,
      searchInputRef,
    });

  const value: LibraryUIContextValue = {
    // Bulk actions
    selected: bulk.selected,
    selectMode: bulk.selectMode,
    setSelectMode: bulk.setSelectMode,
    pendingStatus: bulk.pendingStatus,
    setPendingStatus: bulk.setPendingStatus,
    pendingRating: bulk.pendingRating,
    setPendingRating: bulk.setPendingRating,
    toggleSelect: bulk.toggleSelect,
    selectAll: bulk.selectAll,
    deselectAll: bulk.deselectAll,
    toggleSelectAll: bulk.toggleSelectAll,
    resetSelection: bulk.resetSelection,
    bulkAction: bulk.bulkAction,
    allSelected,
    // Keyboard nav
    focusedIndex,
    setFocusedIndex,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    modKey,
    // Modal state
    editing,
    setEditing,
    inspectedBook,
    setInspectedBook,
    upNext,
    setUpNext,
    // Actions
    onAddEntry,
    onEditBook,
    pickUpNext,
    startReadingUpNext,
    // Refs
    searchInputRef,
  };

  return <LibraryUIContext.Provider value={value}>{children}</LibraryUIContext.Provider>;
}

export function useLibraryUI(): LibraryUIContextValue {
  const ctx = useContext(LibraryUIContext);
  if (!ctx) {
    throw new Error('useLibraryUI must be used within a <LibraryUIProvider>');
  }
  return ctx;
}
