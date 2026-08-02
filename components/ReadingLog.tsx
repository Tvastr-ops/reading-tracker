'use client';

import { useEffect, useState } from 'react';
import { ReadingLogEntry } from '@/lib/types';

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

  useEffect(() => { load(); }, [bookId]);

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
      body: JSON.stringify({ from_progress: currentProgress, to_progress: val, note: note || null }),
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
    // This panel lives inside BookForm's own <form> element — nesting a
    // second <form> here would be invalid HTML and browsers silently break
    // it (Enter would submit the outer form instead). Handle Enter manually.
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  }

  // Pace: units/week between the oldest and newest log entries. Entries
  // come back newest-first from the API, so the last element is oldest.
  let paceInfo: string | null = null;
  if (entries.length >= 2) {
    const newest = entries[0];
    const oldest = entries[entries.length - 1];
    const deltaProgress = newest.to_progress - oldest.to_progress;
    const deltaDays = Math.max(
      1,
      (new Date(newest.logged_at).getTime() - new Date(oldest.logged_at).getTime()) / 86400000
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

  return (
    <div className="col-span-full mt-1">
      <label>Reading log</label>
      {paceInfo && <div className="text-[12px] text-text-muted mb-1.5">{paceInfo}</div>}
      <div className="flex gap-2 mb-2" onKeyDown={handleKeyDown}>
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder={`Now at ${currentProgress}`}
          value={toProgress}
          onChange={(e) => setToProgress(e.target.value)}
          className="w-[110px] py-[var(--space-2)] px-[var(--space-3)] border border-input-border rounded-[var(--radius-sm)] bg-input-bg text-text-main font-inherit"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 py-[var(--space-2)] px-[var(--space-3)] border border-input-border rounded-[var(--radius-sm)] bg-input-bg text-text-main font-inherit"
        />
        <button type="button" className="btn secondary" disabled={saving} onClick={() => addEntry()}>
          {saving ? 'Adding...' : 'Log'}
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-text-muted">Loading log...</p>
      ) : entries.length === 0 ? (
        <p className="text-[13px] text-text-muted">No log entries yet.</p>
      ) : (
        <div className="max-h-[140px] overflow-y-auto border border-border-soft rounded-[6px]">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex justify-between py-1.5 px-2.5 text-[12px] border-b border-border-soft"
            >
              <span>
                {e.from_progress != null ? `${e.from_progress} → ` : ''}{e.to_progress}
                {e.note ? <span className="text-[12px] text-text-muted"> — {e.note}</span> : null}
              </span>
              <span className="text-[12px] text-text-muted">{new Date(e.logged_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
