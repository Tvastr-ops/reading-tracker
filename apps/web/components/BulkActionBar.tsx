'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';
import { type Book, STATUSES } from '@/lib/types';

export function BulkActionBar() {
  const { showTrash } = useLibraryData();
  const { filteredBooks } = useLibraryFiltersContext();
  const {
    selected,
    allSelected,
    toggleSelectAll,
    pendingStatus,
    setPendingStatus,
    pendingRating,
    setPendingRating,
    bulkAction,
    resetSelection,
  } = useLibraryUI();

  const selectedCount = selected.size;

  const handleApplyStaged = async () => {
    if (pendingStatus) {
      await bulkAction('status', pendingStatus, true);
    }
    if (pendingRating !== null) {
      await bulkAction('rating', pendingRating, true);
    }
    setPendingStatus('');
    setPendingRating(null);
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] sm:bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-0.75rem)] -translate-x-1/2 items-center justify-between gap-1.5 border-2 border-border bg-card-bg p-1.5 shadow-[4px_4px_0px_var(--border)] sm:max-w-3xl sm:gap-2.5 sm:px-3.5 sm:py-2"
        >
          <div className="flex shrink-0 items-center gap-1 pl-0.5 text-xs sm:gap-1.5 sm:pl-1">
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center border border-border bg-accent-bg px-1 font-mono font-black text-[11px] text-accent-text shadow-[1px_1px_0px_var(--border)]">
              {selectedCount}
            </span>
            <span className="hidden font-bold uppercase text-[11px] text-text sm:inline">
              {selectedCount === 1 ? 'item' : 'items'}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 shrink-0 border border-border bg-surface px-1.5 text-[10px] font-black uppercase text-accent-color hover:bg-accent-color/10 shadow-[1px_1px_0px_var(--border)] sm:px-2"
              onClick={() => toggleSelectAll(filteredBooks)}
            >
              {allSelected ? 'None' : 'All'}
            </Button>
          </div>

          <div className="h-5 w-0.5 shrink-0 bg-border" />

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {!showTrash && (
              <>
                {/* Staged Batch Status */}
                <Select
                  value={pendingStatus}
                  onValueChange={(val) => setPendingStatus(val as Book['status'])}
                >
                  <SelectTrigger className="h-8 w-[76px] border-2 border-border bg-surface px-1.5 text-xs font-bold uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:w-28 sm:px-2.5">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Staged Batch Rating */}
                <Select
                  value={
                    pendingRating === null
                      ? ''
                      : pendingRating === 0
                        ? 'unrated'
                        : String(pendingRating)
                  }
                  onValueChange={(val) => {
                    const r = val === 'unrated' ? 0 : Number(val);
                    setPendingRating(r);
                  }}
                >
                  <SelectTrigger className="h-8 w-[64px] border-2 border-border bg-surface px-1 text-xs font-bold uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:w-24 sm:px-2.5">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5★ (5.0)</SelectItem>
                    <SelectItem value="4">4★ (4.0)</SelectItem>
                    <SelectItem value="3">3★ (3.0)</SelectItem>
                    <SelectItem value="2">2★ (2.0)</SelectItem>
                    <SelectItem value="1">1★ (1.0)</SelectItem>
                    <SelectItem value="unrated">Clear Rating</SelectItem>
                  </SelectContent>
                </Select>

                {/* Staged Apply Button */}
                {(pendingStatus !== '' || pendingRating !== null) && (
                  <Button
                    size="sm"
                    className="h-8 shrink-0 border-2 border-border bg-accent-bg px-2 font-black text-accent-text text-xs uppercase shadow-[2px_2px_0px_var(--border)] hover:opacity-90 sm:px-3"
                    onClick={handleApplyStaged}
                  >
                    Apply
                  </Button>
                )}
              </>
            )}

            {showTrash && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 border-2 border-border px-2 text-xs font-bold uppercase shadow-[1.5px_1.5px_0px_var(--border)] sm:px-3"
                onClick={() => bulkAction('restore')}
              >
                Restore
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              className="h-8 shrink-0 border-2 border-border bg-rose-600 text-white p-2 text-xs uppercase font-bold shadow-[1.5px_1.5px_0px_var(--border)] hover:bg-rose-700 sm:px-3"
              onClick={() => bulkAction(showTrash ? 'delete_permanent' : 'delete')}
              title={showTrash ? 'Delete Permanently' : 'Move to Trash'}
              aria-label={showTrash ? 'Delete Permanently' : 'Move to Trash'}
            >
              <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">
                {showTrash ? 'Delete Permanently' : 'Move to Trash'}
              </span>
            </Button>

            {/* Done button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-2 border-border bg-surface px-2.5 font-black text-xs uppercase shadow-[1.5px_1.5px_0px_var(--border)] hover:bg-surface/80 sm:px-3"
              onClick={resetSelection}
              title="Done selecting"
              aria-label="Done selecting"
            >
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:mr-1 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Done</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BulkActionBar;
