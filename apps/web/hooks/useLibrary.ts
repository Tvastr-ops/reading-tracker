'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { normalizeStatusTransition } from '@/lib/progress';
import { type Book, type BookInput, STATUSES } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export type ThemePalette = 'classic' | 'paperback' | 'matcha' | 'nordic';
export type ThemeMode = 'light' | 'dark';

export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [themePalette, setThemePaletteState] = useState<ThemePalette>('classic');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [paperTexture, setPaperTextureState] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const router = useRouter();

  // Initialize theme state from DOM attributes initialized by layout script
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') as ThemePalette;
    const currentMode = document.documentElement.getAttribute('data-mode') as ThemeMode;
    const hasPattern = document.documentElement.getAttribute('data-pattern') === 'true';

    if (currentTheme && ['classic', 'paperback', 'matcha', 'nordic'].includes(currentTheme)) {
      setThemePaletteState(currentTheme);
    }
    setThemeModeState(currentMode === 'dark' ? 'dark' : 'light');
    setPaperTextureState(hasPattern);
  }, []);

  const setThemePalette = useCallback((palette: ThemePalette) => {
    setThemePaletteState(palette);
    document.documentElement.setAttribute('data-theme', palette);
    window.localStorage.setItem('theme_palette', palette);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    document.documentElement.setAttribute('data-mode', mode);
    window.localStorage.setItem('theme_mode', mode);
    window.localStorage.setItem('theme', mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-mode', next);
      window.localStorage.setItem('theme_mode', next);
      window.localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const togglePaperTexture = useCallback(() => {
    setPaperTextureState((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-pattern', 'true');
      } else {
        document.documentElement.removeAttribute('data-pattern');
      }
      window.localStorage.setItem('theme_pattern', String(next));
      return next;
    });
  }, []);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/books${showTrash ? '?trash=1' : ''}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load');
          if (!quiet) setLoading(false);
          return;
        }
        setBooks(data.books || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load books');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [showTrash, router],
  );

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [router]);

  const saveBook = useCallback(
    async (data: BookInput, targetId?: string) => {
      const today = getLocalDateString();
      const payload = { ...data };
      if (payload.status === 'Reading' && !payload.date_started) {
        payload.date_started = today;
      } else if (payload.status === 'Completed') {
        if (!payload.date_finished) payload.date_finished = today;
        if (!payload.date_started) payload.date_started = today;
      }

      const res = await fetch(targetId ? `/api/books/${targetId}` : '/api/books', {
        method: targetId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Save failed');

      if (result.book) {
        setBooks((prev) => {
          const exists = prev.some((x) => x.id === result.book.id);
          if (exists) {
            return prev.map((x) => (x.id === result.book.id ? result.book : x));
          }
          return [result.book, ...prev];
        });
      }
      toast.success(targetId ? `Updated "${data.title}"` : `Added "${data.title}" to library`);
      load(true);
      return result.book as Book;
    },
    [load],
  );

  const restoreBook = useCallback(
    async (b: Book) => {
      const res = await fetch(`/api/books/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });
      if (res.ok) {
        toast.success(`Restored "${b.title}"`);
        load(true);
      }
    },
    [load],
  );

  const deleteBook = useCallback(
    async (b: Book) => {
      if (!confirm(`Move "${b.title}" to trash?`)) return;
      const res = await fetch(`/api/books/${b.id}`, { method: 'DELETE' });
      if (res.ok) {
        load(true);
        toast(`Moved "${b.title}" to trash`, {
          action: {
            label: 'Undo',
            onClick: () => restoreBook(b),
          },
        });
      }
    },
    [load, restoreBook],
  );

  const permanentlyDeleteBook = useCallback(
    async (b: Book) => {
      if (!confirm(`Permanently delete "${b.title}"? This can't be undone.`)) return;
      const res = await fetch(`/api/books/${b.id}?permanent=1`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Permanently deleted "${b.title}"`);
        load(true);
      }
    },
    [load],
  );

  const quickStatusChange = useCallback(
    async (b: Book) => {
      const next = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
      const today = getLocalDateString();
      const patchData: Partial<Book> = normalizeStatusTransition(b, next, today);

      setBooks((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patchData } : x)));
      const res = await fetch(`/api/books/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) {
        toast.error('Failed to update status');
        load(true);
      } else {
        toast.success(`Updated "${b.title}" to ${next}`);
      }
      return patchData;
    },
    [load],
  );

  const handleSaveInspectorBook = useCallback(
    async (draft: Book) => {
      const patchData: Partial<Book> = {
        status: draft.status,
        rating: draft.rating,
        progress: draft.progress,
        parent_progress: draft.parent_progress,
        date_started: draft.date_started,
        date_finished: draft.date_finished,
        notes: draft.notes,
        updated_at: new Date().toISOString(),
      };

      setBooks((prev) => prev.map((x) => (x.id === draft.id ? { ...x, ...patchData } : x)));

      const res = await fetch(`/api/books/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });

      if (!res.ok) {
        toast.error('Failed to save changes');
        load(true);
      } else {
        const { book: updatedBook } = await res.json();
        if (updatedBook) {
          setBooks((prev) => prev.map((x) => (x.id === draft.id ? updatedBook : x)));
        }
        toast.success(`Saved changes for "${draft.title}"`);
        return updatedBook as Book;
      }
    },
    [books, load],
  );

  const handleToggleFavorite = useCallback(
    async (b: Book) => {
      const newVal = !b.is_favorite;
      const patchData = { is_favorite: newVal };
      setBooks((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_favorite: newVal } : x)));

      const res = await fetch(`/api/books/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) {
        toast.error('Failed to update favorite');
        load(true);
      } else {
        toast.success(
          newVal ? `Added "${b.title}" to Favorites ❤️` : `Removed "${b.title}" from Favorites`,
        );
      }
      return patchData;
    },
    [load],
  );

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportMsg('');
      try {
        const text = await file.text();
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: text }),
        });
        const result = await res.json();
        if (!res.ok) {
          setImportMsg(result.error || 'Import failed');
          toast.error('Import failed');
        } else {
          const parts = [`Imported ${result.imported} entries`];
          if (result.skippedRows?.length)
            parts.push(`skipped ${result.skippedRows.length} row(s) without a title`);
          if (result.skippedDuplicates)
            parts.push(`skipped ${result.skippedDuplicates} duplicate title(s)`);
          setImportMsg(`${parts.join(', ')}.`);
          toast.success(`Successfully imported ${result.imported} books`);
          load();
        }
      } catch {
        setImportMsg('Could not read that file.');
        toast.error('Could not read file');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    },
    [load],
  );

  return {
    books,
    setBooks,
    loading,
    error,
    showTrash,
    setShowTrash,
    theme: themeMode,
    themePalette,
    themeMode,
    paperTexture,
    setThemePalette,
    setThemeMode,
    toggleTheme,
    togglePaperTexture,
    importing,
    importMsg,
    handleImportFile,
    load,
    saveBook,
    deleteBook,
    restoreBook,
    permanentlyDeleteBook,
    quickStatusChange,
    handleSaveInspectorBook,
    handleToggleFavorite,
    logout,
  };
}
