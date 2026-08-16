'use client';

import { useEffect, useRef, useState } from 'react';
import type { Book } from '@/lib/types';

interface UseKeyboardNavProps {
  filteredBooks: Book[];
  inspectedBook: Book | null;
  showTrash: boolean;
  isEditing: boolean;
  viewMode: 'table' | 'grid';
  onAddEntry: () => void;
  onEditBook: (book: Book) => void;
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
  searchInputRef,
}: UseKeyboardNavProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key.toLowerCase() === 'k' || e.code === 'KeyK') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      const active = document.activeElement;
      const typing =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT');
      if (typing) return;

      const currentFiltered = filteredRef.current;
      const currentInspected = inspectedRef.current;
      const navActive = !showTrash && !isEditing;

      if (navActive && ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        setFocusedIndex((i) => {
          const start = i < 0 ? 0 : i;
          let delta = 0;

          if (viewMode === 'grid') {
            const w = window.innerWidth;
            const cols = w >= 1280 ? 6 : w >= 1024 ? 5 : w >= 768 ? 4 : w >= 640 ? 3 : 2;
            if (e.key === 'ArrowRight') delta = 1;
            else if (e.key === 'ArrowLeft') delta = -1;
            else if (e.key === 'ArrowDown') delta = cols;
            else if (e.key === 'ArrowUp') delta = -cols;
          } else {
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
            else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
          }

          const next = start + delta;
          return Math.max(0, Math.min(currentFiltered.length - 1, next));
        });
        return;
      }

      if (navActive && e.key === 'Enter' && focusedIndex >= 0 && currentFiltered[focusedIndex]) {
        e.preventDefault();
        onEditBook(currentFiltered[focusedIndex]);
        return;
      }

      if ((e.key === 'e' || e.key === 'E') && !showTrash && !isEditing) {
        const target =
          currentInspected || (focusedIndex >= 0 ? currentFiltered[focusedIndex] : null);
        if (target) {
          e.preventDefault();
          onEditBook(target);
        }
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' && !showTrash && !isEditing) {
        e.preventDefault();
        onAddEntry();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTrash, viewMode, isEditing, focusedIndex, onAddEntry, onEditBook, searchInputRef]);

  return {
    focusedIndex,
    setFocusedIndex,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    modKey,
  };
}
