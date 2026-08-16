'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Book } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

interface UseBulkActionsProps {
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  onReload: (quiet?: boolean) => Promise<void>;
}

export function useBulkActions({ setBooks, onReload }: UseBulkActionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Book['status'] | ''>('');
  const [pendingRating, setPendingRating] = useState<number | 'unrated' | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelectAll = useCallback((filteredBooks: Book[]) => {
    setSelected((prev) => {
      const allSelected = filteredBooks.length > 0 && filteredBooks.every((b) => prev.has(b.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(filteredBooks.map((b) => b.id));
    });
  }, []);

  const resetSelection = useCallback(() => {
    setPendingStatus('');
    setPendingRating(null);
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const bulkAction = useCallback(
    async (
      action: 'status' | 'rating' | 'delete' | 'restore' | 'delete_permanent',
      overrideValue?: string | number,
      keepSelection = false,
    ) => {
      if (selected.size === 0) return;
      if (
        action === 'delete_permanent' &&
        !confirm(`Permanently delete ${selected.size} entries? This can't be undone.`)
      ) {
        return;
      }

      const targetIds = new Set(selected);
      const count = targetIds.size;

      // ⚡ Optimistic UI Update (Instant visual feedback)
      if (action === 'status' && typeof overrideValue === 'string') {
        setBooks((prev) =>
          prev.map((b) =>
            targetIds.has(b.id) ? { ...b, status: overrideValue as Book['status'] } : b,
          ),
        );
      } else if (action === 'rating' && typeof overrideValue === 'number') {
        setBooks((prev) =>
          prev.map((b) => (targetIds.has(b.id) ? { ...b, rating: overrideValue } : b)),
        );
      }

      if (!keepSelection) {
        setSelected(new Set());
      }

      const body: Record<string, unknown> = { action, ids: Array.from(targetIds) };
      if (action === 'status' && typeof overrideValue === 'string') {
        body.status = overrideValue;
        body.localDate = getLocalDateString();
      }
      if (action === 'rating' && overrideValue !== undefined) {
        body.rating = overrideValue;
      }

      try {
        const res = await fetch('/api/books/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          onReload(true);
          if (action === 'delete') {
            toast(`Moved ${count} entries to trash`);
          } else if (action === 'status') {
            toast.success(`Updated status for ${count} entries`);
          } else if (action === 'rating') {
            toast.success(`Updated rating for ${count} entries`);
          } else if (action === 'restore') {
            toast.success(`Restored ${count} entries`);
          } else if (action === 'delete_permanent') {
            toast.success(`Permanently deleted ${count} entries`);
          }
        } else {
          // Rollback on failure
          onReload();
          toast.error('Bulk update failed');
        }
      } catch {
        onReload();
        toast.error('Bulk update failed');
      }
    },
    [selected, setBooks, onReload],
  );

  return {
    selected,
    setSelected,
    selectMode,
    setSelectMode,
    pendingStatus,
    setPendingStatus,
    pendingRating,
    setPendingRating,
    toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll,
    resetSelection,
    bulkAction,
  };
}
