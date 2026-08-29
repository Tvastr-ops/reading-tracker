export type BookStatus = 'Plan to Read' | 'Reading' | 'On Hold' | 'Completed' | 'Dropped';
export type Status = BookStatus;

export type UnitType = 'pages' | 'chapters' | 'words' | 'percent' | 'volumes' | 'units';
export type ProgressStructure = 'single' | 'volume_chapter' | 'part_chapter';

export const PUBLICATION_TYPES = [
  'Novel',
  'Novella',
  'Novelette',
  'Web Novel',
  'Light Novel',
  'Short Story',
  'Collection',
  'Anthology',
  'Essay',
  'Fanfiction',
  'Other',
] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number] | (string & {});

export type BookFormatType = PublicationType;

export interface Book {
  id: string;
  title: string;
  type: string;
  unit_type?: UnitType | null;
  progress_structure?: ProgressStructure | null;
  parent_progress?: number | null;
  parent_total?: number | null;
  latest_units?: number | null;
  is_ongoing?: boolean | null;
  author: string | null;
  status: BookStatus;
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
  is_favorite?: boolean | null;
  series_name?: string | null;
  series_order?: number | null;
  shelf_names?: string | null;
  reread_count?: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookInput = Omit<
  Book,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'reading_pace'
>;

export const STATUSES: BookStatus[] = [
  'Plan to Read',
  'Reading',
  'On Hold',
  'Completed',
  'Dropped',
];

export const STATUS_COLOR_VAR: Record<BookStatus, string> = {
  Reading: 'var(--status-reading)',
  Completed: 'var(--status-completed)',
  'Plan to Read': 'var(--status-plan)',
  'On Hold': 'var(--status-hold)',
  Dropped: 'var(--status-dropped)',
};

export type SortField =
  | 'updated_at'
  | 'created_at'
  | 'title'
  | 'rating'
  | 'date_finished'
  | 'status'
  | 'progress'
  | 'author';
export type SortDir = 'asc' | 'desc';

export interface ReadingJourney {
  id: string;
  user_id?: string;
  book_id: string;
  journey_index: number;
  status: 'reading' | 'completed' | 'abandoned' | 'on_hold';
  date_started: string;
  date_finished?: string | null;
  rating?: number | null;
  review?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingLogEntry {
  id: string;
  book_id: string;
  journey_id?: string | null;
  from_progress: number | null;
  to_progress: number;
  note: string | null;
  logged_at: string;
}

export type ReadingLog = ReadingLogEntry;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
