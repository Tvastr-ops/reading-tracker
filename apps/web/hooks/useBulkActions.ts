'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Book } from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

interface UseBulkActionsProps {
  setBooks: (updater: Book[] | ((prev: Book[]) => Book[])) => void;
  onReload: (quiet?: boolean) => Promise<void>;
}

export function useBulkActions({ setBooks, onReload }: UseBulkActionsProps) {
  const selected = useUIStore((s) => s.selected);
  const selectMode = useUIStore((s) => s.selectMode);
  const pendingStatus = useUIStore((s) => s.pendingStatus);
  const pendingRating = useUIStore((s) => s.pendingRating);

  const toggleSelect = useUIStore((s) => s.toggleSelect);
  const selectAll = useUIStore((s) => s.selectAll);
  const deselectAll = useUIStore((s) => s.deselectAll);
  const toggleSelectAll = useUIStore((s) => s.toggleSelectAll);
  const resetSelection = useUIStore((s) => s.resetSelection);
  const setSelectMode = useUIStore((s) => s.setSelectMode);
  const setPendingStatus = useUIStore((s) => s.setPendingStatus);
  const setPendingRating = useUIStore((s) => s.setPendingRating);

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
        deselectAll();
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
    [selected, setBooks, onReload, deselectAll],
  );

  return {
    selected,
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
