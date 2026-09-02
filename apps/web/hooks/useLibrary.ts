'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { client } from '@/lib/client';
import { normalizeStatusTransition } from '@/lib/progress';
import { type Book, type BookInput, STATUSES } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export type ThemePalette = 'classic' | 'paperback' | 'matcha' | 'nordic';
export type ThemeMode = 'light' | 'dark';

export function useLibrary() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showTrash, setShowTrash] = useState(false);
  const [themePalette, setThemePaletteState] = useState<ThemePalette>('classic');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [paperTexture, setPaperTextureState] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

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

  // 1. TanStack Query with Typed Hono RPC
  const {
    data: booksData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['books', { showTrash }],
    queryFn: async () => {
      const res = await client.api.books.$get({
        query: {
          all: '1',
          trash: showTrash ? '1' : '0',
        },
      });

      if ((res.status as number) === 401) {
        router.push('/login');
        throw new Error('Unauthorized');
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as any)?.error || 'Failed to load books');
      }

      const data = await res.json();
      return (data.books as Book[]) || [];
    },
  });

  const books: Book[] = booksData || [];
  const error = queryError ? (queryError as Error).message : '';

  const setBooks = useCallback(
    (updater: Book[] | ((prev: Book[]) => Book[])) => {
      queryClient.setQueryData<Book[]>(['books', { showTrash }], (prev) => {
        const old = prev || [];
        return typeof updater === 'function' ? updater(old) : updater;
      });
    },
    [queryClient, showTrash],
  );

  const load = useCallback(
    async (_quiet = false) => {
      await refetch();
    },
    [refetch],
  );

  const logout = useCallback(async () => {
    try {
      await client.api.auth.logout.$post();
    } finally {
      queryClient.clear();
      router.push('/login');
    }
  }, [router, queryClient]);

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

      try {
        let resultBook: Book;
        if (targetId) {
          const res = await client.api.books[':id'].$patch({
            param: { id: targetId },
            json: payload as any,
          });
          const resJson = await res.json();
          if (!res.ok) throw new Error((resJson as any)?.error || 'Save failed');
          resultBook = (resJson as any).book;
        } else {
          const res = await client.api.books.$post({
            json: payload as any,
          });
          const resJson = await res.json();
          if (!res.ok) throw new Error((resJson as any)?.error || 'Save failed');
          resultBook = (resJson as any).book;
        }

        queryClient.setQueryData<Book[]>(['books', { showTrash: false }], (prev) => {
          const old = prev || [];
          const exists = old.some((x) => x.id === resultBook.id);
          if (exists) return old.map((x) => (x.id === resultBook.id ? resultBook : x));
          return [resultBook, ...old];
        });

        toast.success(targetId ? `Updated "${data.title}"` : `Added "${data.title}" to library`);
        queryClient.invalidateQueries({ queryKey: ['books'] });
        return resultBook;
      } catch (err: any) {
        toast.error(err.message || 'Failed to save book');
        throw err;
      }
    },
    [queryClient],
  );

  const restoreBook = useCallback(
    async (b: Book) => {
      try {
        const res = await client.api.books[':id'].$patch({
          param: { id: b.id },
          json: { deleted_at: null } as any,
        });
        if (res.ok) {
          toast.success(`Restored "${b.title}"`);
          queryClient.invalidateQueries({ queryKey: ['books'] });
        } else {
          toast.error(`Failed to restore "${b.title}"`);
        }
      } catch {
        toast.error(`Network error restoring "${b.title}"`);
      }
    },
    [queryClient],
  );

  const deleteBook = useCallback(
    async (b: Book) => {
      if (!confirm(`Move "${b.title}" to trash?`)) return;
      try {
        const res = await client.api.books[':id'].$delete({
          param: { id: b.id },
          query: {},
        });

        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ['books'] });
          toast(`Moved "${b.title}" to trash`, {
            action: {
              label: 'Undo',
              onClick: () => restoreBook(b),
            },
          });
        } else {
          toast.error(`Failed to delete "${b.title}"`);
        }
      } catch {
        toast.error(`Network error deleting "${b.title}"`);
      }
    },
    [queryClient, restoreBook],
  );

  const permanentlyDeleteBook = useCallback(
    async (b: Book) => {
      if (!confirm(`Permanently delete "${b.title}"? This can't be undone.`)) return;
      try {
        const res = await client.api.books[':id'].$delete({
          param: { id: b.id },
          query: { permanent: '1' },
        });
        if (res.ok) {
          toast.success(`Permanently deleted "${b.title}"`);
          queryClient.invalidateQueries({ queryKey: ['books'] });
        } else {
          toast.error(`Failed to permanently delete "${b.title}"`);
        }
      } catch {
        toast.error(`Network error deleting "${b.title}"`);
      }
    },
    [queryClient],
  );

  const quickStatusChange = useCallback(
    async (b: Book) => {
      const next = STATUSES[(STATUSES.indexOf(b.status) + 1) % STATUSES.length];
      const today = getLocalDateString();
      const patchData: Partial<Book> = normalizeStatusTransition(b, next, today);

      // Optimistic cache update
      queryClient.setQueryData<Book[]>(['books', { showTrash: false }], (prev) => {
        return (prev || []).map((x) => (x.id === b.id ? { ...x, ...patchData } : x));
      });

      try {
        const res = await client.api.books[':id'].$patch({
          param: { id: b.id },
          json: patchData as any,
        });
        if (!res.ok) {
          toast.error('Failed to update status');
          queryClient.invalidateQueries({ queryKey: ['books'] });
        } else {
          toast.success(`Updated "${b.title}" to ${next}`);
        }
      } catch {
        toast.error('Network error updating status');
        queryClient.invalidateQueries({ queryKey: ['books'] });
      }
      return patchData;
    },
    [queryClient],
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

      // Optimistic cache update
      queryClient.setQueryData<Book[]>(['books', { showTrash: false }], (prev) => {
        return (prev || []).map((x) => (x.id === draft.id ? { ...x, ...patchData } : x));
      });

      try {
        const res = await client.api.books[':id'].$patch({
          param: { id: draft.id },
          json: patchData as any,
        });

        if (!res.ok) {
          toast.error('Failed to save changes');
          queryClient.invalidateQueries({ queryKey: ['books'] });
        } else {
          const resJson = await res.json();
          const updatedBook = (resJson as any)?.book;
          if (updatedBook) {
            queryClient.setQueryData<Book[]>(['books', { showTrash: false }], (prev) => {
              return (prev || []).map((x) => (x.id === draft.id ? updatedBook : x));
            });
          }
          toast.success(`Saved changes for "${draft.title}"`);
          return updatedBook as Book;
        }
      } catch {
        toast.error('Network error saving changes');
        queryClient.invalidateQueries({ queryKey: ['books'] });
      }
    },
    [queryClient],
  );

  const handleToggleFavorite = useCallback(
    async (b: Book) => {
      const newVal = !b.is_favorite;
      const patchData = { is_favorite: newVal };

      // Optimistic cache update
      queryClient.setQueryData<Book[]>(['books', { showTrash: false }], (prev) => {
        return (prev || []).map((x) => (x.id === b.id ? { ...x, is_favorite: newVal } : x));
      });

      try {
        const res = await client.api.books[':id'].$patch({
          param: { id: b.id },
          json: patchData as any,
        });
        if (!res.ok) {
          toast.error('Failed to update favorite');
          queryClient.invalidateQueries({ queryKey: ['books'] });
        } else {
          toast.success(
            newVal ? `Added "${b.title}" to Favorites ❤️` : `Removed "${b.title}" from Favorites`,
          );
        }
      } catch {
        toast.error('Network error updating favorite');
        queryClient.invalidateQueries({ queryKey: ['books'] });
      }
      return patchData;
    },
    [queryClient],
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
          queryClient.invalidateQueries({ queryKey: ['books'] });
        }
      } catch {
        setImportMsg('Could not read that file.');
        toast.error('Could not read file');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    },
    [queryClient],
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
