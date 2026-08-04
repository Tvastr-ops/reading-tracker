export type BookStatus = 'Plan to Read' | 'Reading' | 'Completed' | 'On Hold' | 'Dropped';

export type BookFormatType =
  | 'Novel'
  | 'Light Novel'
  | 'Web Novel'
  | 'Non-Fiction'
  | 'Serial'
  | 'Other';

export interface Book {
  id: string;
  title: string;
  type: BookFormatType;
  author: string | null;
  status: BookStatus;
  rating: number | null; // 0.0 - 5.0
  progress: number; // units/pages/chapters read
  total_units: number | null; // total units (pages, chapters, etc.)
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
  sync_status?: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
}

export interface ReadingLog {
  id: string;
  book_id: string;
  from_progress: number | null;
  to_progress: number;
  note: string | null;
  logged_at: string;
  sync_status?: 'synced' | 'pending_create';
}
