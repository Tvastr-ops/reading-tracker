'use client';

import { Check, Edit2, Flame } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { calculateProgressPercentage, getStatusAwareProgressText } from '@/lib/progress';
import { type Book, STATUSES } from '@/lib/types';

interface BookReadingCockpitProps {
  book: Book;
  savingProgress: boolean;
  forecast: {
    dailyPace: number;
    daysRemaining: number;
    formattedFinish: string;
    unit: string;
  } | null;
  onQuickIncrement: (delta: number) => Promise<void>;
  onDirectProgressSave: (newProgress: number) => Promise<void>;
  onStatusChange: (newStatus: Book['status']) => Promise<void>;
}

export default function BookReadingCockpit({
  book,
  savingProgress,
  forecast,
  onQuickIncrement,
  onDirectProgressSave,
  onStatusChange,
}: BookReadingCockpitProps) {
  const [editingDirect, setEditingDirect] = useState(false);
  const [directVal, setDirectVal] = useState(String(book.progress ?? 0));

  const pct = calculateProgressPercentage(book);
  const formattedProgress = getStatusAwareProgressText(book);
  const unit = book.unit_type || 'pages';

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(directVal);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      await onDirectProgressSave(parsed);
      setEditingDirect(false);
    }
  };

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
            Current Reading Progress
          </span>
          <div className="flex items-baseline gap-2.5">
            {editingDirect ? (
              <form onSubmit={handleDirectSubmit} className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={book.total_units ?? undefined}
                  value={directVal}
                  onChange={(e) => setDirectVal(e.target.value)}
                  className="h-10 w-28 rounded-lg border-2 border-primary bg-surface px-2.5 font-mono text-xl font-black text-text shadow-[2px_2px_0px_var(--border)] focus:outline-none"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  className="h-10 px-3 font-bold shadow-[2px_2px_0px_var(--border)]"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDirect(false)}
                  className="h-10 px-2.5 text-xs font-bold"
                >
                  ✕
                </Button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDirectVal(String(book.progress ?? 0));
                    setEditingDirect(true);
                  }}
                  className="group flex items-center gap-1.5 text-left transition-colors hover:text-primary"
                  title="Click to manually enter progress"
                >
                  <span className="font-anton text-3xl text-text group-hover:text-primary sm:text-4xl">
                    {formattedProgress}
                  </span>
                  <Edit2 className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <span className="font-mono text-sm font-bold text-text-muted">({pct}%)</span>
              </>
            )}
          </div>
        </div>

        {/* Status Select */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-[10px] font-black uppercase text-text-muted">
            Reading Status
          </label>
          <Select
            value={book.status}
            onValueChange={(val) => onStatusChange(val as Book['status'])}
          >
            <SelectTrigger className="h-9 font-bold text-xs shadow-[1.5px_1.5px_0px_var(--border)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-semibold">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <Progress value={pct} className="h-3.5 border-2 border-border" />
      </div>

      {/* Reading Velocity & Estimated Finish Banner */}
      {forecast && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs text-text">
          <Flame className="h-4 w-4 shrink-0 text-primary animate-pulse" />
          <div>
            <span className="font-bold">Velocity:</span> ~{forecast.dailyPace} {forecast.unit}
            /day •{' '}
            <span className="font-bold text-primary">
              Estimated Finish: {forecast.formattedFinish}
            </span>{' '}
            ({forecast.daysRemaining} days remaining)
          </div>
        </div>
      )}

      {/* Quick Increment Steppers */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted">
          Quick Step ({unit}):
        </span>
        {[1, 5, 10, 25, 50].map((amt) => (
          <Button
            key={amt}
            variant="outline"
            size="sm"
            disabled={savingProgress}
            className="h-8 px-3 font-mono text-xs font-black shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:-translate-y-0.5 active:translate-x-[0.5px] active:translate-y-[0.5px]"
            onClick={() => onQuickIncrement(amt)}
          >
            +{amt}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={savingProgress || (book.progress ?? 0) <= 0}
          className="h-8 px-2.5 font-mono text-xs font-black text-text-muted shadow-[1.5px_1.5px_0px_var(--border)]"
          onClick={() => onQuickIncrement(-1)}
          title="Decrement 1"
        >
          -1
        </Button>
      </div>
    </Card>
  );
}
