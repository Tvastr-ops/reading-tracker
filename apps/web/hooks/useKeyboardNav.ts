'use client';

import { useEffect, useRef, useState } from 'react';
import type { Book } from '@/lib/types';
import { useUIStore } from '@/stores/useUIStore';

interface UseKeyboardNavProps {
  filteredBooks: Book[];
  inspectedBook: Book | null;
  showTrash: boolean;
  isEditing: boolean;
  viewMode: 'table' | 'grid';
  onAddEntry: () => void;
  onEditBook: (book: Book) => void;
  onToggleFavorite?: (book: Book) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useKeyboardNav({
  filteredBooks,
  inspectedBook,
  showTrash,
  isEditing,
  viewMode,
  onAddEntry,
  onEditBook,
  onToggleFavorite,
  searchInputRef,
}: UseKeyboardNavProps) {
  const focusedIndex = useUIStore((s) => s.focusedIndex);
  const setFocusedIndex = useUIStore((s) => s.setFocusedIndex);
  const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useUIStore((s) => s.setIsCommandPaletteOpen);
  const isShortcutsOpen = useUIStore((s) => s.isShortcutsOpen);
  const setIsShortcutsOpen = useUIStore((s) => s.setIsShortcutsOpen);
  const toggleSelect = useUIStore((s) => s.toggleSelect);
  const resetSelection = useUIStore((s) => s.resetSelection);
  const selected = useUIStore((s) => s.selected);

  const [modKey, setModKey] = useState('Ctrl+K');

  useEffect(() => {
    if (typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      setModKey('⌘K');
    }
  }, []);

  const filteredRef = useRef(filteredBooks);
  filteredRef.current = filteredBooks;
  const inspectedRef = useRef(inspectedBook);
  inspectedRef.current = inspectedBook;
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 1. Command Palette Shortcut (Cmd+K / Ctrl+K) always allowed
      if ((e.key.toLowerCase() === 'k' || e.code === 'KeyK') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Typing Guard: Never intercept keystrokes when typing in any form input
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          (active as HTMLElement).isContentEditable);

      if (isTyping) {
        // Allow Escape inside search bar to blur it
        if (e.key === 'Escape') {
          (active as HTMLElement).blur();
        }
        return;
      }

      // 3. Modifier Guard: Do not hijack native browser hotkeys (e.g. Ctrl+R, Alt+Left)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // 4. Modal Open Guard: Do not intercept when modals or drawers are active
      if (isEditing || isShortcutsOpen || isCommandPaletteOpen) {
        if (e.key === 'Escape') {
          setIsShortcutsOpen(false);
          setIsCommandPaletteOpen(false);
        }
        return;
      }

      const currentFiltered = filteredRef.current;
      const currentInspected = inspectedRef.current;
      const currentFocused = focusedIndexRef.current;
      const navActive = !showTrash;

      // 5. Global Hotkeys
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (selectedRef.current.size > 0) {
          e.preventDefault();
          resetSelection();
        } else if (currentFocused >= 0) {
          e.preventDefault();
          setFocusedIndex(-1);
        }
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && navActive) {
        e.preventDefault();
        onAddEntry();
        return;
      }

      // 6. Spatial & Vim Navigation (Arrows or H / J / K / L)
      const isDown = e.key === 'ArrowDown' || e.key === 'j';
      const isUp = e.key === 'ArrowUp' || e.key === 'k';
      const isLeft = e.key === 'ArrowLeft' || e.key === 'h';
      const isRight = e.key === 'ArrowRight' || e.key === 'l';

      if (navActive && (isDown || isUp || isLeft || isRight)) {
        e.preventDefault();
        setFocusedIndex((i) => {
          const start = i < 0 ? 0 : i;
          let delta = 0;

          if (viewMode === 'grid') {
            const w = window.innerWidth;
            const cols = w >= 1536 ? 6 : w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 640 ? 3 : 2;
            if (isRight) delta = 1;
            else if (isLeft) delta = -1;
            else if (isDown) delta = cols;
            else if (isUp) delta = -cols;
          } else {
            if (isDown || isRight) delta = 1;
            else if (isUp || isLeft) delta = -1;
          }

          const next = start + delta;
          return Math.max(0, Math.min(currentFiltered.length - 1, next));
        });
        return;
      }

      // 7. Actions on Focused Book Card
      const focusedBook = currentFocused >= 0 ? currentFiltered[currentFocused] : null;

      if (navActive && focusedBook) {
        // Enter -> Inspect / Edit
        if (e.key === 'Enter') {
          e.preventDefault();
          onEditBook(focusedBook);
          return;
        }

        // E -> Edit
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          onEditBook(focusedBook);
          return;
        }

        // X or Space -> Toggle selection for bulk actions
        if (e.key === 'x' || e.key === 'X' || e.key === ' ') {
          e.preventDefault();
          toggleSelect(focusedBook.id);
          return;
        }

        // F -> Toggle Favorite
        if ((e.key === 'f' || e.key === 'F') && onToggleFavorite) {
          e.preventDefault();
          onToggleFavorite(focusedBook);
          return;
        }
      } else if (navActive && currentInspected) {
        // Fallback for drawer open inspection
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          onEditBook(currentInspected);
          return;
        }
        if ((e.key === 'f' || e.key === 'F') && onToggleFavorite) {
          e.preventDefault();
          onToggleFavorite(currentInspected);
          return;
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showTrash,
    viewMode,
    isEditing,
    isShortcutsOpen,
    isCommandPaletteOpen,
    onAddEntry,
    onEditBook,
    onToggleFavorite,
    searchInputRef,
    setIsCommandPaletteOpen,
    setIsShortcutsOpen,
    setFocusedIndex,
    toggleSelect,
    resetSelection,
  ]);

  return {
    focusedIndex,
    setFocusedIndex,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    modKey,
  };
}
