'use client';

import { useEffect, useState } from 'react';
import { ReadingLogEntry } from '@/lib/types';

export default function ReadingLog({
  bookId,
  currentProgress,
  onProgressUpdated,
}: {
  bookId: string;
  currentProgress: number;
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

  return (
    <div className="full" style={{ marginTop: 4 }}>
      <label>Reading log</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }} onKeyDown={handleKeyDown}>
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder={`Now at ${currentProgress}`}
          value={toProgress}
          onChange={(e) => setToProgress(e.target.value)}
          style={{ width: 110 }}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn secondary" disabled={saving} onClick={() => addEntry()}>
          {saving ? 'Adding...' : 'Log'}
        </button>
      </div>

      {loading ? (
        <p className="subtitle">Loading log...</p>
      ) : entries.length === 0 ? (
        <p className="subtitle">No log entries yet.</p>
      ) : (
        <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 6 }}>
          {entries.map((e) => (
            <div
              key={e.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--border-soft)' }}
            >
              <span>
                {e.from_progress != null ? `${e.from_progress} → ` : ''}{e.to_progress}
                {e.note ? <span className="label"> — {e.note}</span> : null}
              </span>
              <span className="label">{new Date(e.logged_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
