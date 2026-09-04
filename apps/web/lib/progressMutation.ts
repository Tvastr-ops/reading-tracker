import { supabaseServer } from './supabase';
import { validateProgressionFields } from './validation';

export interface RecordProgressOptions {
  bookId: string;
  toProgress: number;
  createLog?: boolean;
  note?: string | null;
  parentProgress?: number | null;
  durationSeconds?: number | null;
}

export interface RecordProgressResult {
  entryId: string | null;
  fromProgress: number;
  toProgress: number;
  parentProgress?: number | null;
  pace: number | null;
}

/**
 * Authoritative server-side domain operation for mutating a book's reading progress.
 *
 * Rules:
 * 1. Validates input state invariants.
 * 2. Invokes PostgreSQL `record_progress()` RPC which acquires a row lock, reads authoritative current progress,
 *    updates `books.progress`, conditionally logs on positive advancement, and atomically updates `reading_pace`.
 */
export async function recordProgressChange(
  opts: RecordProgressOptions,
): Promise<{ data: RecordProgressResult | null; error: string | null }> {
  const { bookId, toProgress, createLog = true, note = null, parentProgress = null, durationSeconds = null } = opts;

  // 1. Validate progression value
  const validationError = validateProgressionFields({ progress: toProgress, parent_progress: parentProgress ?? undefined });
  if (validationError) {
    return { data: null, error: validationError };
  }

  // 2. Execute atomic RPC
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc('record_progress', {
    p_book_id: bookId,
    p_to_progress: toProgress,
    p_note: note ? note.slice(0, 500) : null,
    p_create_log: createLog,
    p_to_parent_progress: parentProgress,
    p_duration_seconds: durationSeconds,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const result = data as {
    entry_id?: string | null;
    from_progress?: number;
    to_progress?: number;
    parent_progress?: number | null;
    pace?: number | null;
  };

  return {
    data: {
      entryId: result.entry_id ?? null,
      fromProgress: result.from_progress ?? 0,
      toProgress: result.to_progress ?? toProgress,
      parentProgress: result.parent_progress ?? parentProgress,
      pace: result.pace ?? null,
    },
    error: null,
  };
}
