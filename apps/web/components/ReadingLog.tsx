'use client';

import { Calendar, Clock, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReadingLogEntry } from '@/lib/types';

export default function ReadingLog({
  bookId,
  currentProgress,
  totalUnits,
  onProgressUpdated,
}: {
  bookId: string;
  currentProgress: number;
  totalUnits: number | null;
  onProgressUpdated: (newProgress: number) => void;
}) {
  const [entries, setEntries] = useState<ReadingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toProgress, setToProgress] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [bookId]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/books/${bookId}/log`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
    }
    setLoading(false);
  }

  async function addEntry(e?: React.FormEvent) {
    e?.preventDefault();
    const val = parseFloat(toProgress);
    if (!Number.isFinite(val) || val < 0) return;
    setSaving(true);
    const res = await fetch(`/api/books/${bookId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_progress: val,
        note: note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setToProgress('');
      setNote('');
      onProgressUpdated(val);
      load();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  }

  let paceInfo: string | null = null;
  if (entries.length >= 2) {
    const newest = entries[0];
    const oldest = entries[entries.length - 1];
    const deltaProgress = newest.to_progress - oldest.to_progress;
    const deltaDays = Math.max(
      1,
      (new Date(newest.logged_at).getTime() - new Date(oldest.logged_at).getTime()) / 86400000,
    );
    const perWeek = (deltaProgress / deltaDays) * 7;
    if (perWeek > 0) {
      const paceText = `~${perWeek.toFixed(1)} units/week`;
      if (totalUnits && totalUnits > currentProgress) {
        const remaining = totalUnits - currentProgress;
        const weeksLeft = remaining / perWeek;
        const eta = new Date(Date.now() + weeksLeft * 7 * 86400000);
        paceInfo = `${paceText} · est. finish ${eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else {
        paceInfo = paceText;
      }
    }
  }

  const inputClass =
    'h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-card-bg text-text focus:outline-none focus:ring-2 focus:ring-accent-color transition-all';

  return (
    <div className="col-span-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 font-semibold text-text-muted text-xs">
          <Clock className="h-3.5 w-3.5 text-accent-color" />
          <span>Reading Session Log</span>
        </label>
        {paceInfo && <span className="font-medium text-accent-color text-xs">{paceInfo}</span>}
      </div>

      <div className="flex flex-wrap gap-2 sm:flex-nowrap" onKeyDown={handleKeyDown}>
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder={`Now at ${currentProgress}`}
          value={toProgress}
          onChange={(e) => setToProgress(e.target.value)}
          className={`${inputClass} w-full shrink-0 sm:w-[130px]`}
        />
        <input
          type="text"
          placeholder="Session note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputClass} min-w-[140px] flex-1`}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving || !toProgress.trim()}
          onClick={() => addEntry()}
          className="w-full shrink-0 sm:w-auto"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span>Log</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-4 text-text-muted text-xs">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent-color" />
          Loading reading logs...
        </div>
      ) : entries.length === 0 ? (
        <p className="py-1 text-text-muted text-xs italic">No reading log entries yet.</p>
      ) : (
        <div className="max-h-[160px] divide-y divide-border/60 overflow-y-auto rounded-xl border border-border bg-surface/50 text-xs">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between p-2.5 transition-colors hover:bg-surface"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text">
                  {e.from_progress != null ? `${e.from_progress} → ` : ''}
                  {e.to_progress}
                </span>
                {e.note && (
                  <span className="border-border border-l pl-2 text-text-muted">— {e.note}</span>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-muted">
                <Calendar className="h-3 w-3" />
                {new Date(e.logged_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
