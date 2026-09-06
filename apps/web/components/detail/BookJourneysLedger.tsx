'use client';

import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ReadingJourney } from '@/lib/types';
import { formatDisplayDate } from '@/lib/utils';

interface BookJourneysLedgerProps {
  journeys: ReadingJourney[];
  isCompleted: boolean;
  startingReread: boolean;
  onStartReread: () => Promise<void>;
}

export default function BookJourneysLedger({
  journeys,
  isCompleted,
  startingReread,
  onStartReread,
}: BookJourneysLedgerProps) {
  if (journeys.length === 0) return null;

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          <h3 className="font-anton text-sm uppercase tracking-wider text-text">
            Reading Journeys ({journeys.length})
          </h3>
        </div>
        {isCompleted && (
          <Button
            variant="outline"
            size="sm"
            disabled={startingReread}
            onClick={onStartReread}
            className="gap-1 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Start Re-read</span>
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {journeys.map((j) => (
          <div key={j.id} className="rounded-lg border border-border/80 bg-surface/80 p-3 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-text">
                Journey #{j.journey_index}{' '}
                <Badge variant="outline" className="ml-1.5 text-[10px] uppercase">
                  {j.status}
                </Badge>
              </span>
              {j.rating && (
                <span className="font-mono text-amber-500">★ {j.rating.toFixed(1)}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
              <span>Started: {formatDisplayDate(j.date_started)}</span>
              {j.date_finished && <span>• Finished: {formatDisplayDate(j.date_finished)}</span>}
            </div>
            {j.review && (
              <p className="mt-2 border-t border-border/40 pt-1.5 font-sans italic text-text">
                "{j.review}"
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
