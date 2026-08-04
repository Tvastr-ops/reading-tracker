import * as SQLite from 'expo-sqlite';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('reading_tracker.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Novel',
      author TEXT,
      status TEXT NOT NULL DEFAULT 'Plan to Read',
      rating REAL,
      progress REAL DEFAULT 0,
      total_units REAL,
      genre_tags TEXT,
      source_link TEXT,
      cover_url TEXT,
      reading_pace REAL,
      date_started TEXT,
      date_finished TEXT,
      notes TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced'
    );

    CREATE TABLE IF NOT EXISTS reading_log (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      from_progress REAL,
      to_progress REAL NOT NULL,
      note TEXT,
      logged_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}
