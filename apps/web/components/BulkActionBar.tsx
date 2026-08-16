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
          className="surface-t3 fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-between gap-1 rounded-full p-1.5 shadow-t3 sm:bottom-6 sm:max-w-3xl sm:gap-2.5 sm:px-4 sm:py-2"
        >
          <div className="flex shrink-0 items-center gap-1 pl-0.5 text-xs sm:gap-1.5 sm:pl-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-color/15 font-bold font-mono text-[11px] text-accent-color">
              {selectedCount}
            </span>
            <span className="hidden font-medium text-text sm:inline">
              {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1 text-[11px] text-accent-color hover:bg-accent-color/10 sm:px-1.5"
              onClick={() => toggleSelectAll(filteredBooks)}
            >
              {allSelected ? 'None' : 'All'}
            </Button>
          </div>

          <div className="h-4 w-px shrink-0 bg-border/60" />

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {!showTrash && (
              <>
                {/* Staged Batch Status */}
                <Select
                  value={pendingStatus}
                  onValueChange={(val) => setPendingStatus(val as Book['status'])}
                >
                  <SelectTrigger className="h-8 w-[72px] rounded-full border-border px-1.5 text-xs sm:w-28 sm:px-3">
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
                  <SelectTrigger className="h-8 w-[60px] rounded-full border-border px-1 text-xs sm:w-24 sm:px-3">
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
                    className="h-8 shrink-0 rounded-full bg-accent-color px-2 font-bold text-accent-text text-xs shadow-xs hover:bg-accent-color/90 sm:px-3"
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
                className="h-8 shrink-0 rounded-full px-2 text-xs sm:px-3"
                onClick={() => bulkAction('restore')}
              >
                Restore
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              className="h-8 shrink-0 rounded-full p-2 text-xs shadow-xs sm:px-3"
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
              variant="ghost"
              className="h-8 shrink-0 rounded-full px-2 font-semibold text-text-muted text-xs hover:bg-text/10 hover:text-text sm:px-2.5"
              onClick={resetSelection}
              title="Done selecting"
              aria-label="Done selecting"
            >
              <Check className="h-4 w-4 text-emerald-500 sm:mr-1 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Done</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BulkActionBar;
