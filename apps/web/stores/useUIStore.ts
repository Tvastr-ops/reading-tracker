import { create } from 'zustand';
import type { Book } from '@/lib/types';

export interface UIState {
  // Modal & Drawer State
  editing: Partial<Book> | null | undefined;
  inspectedBook: Book | null;
  upNext: Book | null;

  // Command Palette, Shortcuts & Keyboard Focus
  isCommandPaletteOpen: boolean;
  isShortcutsOpen: boolean;
  focusedIndex: number;

  // Multi-Selection State
  selectMode: boolean;
  selected: Set<string>;
  pendingStatus: Book['status'] | '';
  pendingRating: number | 'unrated' | null;

  // Actions
  setEditing: (
    editing:
      | Partial<Book>
      | null
      | undefined
      | ((prev: Partial<Book> | null | undefined) => Partial<Book> | null | undefined),
  ) => void;
  openAddEntry: () => void;
  openEditBook: (book: Book) => void;
  closeEditor: () => void;
  setInspectedBook: (book: Book | null | ((prev: Book | null) => Book | null)) => void;
  setUpNext: (book: Book | null | ((prev: Book | null) => Book | null)) => void;
  setIsCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsShortcutsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setFocusedIndex: (idx: number | ((prev: number) => number)) => void;
  setSelectMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
  setPendingStatus: (
    status: Book['status'] | '' | ((prev: Book['status'] | '') => Book['status'] | ''),
  ) => void;
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
}

export const useUIStore = create<UIState>((set) => ({
  editing: undefined,
  inspectedBook: null,
  upNext: null,
  isCommandPaletteOpen: false,
  isShortcutsOpen: false,
  focusedIndex: -1,
  selectMode: false,
  selected: new Set<string>(),
  pendingStatus: '',
  pendingRating: null,

  setEditing: (updater) =>
    set((state) => ({
      editing: typeof updater === 'function' ? updater(state.editing) : updater,
    })),

  openAddEntry: () => set({ editing: null }),
  openEditBook: (book) => set({ editing: book }),
  closeEditor: () => set({ editing: undefined }),

  setInspectedBook: (updater) =>
    set((state) => ({
      inspectedBook: typeof updater === 'function' ? updater(state.inspectedBook) : updater,
    })),

  setUpNext: (updater) =>
    set((state) => ({
      upNext: typeof updater === 'function' ? updater(state.upNext) : updater,
    })),

  setIsCommandPaletteOpen: (updater) =>
    set((state) => ({
      isCommandPaletteOpen:
        typeof updater === 'function' ? updater(state.isCommandPaletteOpen) : updater,
    })),

  setIsShortcutsOpen: (updater) =>
    set((state) => ({
      isShortcutsOpen: typeof updater === 'function' ? updater(state.isShortcutsOpen) : updater,
    })),

  setFocusedIndex: (updater) =>
    set((state) => ({
      focusedIndex: typeof updater === 'function' ? updater(state.focusedIndex) : updater,
    })),

  setSelectMode: (updater) =>
    set((state) => {
      const nextMode = typeof updater === 'function' ? updater(state.selectMode) : updater;
      return {
        selectMode: nextMode,
        selected: nextMode ? state.selected : new Set<string>(),
        pendingStatus: '',
        pendingRating: null,
      };
    }),

  setPendingStatus: (updater) =>
    set((state) => ({
      pendingStatus: typeof updater === 'function' ? updater(state.pendingStatus) : updater,
    })),

  setPendingRating: (updater) =>
    set((state) => ({
      pendingRating: typeof updater === 'function' ? updater(state.pendingRating) : updater,
    })),

  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selected: next };
    }),

  selectAll: (ids) =>
    set(() => ({
      selected: new Set(ids),
    })),

  deselectAll: () =>
    set(() => ({
      selected: new Set<string>(),
    })),

  toggleSelectAll: (books) =>
    set((state) => {
      const allSelected = books.length > 0 && books.every((b) => state.selected.has(b.id));
      return {
        selected: allSelected ? new Set<string>() : new Set(books.map((b) => b.id)),
      };
    }),

  resetSelection: () =>
    set(() => ({
      selected: new Set<string>(),
      selectMode: false,
      pendingStatus: '',
      pendingRating: null,
    })),
}));
