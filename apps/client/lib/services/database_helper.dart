import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/book.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('reading_tracker.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Novel',
        unit_type TEXT,
        progress_structure TEXT,
        parent_progress REAL,
        parent_total REAL,
        latest_units REAL,
        is_ongoing INTEGER,
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
        is_favorite INTEGER,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS reading_log (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        from_progress REAL,
        to_progress REAL NOT NULL,
        note TEXT,
        logged_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');
  }

  Future<List<Book>> getBooks() async {
    final db = await instance.database;
    final result = await db.query(
      'books',
      where: 'deleted_at IS NULL',
      orderBy: 'updated_at DESC',
    );
    return result.map((json) => Book.fromMap(json)).toList();
  }

  Future<Book?> getBook(String id) async {
    final db = await instance.database;
    final maps = await db.query(
      'books',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (maps.isNotEmpty) {
      return Book.fromMap(maps.first);
    }
    return null;
  }

  Future<int> insertBook(Book book) async {
    final db = await instance.database;
    return await db.insert('books', book.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<int> updateBook(Book book) async {
    final db = await instance.database;
    return await db.update(
      'books',
      book.toMap(),
      where: 'id = ?',
      whereArgs: [book.id],
    );
  }

  Future<int> deleteBook(String id) async {
    final db = await instance.database;
    final now = DateTime.now().toIso8601String();
    return await db.update(
      'books',
      {
        'deleted_at': now,
        'updated_at': now,
        'sync_status': 'pending_delete',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<List<Book>> getPendingSyncBooks() async {
    final db = await instance.database;
    final result = await db.query(
      'books',
      where: "sync_status LIKE 'pending_%'",
    );
    return result.map((json) => Book.fromMap(json)).toList();
  }

  Future<void> markBookSynced(String id) async {
    final db = await instance.database;
    await db.update(
      'books',
      {'sync_status': 'synced'},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> upsertRemoteBook(Book b) async {
    final db = await instance.database;
    await db.rawInsert('''
      INSERT INTO books (
        id, title, type, unit_type, progress_structure, parent_progress, parent_total,
        latest_units, is_ongoing, author, status, rating, progress, total_units,
        genre_tags, source_link, cover_url, reading_pace, date_started,
        date_finished, notes, is_favorite, deleted_at, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        unit_type = excluded.unit_type,
        progress_structure = excluded.progress_structure,
        parent_progress = excluded.parent_progress,
        parent_total = excluded.parent_total,
        latest_units = excluded.latest_units,
        is_ongoing = excluded.is_ongoing,
        author = excluded.author,
        status = excluded.status,
        rating = excluded.rating,
        progress = excluded.progress,
        total_units = excluded.total_units,
        genre_tags = excluded.genre_tags,
        source_link = excluded.source_link,
        cover_url = excluded.cover_url,
        reading_pace = excluded.reading_pace,
        date_started = excluded.date_started,
        date_finished = excluded.date_finished,
        notes = excluded.notes,
        is_favorite = excluded.is_favorite,
        deleted_at = excluded.deleted_at,
        updated_at = excluded.updated_at,
        sync_status = 'synced'
    ''', [
      b.id,
      b.title,
      b.type,
      b.unitType,
      b.progressStructure,
      b.parentProgress,
      b.parentTotal,
      b.latestUnits,
      (b.isOngoing == true) ? 1 : 0,
      b.author,
      b.status,
      b.rating,
      b.progress,
      b.totalUnits,
      b.genreTags,
      b.sourceLink,
      b.coverUrl,
      b.readingPace,
      b.dateStarted,
      b.dateFinished,
      b.notes,
      (b.isFavorite == true) ? 1 : 0,
      b.deletedAt,
      b.createdAt,
      b.updatedAt,
    ]);
  }

  Future<List<Book>> getTrashBooks() async {
    final db = await instance.database;
    final result = await db.query(
      'books',
      where: 'deleted_at IS NOT NULL',
      orderBy: 'updated_at DESC',
    );
    return result.map((json) => Book.fromMap(json)).toList();
  }

  Future<int> restoreBook(String id) async {
    final db = await instance.database;
    final now = DateTime.now().toIso8601String();
    return await db.update(
      'books',
      {
        'deleted_at': null,
        'updated_at': now,
        'sync_status': 'pending_update',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> permanentDeleteBook(String id) async {
    final db = await instance.database;
    await db.delete('reading_log', where: 'book_id = ?', whereArgs: [id]);
    return await db.delete('books', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> insertReadingLog(ReadingLogEntry entry) async {
    final db = await instance.database;
    return await db.insert(
      'reading_log',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<ReadingLogEntry>> getPendingSyncReadingLogs() async {
    final db = await instance.database;
    final result = await db.query(
      'reading_log',
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: ['pending_create', 'pending_update'],
    );
    return result.map((json) => ReadingLogEntry.fromMap(json)).toList();
  }

  Future<int> markReadingLogSynced(String id) async {
    final db = await instance.database;
    return await db.update(
      'reading_log',
      {'sync_status': 'synced'},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<int> upsertRemoteReadingLog(ReadingLogEntry entry) async {
    final db = await instance.database;
    return await db.insert(
      'reading_log',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<ReadingLogEntry>> getReadingLogs(String bookId) async {
    final db = await instance.database;
    final result = await db.query(
      'reading_log',
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'logged_at DESC',
    );
    return result.map((json) => ReadingLogEntry.fromMap(json)).toList();
  }

  Future<List<Map<String, dynamic>>> getAllReadingLogsWithBookInfo({int limit = 30, int offset = 0}) async {
    final db = await instance.database;
    return await db.rawQuery('''
      SELECT 
        l.id as log_id,
        l.book_id,
        l.from_progress,
        l.to_progress,
        l.note,
        l.logged_at,
        b.title as book_title,
        b.author as book_author,
        b.type as book_type,
        b.cover_url as book_cover_url
      FROM reading_log l
      INNER JOIN books b ON l.book_id = b.id
      ORDER BY l.logged_at DESC
      LIMIT ? OFFSET ?
    ''', [limit, offset]);
  }

  Future<int> getReadingLogsCount() async {
    final db = await instance.database;
    final res = await db.rawQuery('SELECT COUNT(*) as count FROM reading_log l INNER JOIN books b ON l.book_id = b.id');
    if (res.isNotEmpty && res.first['count'] != null) {
      return (res.first['count'] as num).toInt();
    }
    return 0;
  }

  Future<int> deleteReadingLog(String id) async {
    final db = await instance.database;
    return await db.delete('reading_log', where: 'id = ?', whereArgs: [id]);
  }
}
