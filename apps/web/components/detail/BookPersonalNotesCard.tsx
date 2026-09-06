'use client';

import { Check, Edit3, PenLine } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BookPersonalNotesCardProps {
  notes?: string | null;
  onSaveNotes: (updatedNotes: string) => Promise<void>;
}

export default function BookPersonalNotesCard({ notes, onSaveNotes }: BookPersonalNotesCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNotes(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" />
          <h3 className="font-anton text-sm uppercase tracking-wider text-text">
            My Notes & Reader Thoughts
          </h3>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(notes || '');
              setEditing(true);
            }}
            className="h-7 gap-1 px-2.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
          >
            <Edit3 className="h-3 w-3" />
            <span>{notes ? 'Edit Notes' : 'Add Notes'}</span>
          </Button>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your personal review, favorite quotes, annotations, or impressions..."
              className="w-full rounded-lg border-2 border-border bg-surface p-3 font-sans text-xs leading-relaxed text-text shadow-[2px_2px_0px_var(--border)] focus:border-primary focus:outline-none sm:text-sm"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(notes || '');
                  setEditing(false);
                }}
                className="h-8 px-3 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSave}
                className="h-8 gap-1 px-3.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Note'}</span>
              </Button>
            </div>
          </div>
        ) : notes?.trim() ? (
          <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-text sm:text-sm">
            {notes}
          </p>
        ) : (
          <p className="font-sans text-xs italic text-text-muted">
            No personal notes recorded yet. Click "Add Notes" to write your thoughts or review.
          </p>
        )}
      </div>
    </Card>
  );
}
