'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number | 'all';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | 'all') => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const [jumpVal, setJumpVal] = useState('');

  if (totalItems === 0) return null;

  const currentSizeNum = pageSize === 'all' ? totalItems : pageSize;
  const startItem =
    pageSize === 'all' ? 1 : Math.min((currentPage - 1) * currentSizeNum + 1, totalItems);
  const endItem =
    pageSize === 'all' ? totalItems : Math.min(currentPage * currentSizeNum, totalItems);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpVal, 10);
    if (Number.isFinite(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpVal('');
    }
  };

  // Generate adjacent page numbers
  const pageNumbers: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t-2 border-border/80 pt-4 sm:flex-row">
      {/* Item count & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <span>
          Showing{' '}
          <strong className="font-bold text-text">
            {startItem}–{endItem}
          </strong>{' '}
          of <strong className="font-bold text-text">{totalItems}</strong> books
        </span>

        <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
          <span className="text-[11px] uppercase tracking-wider">Per page:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                {pageSize === 'all' ? 'All' : pageSize}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[80px]">
              {[25, 50, 100].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => onPageSizeChange(size)}
                  className={`text-xs font-semibold ${pageSize === size ? 'bg-accent-bg text-accent-text' : ''}`}
                >
                  {size}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => onPageSizeChange('all')}
                className={`text-xs font-semibold ${pageSize === 'all' ? 'bg-accent-bg text-accent-text' : ''}`}
              >
                All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Page Navigation & Jump */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shadow-[1.5px_1.5px_0px_var(--border)] disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First page"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shadow-[1.5px_1.5px_0px_var(--border)] disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Number buttons */}
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-text-muted">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={currentPage === p ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 min-w-[32px] px-2 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] ${
                    currentPage === p ? 'bg-accent-bg text-accent-text' : ''
                  }`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              ),
            )}
          </div>

          {/* Mobile Current indicator */}
          <div className="px-2 text-xs font-bold sm:hidden">
            {currentPage} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shadow-[1.5px_1.5px_0px_var(--border)] disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shadow-[1.5px_1.5px_0px_var(--border)] disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* Jump Input */}
          {totalPages > 3 && (
            <form onSubmit={handleJump} className="ml-2 hidden items-center gap-1 md:flex">
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder="Go to"
                value={jumpVal}
                onChange={(e) => setJumpVal(e.target.value)}
                className="h-8 w-16 rounded border border-border bg-input-bg px-2 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent-bg"
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
