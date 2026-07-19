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
  date_started: string | null;
  date_finished: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookInput = Omit<Book, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

export const STATUSES: Status[] = ['Plan to Read', 'Reading', 'On Hold', 'Completed', 'Dropped'];

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
