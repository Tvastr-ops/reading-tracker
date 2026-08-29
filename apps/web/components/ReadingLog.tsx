'use client';

import { Calendar, ChevronDown, ChevronRight, Clock, Loader2, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { simulateReadingHistoryLogs } from '@/lib/progress';
import type { ReadingJourney, ReadingLogEntry } from '@/lib/types';

export default function ReadingLog({
  bookId,
  currentProgress,
  totalUnits,
  startDate,
  endDate,
  status,
  onProgressUpdated,
}: {
  bookId: string;
  currentProgress: number;
  totalUnits: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  onProgressUpdated: (newProgress: number) => void;
}) {
  const [entries, setEntries] = useState<ReadingLogEntry[]>([]);
  const [journeys, setJourneys] = useState<ReadingJourney[]>([]);
  const [expandedJourneys, setExpandedJourneys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toProgress, setToProgress] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    load();
  }, [bookId]);

  async function load() {
    setLoading(true);
    try {
      const [logsRes, journeysRes] = await Promise.all([
        fetch(`/api/books/${bookId}/log`),
        fetch(`/api/books/${bookId}/journeys`),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setEntries(data.entries || []);
      }
      if (journeysRes.ok) {
        const jData = await journeysRes.json();
        setJourneys(jData.journeys || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
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

  function toggleJourney(id: string) {
    setExpandedJourneys((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function calculatePaceForLogs(logList: ReadingLogEntry[], isCompleted: boolean): string | null {
    if (logList.length < 2) return null;
    const sorted = [...logList].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
    );
    const newest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    const deltaProgress = newest.to_progress - oldest.to_progress;
    const deltaDays = Math.max(
      1,
      (new Date(newest.logged_at).getTime() - new Date(oldest.logged_at).getTime()) / 86400000,
    );
    const perWeek = (deltaProgress / deltaDays) * 7;
    if (perWeek <= 0) return null;

    const paceText = `~${perWeek.toFixed(1)} units/week`;
    if (isCompleted || status === 'Completed') {
      const days = Math.max(1, Math.round(deltaDays));
      return `${paceText} · finished in ${days} day${days === 1 ? '' : 's'}`;
    }

    if (totalUnits && totalUnits > currentProgress) {
      const remaining = totalUnits - currentProgress;
      const weeksLeft = remaining / perWeek;
      const eta = new Date(Date.now() + weeksLeft * 7 * 86400000);
      return `${paceText} · est. finish ${eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    return paceText;
  }

  // Deduplicate journeys by journey_index (taking latest or one with logs) to prevent duplicate ghost initial reads
  const dedupedJourneys = useMemo(() => {
    if (!journeys.length) return [];
    const journeyEntryCounts = new Map<string, number>();
    for (const e of entries) {
      if (e.journey_id) {
        journeyEntryCounts.set(e.journey_id, (journeyEntryCounts.get(e.journey_id) || 0) + 1);
      }
    }

    // Sort by journey_index desc, then entries count desc, then updated_at desc
    const sorted = [...journeys].sort((a, b) => {
      if (b.journey_index !== a.journey_index) return b.journey_index - a.journey_index;
      const countA = journeyEntryCounts.get(a.id) || 0;
      const countB = journeyEntryCounts.get(b.id) || 0;
      if (countB !== countA) return countB - countA;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    const indexMap = new Map<number, ReadingJourney>();
    for (const j of sorted) {
      if (!indexMap.has(j.journey_index)) {
        indexMap.set(j.journey_index, j);
      }
    }

    return Array.from(indexMap.values()).sort((a, b) => b.journey_index - a.journey_index);
  }, [journeys, entries]);

  // Active Journey Detection & Journey-Aware Grouping
  const activeJourney =
    dedupedJourneys.find((j: ReadingJourney) => j.status === 'reading') || dedupedJourneys[0];
  const activeJourneyId = activeJourney?.id;

  // Logs for the active journey specifically for main header pace calculation
  const activeEntries = entries.filter((e) => {
    if (activeJourneyId && e.journey_id) {
      return e.journey_id === activeJourneyId;
    }
    return true;
  });

  const isBookCompleted =
    status === 'Completed' && (!activeJourney || activeJourney.status === 'completed');
  const paceInfo = calculatePaceForLogs(isBookCompleted ? entries : activeEntries, isBookCompleted);

  async function backfillSimulatedLogs() {
    if (!totalUnits || totalUnits <= 0 || !startDate || !endDate) return;
    setBackfilling(true);
    const simulated = simulateReadingHistoryLogs({
      totalUnits,
      startDate,
      endDate,
    });

    for (const log of simulated) {
      await fetch(`/api/books/${bookId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          journey_id: activeJourneyId,
          from_progress: log.from_progress,
          to_progress: log.to_progress,
          note: log.note || null,
          logged_at: log.logged_at,
        }),
      });
    }
    setBackfilling(false);
    onProgressUpdated(totalUnits);
    load();
  }

  const canBackfill =
    entries.length === 0 &&
    status === 'Completed' &&
    startDate &&
    endDate &&
    totalUnits != null &&
    totalUnits > 0;

  const inputClass =
    'h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-card-bg text-text focus:outline-none focus:ring-2 focus:ring-accent-color transition-all';

  // Group logs into journeys if multiple distinct journeys exist
  const hasMultipleJourneys = dedupedJourneys.length > 1;

  function renderLogEntryRow(e: ReadingLogEntry) {
    return (
      <div
        key={e.id}
        className="group flex items-center justify-between p-2.5 transition-colors hover:bg-surface/80"
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
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-text-muted">
            <Calendar className="h-3 w-3" />
            {new Date(e.logged_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Delete this reading log entry?')) return;
              await fetch(`/api/books/${bookId}/log?log_id=${e.id}`, { method: 'DELETE' });
              load();
            }}
            className="opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
            title="Delete entry"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

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
        <div className="space-y-2.5">
          <p className="py-1 text-text-muted text-xs italic">No reading log entries yet.</p>
          {canBackfill && (
            <div className="rounded-xl border border-accent-color/40 bg-accent-color/10 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="block font-bold text-xs text-text">
                    🎲 Backfill Simulated Reading Logs
                  </span>
                  <span className="block text-[11px] text-text-muted">
                    Generate natural reading sessions between {startDate} and {endDate}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={backfilling}
                  onClick={backfillSimulatedLogs}
                  className="gap-1.5"
                >
                  {backfilling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{backfilling ? 'Simulating...' : 'Generate Logs'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-text-muted">
              {entries.length} Total {entries.length === 1 ? 'Session' : 'Sessions'}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Clear all reading log entries for this book?')) return;
                await fetch(`/api/books/${bookId}/log`, { method: 'DELETE' });
                load();
              }}
              className="text-[10px] font-medium text-rose-500 hover:underline"
            >
              Clear all logs
            </button>
          </div>

          {hasMultipleJourneys ? (
            <div className="space-y-2.5">
              {dedupedJourneys.map((j: ReadingJourney) => {
                const isCurrentActive = j.status === 'reading' && status === 'Reading';
                const journeyEntries = entries.filter(
                  (e) =>
                    e.journey_id === j.id ||
                    (!e.journey_id && (j.id === activeJourneyId || dedupedJourneys.length === 1)),
                );
                const isExpanded =
                  expandedJourneys[j.id] ?? (isCurrentActive || j.id === activeJourneyId);
                const startDateStr = j.date_started
                  ? new Date(j.date_started).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;
                const finishDateStr = j.date_finished
                  ? new Date(j.date_finished).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                const jPace = calculatePaceForLogs(journeyEntries, !isCurrentActive);

                return (
                  <div
                    key={j.id}
                    className="overflow-hidden rounded-xl border border-border bg-surface/40"
                  >
                    <button
                      type="button"
                      onClick={() => toggleJourney(j.id)}
                      className="flex w-full items-center justify-between p-2.5 text-left transition-colors hover:bg-surface"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                        )}
                        <span className="font-bold text-text text-xs">
                          {j.journey_index === 1
                            ? 'Initial Read'
                            : `Re-Read #${j.journey_index - 1}`}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold text-[10px] uppercase ${
                            isCurrentActive
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-border/60 text-text-muted'
                          }`}
                        >
                          {isCurrentActive ? 'Active' : 'Completed'}
                        </span>
                        {j.rating && (
                          <span className="font-semibold text-[11px] text-amber-500">
                            ★ {j.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted">
                        {jPace && (
                          <span className="hidden sm:inline-block font-medium text-accent-color text-[11px]">
                            {jPace}
                          </span>
                        )}
                        {startDateStr && (
                          <span>
                            {startDateStr}
                            {finishDateStr ? ` – ${finishDateStr}` : ' – Present'}
                          </span>
                        )}
                        <span className="font-medium text-text-muted">
                          ({journeyEntries.length})
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-border/60 border-border border-t bg-card-bg/50 text-xs">
                        {journeyEntries.length === 0 ? (
                          <div className="p-2.5 text-center text-text-muted text-xs italic">
                            No logs recorded in this journey yet.
                          </div>
                        ) : (
                          <div className="max-h-[140px] divide-y divide-border/60 overflow-y-auto">
                            {journeyEntries.map((e) => renderLogEntryRow(e))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-h-[160px] divide-y divide-border/60 overflow-y-auto rounded-xl border border-border bg-surface/50 text-xs">
              {entries.map((e) => renderLogEntryRow(e))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
