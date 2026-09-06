'use client';

import { Card } from '@/components/ui/card';
import type { Book } from '@/lib/types';
import { calculateReadingDuration, formatDisplayDate } from '@/lib/utils';

interface BookSpecsCardProps {
  book: Book;
}

export default function BookSpecsCard({ book }: BookSpecsCardProps) {
  const durationText = calculateReadingDuration(book.date_started, book.date_finished);
  const unitType = book.unit_type || 'pages';

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)]">
      <h3 className="mb-3 font-anton text-xs uppercase tracking-wider text-text-muted">
        Book Specifications & Details
      </h3>
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Format:</span>
          <span className="font-bold text-text">{book.type}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Total Length:</span>
          <span className="font-bold text-text">
            {book.total_units != null ? `${book.total_units} ${unitType}` : 'Unknown'}
          </span>
        </div>
        {book.parent_total != null && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Total Volumes:</span>
            <span className="font-bold text-text">{book.parent_total} Volumes</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/40 pt-2">
          <span className="text-text-muted">Date Started:</span>
          <span className="font-bold text-text">{formatDisplayDate(book.date_started)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Date Finished:</span>
          <span className="font-bold text-text">{formatDisplayDate(book.date_finished)}</span>
        </div>
        {durationText && (
          <div className="flex items-center justify-between border-t border-border/40 pt-2">
            <span className="text-text-muted">Reading Duration:</span>
            <span className="font-bold text-primary">{durationText}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
