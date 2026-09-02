'use client';

import { createContext, useCallback, useContext, useRef } from 'react';
import { toast } from 'sonner';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import type { Book } from '@/lib/types';
import { useUIStore } from '@/stores/useUIStore';
import { useLibraryData } from './LibraryDataContext';
import { useLibraryFiltersContext } from './LibraryFiltersContext';

interface LibraryUIContextValue {
  // Multi-selection
  selected: Set<string>;
  selectMode: boolean;
  setSelectMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  pendingStatus: Book['status'] | '';
  setPendingStatus: (
    status: Book['status'] | '' | ((prev: Book['status'] | '') => Book['status'] | ''),
  ) => void;
  pendingRating: number | 'unrated' | null;
  setPendingRating: (
    rating:
      | number
      | 'unrated'
      | null
      | ((prev: number | 'unrated' | null) => number | 'unrated' | null),
  ) => void;
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
  setFocusedIndex: (idx: number | ((prev: number) => number)) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  modKey: string;
  // Modal state
  editing: Partial<Book> | null | undefined;
  setEditing: (
    editing:
      | Partial<Book>
      | null
      | undefined
      | ((prev: Partial<Book> | null | undefined) => Partial<Book> | null | undefined),
  ) => void;
  inspectedBook: Book | null;
  setInspectedBook: (book: Book | null | ((prev: Book | null) => Book | null)) => void;
  upNext: Book | null;
  setUpNext: (book: Book | null | ((prev: Book | null) => Book | null)) => void;
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
  const { books, setBooks, load, showTrash, quickStatusChange, handleToggleFavorite } =
    useLibraryData();
  const { filteredBooks, viewMode } = useLibraryFiltersContext();

  // Zustand Store Slices & Actions
  const editing = useUIStore((s) => s.editing);
  const setEditing = useUIStore((s) => s.setEditing);
  const openAddEntry = useUIStore((s) => s.openAddEntry);
  const openEditBook = useUIStore((s) => s.openEditBook);

  const inspectedBook = useUIStore((s) => s.inspectedBook);
  const setInspectedBook = useUIStore((s) => s.setInspectedBook);

  const upNext = useUIStore((s) => s.upNext);
  const setUpNext = useUIStore((s) => s.setUpNext);

  const focusedIndex = useUIStore((s) => s.focusedIndex);
  const setFocusedIndex = useUIStore((s) => s.setFocusedIndex);

  const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useUIStore((s) => s.setIsCommandPaletteOpen);

  // Shared DOM ref owned here, attached by LibraryToolbar's search <input>
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Up Next logic
  const pickUpNext = useCallback(() => {
    const candidates = books.filter((b) => b.status === 'Plan to Read');
    if (candidates.length === 0) {
      toast.info('No books currently in "Plan to Read"');
      return;
    }
    setUpNext(candidates[Math.floor(Math.random() * candidates.length)]);
  }, [books, setUpNext]);

  const startReadingUpNext = useCallback(async () => {
    if (!upNext) return;
    const b = upNext;
    setUpNext(null);
    await quickStatusChange(b);
  }, [upNext, setUpNext, quickStatusChange]);

  // Bulk actions connected via Zustand
  const bulk = useBulkActions({ setBooks, onReload: load });

  const allSelected =
    filteredBooks.length > 0 && filteredBooks.every((b) => bulk.selected.has(b.id));

  // Keyboard navigation
  const { modKey } = useKeyboardNav({
    filteredBooks,
    inspectedBook,
    showTrash,
    isEditing: editing !== undefined,
    viewMode,
    onAddEntry: openAddEntry,
    onEditBook: openEditBook,
    onToggleFavorite: handleToggleFavorite,
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
    onAddEntry: openAddEntry,
    onEditBook: openEditBook,
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
