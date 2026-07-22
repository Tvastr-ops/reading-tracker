export type Status = 'Plan to Read' | 'Reading' | 'On Hold' | 'Completed' | 'Dropped';

export interface Book {
  id: string;
  title: string;
  type: string;
  author: string | null;
  status: Status;
  rating: number | null;
  progress: number | null;
  total_units: number | null;
  genre_tags: string | null;
  source_link: string | null;
  cover_url: string | null;
  reading_pace: number | null;
  date_started: string | null;
  date_finished: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookInput = Omit<Book, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'reading_pace'>;

export const STATUSES: Status[] = ['Plan to Read', 'Reading', 'On Hold', 'Completed', 'Dropped'];

// Was defined identically in both BookTable.tsx and BookGrid.tsx — one
// shared source so the two views can't silently drift apart.
export const STATUS_COLOR_VAR: Record<string, string> = {
  Reading: 'var(--status-reading)',
  Completed: 'var(--status-completed)',
  'Plan to Read': 'var(--status-plan)',
  'On Hold': 'var(--status-hold)',
  Dropped: 'var(--status-dropped)',
};

export type SortField = 'updated_at' | 'title' | 'rating' | 'date_finished' | 'status';
export type SortDir = 'asc' | 'desc';

export interface ReadingLogEntry {
  id: string;
  book_id: string;
  from_progress: number | null;
  to_progress: number;
  note: string | null;
  logged_at: string;
}
