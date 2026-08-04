import { createClient } from '@supabase/supabase-js';
import * as SQLite from 'expo-sqlite';
import { Book } from '../types/book';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://atbypkepocsugivskscn.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchLocalBooks(): Promise<Book[]> {
  try {
    const db = await SQLite.openDatabaseAsync('reading_tracker.db');
    const all = await db.getAllAsync<Book>(
      'SELECT * FROM books WHERE deleted_at IS NULL ORDER BY updated_at DESC'
    );
    return all;
  } catch (err) {
    console.warn('Error fetching local books:', err);
    return [];
  }
}

export async function syncWithSupabase(): Promise<{ success: boolean; books: Book[] }> {
  try {
    const db = await SQLite.openDatabaseAsync('reading_tracker.db');

    // 1. Push pending local changes to Supabase
    const pending = await db.getAllAsync<Book>(
      "SELECT * FROM books WHERE sync_status LIKE 'pending_%'"
    );

    for (const b of pending) {
      const payload = {
        id: b.id,
        title: b.title,
        type: b.type,
        author: b.author,
        status: b.status,
        rating: b.rating,
        progress: b.progress,
        total_units: b.total_units,
        genre_tags: b.genre_tags,
        source_link: b.source_link,
        cover_url: b.cover_url,
        notes: b.notes,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase.from('books').upsert(payload);
      if (!upsertErr) {
        await db.runAsync("UPDATE books SET sync_status='synced' WHERE id=?", [b.id]);
      }
    }

    // 2. Fetch remote books from Supabase
    const { data: remoteBooks, error } = await supabase
      .from('books')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch notice:', error.message);
      const local = await fetchLocalBooks();
      return { success: false, books: local };
    }

    if (remoteBooks && remoteBooks.length > 0) {
      for (const b of remoteBooks) {
        await db.runAsync(
          `INSERT INTO books (
            id, title, type, author, status, rating, progress, total_units,
            genre_tags, source_link, cover_url, reading_pace, date_started,
            date_finished, notes, deleted_at, created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            author=excluded.author,
            status=excluded.status,
            rating=excluded.rating,
            progress=excluded.progress,
            total_units=excluded.total_units,
            cover_url=excluded.cover_url,
            notes=excluded.notes,
            updated_at=excluded.updated_at,
            sync_status='synced'`,
          [
            b.id,
            b.title,
            b.type || 'Novel',
            b.author,
            b.status || 'Plan to Read',
            b.rating,
            b.progress || 0,
            b.total_units,
            b.genre_tags,
            b.source_link,
            b.cover_url,
            b.reading_pace,
            b.date_started,
            b.date_finished,
            b.notes,
            b.deleted_at,
            b.created_at || new Date().toISOString(),
            b.updated_at || new Date().toISOString(),
          ]
        );
      }
    }

    const updatedLocal = await fetchLocalBooks();
    return { success: true, books: updatedLocal };
  } catch (err: any) {
    console.warn('Sync engine exception:', err.message);
    const local = await fetchLocalBooks();
    return { success: false, books: local };
  }
}
