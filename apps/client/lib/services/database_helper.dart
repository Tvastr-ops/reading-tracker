import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/book.dart';
import '../models/reading_journey.dart';
import '../utils/formatters.dart';
import '../utils/progression_logic.dart';

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

    String dbPath;
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
      try {
        final exeDir = File(Platform.resolvedExecutable).parent.path;
        final portableDataDir = Directory(join(exeDir, 'portable_data'));
        final portableMarker = File(join(exeDir, '.portable'));
        if (portableDataDir.existsSync() || portableMarker.existsSync()) {
          if (!portableDataDir.existsSync()) {
            portableDataDir.createSync(recursive: true);
          }
          dbPath = portableDataDir.path;
        } else {
          dbPath = await getDatabasesPath();
        }
      } catch (_) {
        dbPath = await getDatabasesPath();
      }
    } else {
      dbPath = await getDatabasesPath();
    }
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 5,
      onConfigure: (db) async {
        try {
          await db.execute('PRAGMA journal_mode = WAL;');
          await db.execute('PRAGMA synchronous = NORMAL;');
        } catch (_) {}
      },
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
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
        series_name TEXT,
        series_order REAL,
        shelf_names TEXT,
        reread_count INTEGER DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced'
      )
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_books_series ON books (series_name, series_order)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books (deleted_at)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_books_sync_status ON books (sync_status)
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS reading_journeys (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        journey_index INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'reading',
        date_started TEXT NOT NULL,
        date_finished TEXT,
        rating REAL,
        review TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_journeys_book ON reading_journeys (book_id, journey_index DESC)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_journeys_sync_status ON reading_journeys (sync_status)
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS reading_log (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        journey_id TEXT,
        from_progress REAL,
        to_progress REAL NOT NULL,
        note TEXT,
        logged_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (journey_id) REFERENCES reading_journeys (id) ON DELETE SET NULL
      )
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_reading_log_book_logged ON reading_log (book_id, logged_at DESC)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_reading_log_journey ON reading_log (journey_id)
    ''');
    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_reading_log_sync_status ON reading_log (sync_status)
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          action TEXT NOT NULL,
          payload TEXT,
          created_at TEXT NOT NULL
        )
      ''');
    }
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE books ADD COLUMN series_name TEXT');
      await db.execute('ALTER TABLE books ADD COLUMN series_order REAL');
      await db.execute('ALTER TABLE books ADD COLUMN shelf_names TEXT');
      await db.execute('ALTER TABLE books ADD COLUMN reread_count INTEGER DEFAULT 0');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_books_series ON books (series_name, series_order)');
    }
    if (oldVersion < 4) {
      await db.execute('CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books (deleted_at)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_books_sync_status ON books (sync_status)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_reading_log_book_logged ON reading_log (book_id, logged_at DESC)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_reading_log_sync_status ON reading_log (sync_status)');
    }
    if (oldVersion < 5) {
      // 1. Create reading_journeys table
      await db.execute('''
        CREATE TABLE IF NOT EXISTS reading_journeys (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          journey_index INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'reading',
          date_started TEXT NOT NULL,
          date_finished TEXT,
          rating REAL,
          review TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT DEFAULT 'synced',
          FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        )
      ''');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_journeys_book ON reading_journeys (book_id, journey_index DESC)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_journeys_sync_status ON reading_journeys (sync_status)');

      // 2. Add journey_id to reading_log
      try {
        await db.execute('ALTER TABLE reading_log ADD COLUMN journey_id TEXT');
      } catch (_) {}
      await db.execute('CREATE INDEX IF NOT EXISTS idx_reading_log_journey ON reading_log (journey_id)');

      // 3. Backfill Journey #1 for existing books with started/finished dates or completed status
      try {
        final existingBooks = await db.rawQuery(
          "SELECT id, status, date_started, date_finished, rating, created_at, updated_at FROM books WHERE deleted_at IS NULL AND (date_started IS NOT NULL OR date_finished IS NOT NULL OR status = 'Completed' OR status = 'Reading')"
        );

        for (final b in existingBooks) {
          final bookId = b['id'] as String;
          final statusStr = b['status'] as String? ?? 'Reading';
          final journeyStatus = statusStr == 'Completed' ? 'completed' : 'reading';
          final started = b['date_started'] as String? ?? b['created_at'] as String? ?? DateTime.now().toUtc().toIso8601String();
          final finished = b['date_finished'] as String?;
          final ratingVal = b['rating'] as num?;
          final createdAtStr = b['created_at'] as String? ?? DateTime.now().toUtc().toIso8601String();
          final updatedAtStr = b['updated_at'] as String? ?? DateTime.now().toUtc().toIso8601String();
          final journeyId = generateUuidV4();

          await db.insert('reading_journeys', {
            'id': journeyId,
            'book_id': bookId,
            'journey_index': 1,
            'status': journeyStatus,
            'date_started': started,
            'date_finished': finished,
            'rating': ratingVal?.toDouble(),
            'review': null,
            'created_at': createdAtStr,
            'updated_at': updatedAtStr,
            'sync_status': 'synced',
          }, conflictAlgorithm: ConflictAlgorithm.ignore);

          // Link unassigned reading_log rows to Journey #1
          await db.rawUpdate(
            'UPDATE reading_log SET journey_id = ? WHERE book_id = ? AND journey_id IS NULL',
            [journeyId, bookId],
          );
        }
      } catch (e) {
        debugPrint('Database migration v5 backfill error: $e');
      }
    }
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

  /// Atomically inserts a new book along with its initial reading journey and optional simulated reading logs.
  Future<void> insertBookWithInitialJourneysAndLogs({
    required Book book,
    required ReadingJourney journey,
    List<ReadingLogEntry> logs = const [],
  }) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.insert('books', book.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      await txn.insert('reading_journeys', journey.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      for (final log in logs) {
        await txn.insert('reading_log', log.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<int> updateBook(Book book) async {
    final db = await instance.database;
    return await db.transaction((txn) async {
      final rows = await txn.update(
        'books',
        book.toMap(),
        where: 'id = ?',
        whereArgs: [book.id],
      );

      // Keep the most recent/active reading journey dates and rating in sync
      if (book.dateStarted != null || book.dateFinished != null || book.rating != null) {
        final nowIso = DateTime.now().toUtc().toIso8601String();
        final latestJourneys = await txn.query(
          'reading_journeys',
          where: 'book_id = ?',
          whereArgs: [book.id],
          orderBy: 'journey_index DESC',
          limit: 1,
        );

        if (latestJourneys.isNotEmpty) {
          final jId = latestJourneys.first['id'] as String;
          await txn.update(
            'reading_journeys',
            {
              if (book.dateStarted != null) 'date_started': book.dateStarted,
              if (book.dateFinished != null) 'date_finished': book.dateFinished,
              if (book.rating != null) 'rating': book.rating,
              if (book.status == BookStatus.completed) 'status': 'completed',
              'updated_at': nowIso,
              'sync_status': 'pending_update',
            },
            where: 'id = ?',
            whereArgs: [jId],
          );
        }
      }

      return rows;
    });
  }

  Future<int> deleteBook(String id) async {
    final db = await instance.database;
    final now = DateTime.now().toUtc().toIso8601String();
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

  Future<void> remapBookId(String oldId, String newId) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.delete('books', where: 'id = ?', whereArgs: [newId]);
      await txn.update(
        'books',
        {'id': newId, 'sync_status': 'synced'},
        where: 'id = ?',
        whereArgs: [oldId],
      );
      await txn.update(
        'reading_log',
        {'book_id': newId},
        where: 'book_id = ?',
        whereArgs: [oldId],
      );
    });
  }

  Future<void> upsertRemoteBooks(List<Book> books) async {
    if (books.isEmpty) return;
    final db = await instance.database;
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final b in books) {
        batch.rawInsert('''
          INSERT INTO books (
            id, title, type, unit_type, progress_structure, parent_progress, parent_total,
            latest_units, is_ongoing, author, status, rating, progress, total_units,
            genre_tags, source_link, cover_url, reading_pace, date_started,
            date_finished, notes, is_favorite, series_name, series_order, shelf_names, reread_count,
            deleted_at, created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
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
            series_name = excluded.series_name,
            series_order = excluded.series_order,
            shelf_names = excluded.shelf_names,
            reread_count = excluded.reread_count,
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
          b.seriesName,
          b.seriesOrder,
          b.shelfNames,
          b.rereadCount,
          b.deletedAt,
          b.createdAt,
          b.updatedAt,
        ]);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> upsertRemoteBook(Book b) async {
    await upsertRemoteBooks([b]);
  }

  /// Removes local synced books that have been permanently deleted from the remote backend.
  Future<void> cleanupMissingRemoteBooks(Set<String> remoteIds) async {
    final db = await instance.database;
    final localSynced = await db.query(
      'books',
      columns: ['id'],
      where: "sync_status = 'synced'",
    );
    final toDelete = <String>[];
    for (final row in localSynced) {
      final localId = row['id'] as String;
      if (!remoteIds.contains(localId)) {
        toDelete.add(localId);
      }
    }
    if (toDelete.isEmpty) return;

    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final id in toDelete) {
        batch.delete('reading_log', where: 'book_id = ?', whereArgs: [id]);
        batch.delete('books', where: 'id = ?', whereArgs: [id]);
      }
      await batch.commit(noResult: true);
    });
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
    final now = DateTime.now().toUtc().toIso8601String();
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
    return await db.transaction((txn) async {
      await txn.insert('sync_queue', {
        'id': id,
        'table_name': 'books',
        'record_id': id,
        'action': 'delete_permanent',
        'payload': '{}',
        'created_at': DateTime.now().toUtc().toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      await txn.delete('reading_log', where: 'book_id = ?', whereArgs: [id]);
      return await txn.delete('books', where: 'id = ?', whereArgs: [id]);
    });
  }

  Future<List<Map<String, dynamic>>> getPendingTombstones() async {
    final db = await instance.database;
    return await db.query(
      'sync_queue',
      where: "action = 'delete_permanent'",
    );
  }

  Future<int> removeTombstone(String id) async {
    final db = await instance.database;
    return await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
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

  Future<void> upsertRemoteReadingLogs(List<ReadingLogEntry> entries) async {
    if (entries.isEmpty) return;
    final db = await instance.database;
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final entry in entries) {
        batch.insert(
          'reading_log',
          entry.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
      await batch.commit(noResult: true);
    });
  }

  /// Upserts a single remote reading log entry.
  Future<int> upsertRemoteReadingLog(ReadingLogEntry entry) async {
    await upsertRemoteReadingLogs([entry]);
    return 1;
  }

  /// Authoritative atomic operation for mutating reading progress in SQLite:
  /// Applies lifecycle normalization, updates the book, inserts a pending log entry,
  /// and recalculates reading pace in one synchronous transaction.
  Future<Book> recordBookProgress(
    Book book,
    double toProgress, {
    num? parentProgress,
    String? note,
    String? journeyId,
  }) async {
    final db = await instance.database;
    // Auto-resolve active journey if not passed
    var effectiveJourneyId = journeyId;
    if (effectiveJourneyId == null) {
      final activeJourney = await getActiveJourney(book.id);
      effectiveJourneyId = activeJourney?.id;
    }

    // Query only the boundary logs (oldest and newest) needed for pace calculation instead of pulling full log history
    final boundaryLogsRaw = await db.rawQuery('''
      SELECT * FROM (
        SELECT * FROM reading_log WHERE book_id = ? ORDER BY logged_at ASC LIMIT 1
      )
      UNION ALL
      SELECT * FROM (
        SELECT * FROM reading_log WHERE book_id = ? ORDER BY logged_at DESC LIMIT 1
      )
    ''', [book.id, book.id]);

    final existingLogs = boundaryLogsRaw.map((json) => ReadingLogEntry.fromMap(json)).toList();

    final mutation = applyProgressIncrement(
      book,
      toProgress,
      parentProgress: parentProgress,
      note: note,
      journeyId: effectiveJourneyId,
      existingLogs: existingLogs,
    );

    await db.transaction((txn) async {
      await txn.update(
        'books',
        mutation.updatedBook.toMap(),
        where: 'id = ?',
        whereArgs: [book.id],
      );

      if (mutation.logEntry != null) {
        await txn.insert(
          'reading_log',
          mutation.logEntry!.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }

      // If the book transitioned to completed, also complete the active journey
      if (mutation.updatedBook.status == BookStatus.completed && effectiveJourneyId != null) {
        final nowIso = DateTime.now().toUtc().toIso8601String();
        await txn.update(
          'reading_journeys',
          {
            'status': 'completed',
            'date_finished': mutation.updatedBook.dateFinished ?? nowIso,
            'rating': mutation.updatedBook.rating,
            'updated_at': nowIso,
            'sync_status': 'pending_update',
          },
          where: 'id = ?',
          whereArgs: [effectiveJourneyId],
        );
      }
    });

    return mutation.updatedBook;
  }

  // ==========================================
  // READING JOURNEYS CRUD & SYNC OPERATIONS
  // ==========================================

  Future<int> insertReadingJourney(ReadingJourney journey) async {
    final db = await instance.database;
    return await db.insert(
      'reading_journeys',
      journey.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<int> updateReadingJourney(ReadingJourney journey) async {
    final db = await instance.database;
    return await db.update(
      'reading_journeys',
      journey.toMap(),
      where: 'id = ?',
      whereArgs: [journey.id],
    );
  }

  Future<List<ReadingJourney>> getReadingJourneys(String bookId) async {
    final db = await instance.database;
    final result = await db.query(
      'reading_journeys',
      where: 'book_id = ?',
      whereArgs: [bookId],
      orderBy: 'journey_index DESC, created_at DESC',
    );
    return result.map((json) => ReadingJourney.fromMap(json)).toList();
  }

  Future<ReadingJourney?> getActiveJourney(String bookId) async {
    final db = await instance.database;
    final result = await db.query(
      'reading_journeys',
      where: 'book_id = ? AND (status = ? OR date_finished IS NULL)',
      whereArgs: [bookId, 'reading'],
      orderBy: 'journey_index DESC',
      limit: 1,
    );
    if (result.isEmpty) return null;
    return ReadingJourney.fromMap(result.first);
  }

  Future<List<ReadingJourney>> getAllReadingJourneys() async {
    final db = await instance.database;
    final result = await db.query(
      'reading_journeys',
      orderBy: 'created_at DESC',
    );
    return result.map((json) => ReadingJourney.fromMap(json)).toList();
  }

  Future<List<ReadingJourney>> getPendingSyncReadingJourneys() async {
    final db = await instance.database;
    final result = await db.query(
      'reading_journeys',
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: ['pending_create', 'pending_update'],
    );
    return result.map((json) => ReadingJourney.fromMap(json)).toList();
  }

  Future<int> markReadingJourneySynced(String id) async {
    final db = await instance.database;
    return await db.update(
      'reading_journeys',
      {'sync_status': 'synced'},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> upsertRemoteReadingJourneys(List<ReadingJourney> journeys) async {
    if (journeys.isEmpty) return;
    final db = await instance.database;
    await db.transaction((txn) async {
      final batch = txn.batch();
      for (final journey in journeys) {
        batch.insert(
          'reading_journeys',
          journey.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
      await batch.commit(noResult: true);
    });
  }

  Future<int> deleteReadingJourneysForBook(String bookId) async {
    final db = await instance.database;
    return await db.delete(
      'reading_journeys',
      where: 'book_id = ?',
      whereArgs: [bookId],
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

  Future<int> updateReadingLog(ReadingLogEntry log) async {
    final db = await instance.database;
    return await db.update(
      'reading_log',
      log.toMap(),
      where: 'id = ?',
      whereArgs: [log.id],
    );
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
        b.unit_type as book_unit_type,
        b.total_units as book_total_units,
        b.reread_count as book_reread_count,
        b.status as book_status,
        b.cover_url as book_cover_url
      FROM reading_log l
      LEFT JOIN books b ON l.book_id = b.id
      ORDER BY l.logged_at DESC
      LIMIT ? OFFSET ?
    ''', [limit, offset]);
  }

  Future<int> getReadingLogsCount() async {
    final db = await instance.database;
    final res = await db.rawQuery('SELECT COUNT(*) as count FROM reading_log l');
    if (res.isNotEmpty && res.first['count'] != null) {
      return (res.first['count'] as num).toInt();
    }
    return 0;
  }

  Future<Map<String, dynamic>> getAggregatedReadingStats({int? year}) async {
    final db = await instance.database;
    final yearFilter = year != null ? "WHERE logged_at LIKE '$year-%'" : "";
    final res = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(CASE WHEN to_progress > from_progress THEN (to_progress - from_progress) ELSE 0 END), 0) as total_units,
        COUNT(id) as total_logs,
        COUNT(DISTINCT book_id) as active_books
      FROM reading_log
      $yearFilter
    ''');
    if (res.isNotEmpty) {
      return {
        'totalUnits': ((res.first['total_units'] as num?) ?? 0).toDouble(),
        'totalLogs': ((res.first['total_logs'] as num?) ?? 0).toInt(),
        'activeBooks': ((res.first['active_books'] as num?) ?? 0).toInt(),
      };
    }
    return {'totalUnits': 0.0, 'totalLogs': 0, 'activeBooks': 0};
  }

  /// Calculates cumulative volume read broken down by unit_type (pages, chapters, volumes, words, etc.)
  Future<Map<String, double>> getUnitBreakdownStats({int? year}) async {
    final db = await instance.database;
    final breakdown = <String, double>{};

    try {
      final yearLogFilter = year != null ? "AND l.logged_at LIKE '$year-%'" : "";

      // 1. Sum deltas from reading_log joined with books
      final logRes = await db.rawQuery('''
        SELECT 
          LOWER(COALESCE(b.unit_type, 'pages')) as unit_type,
          SUM(CASE WHEN l.to_progress > l.from_progress THEN (l.to_progress - l.from_progress) ELSE 0 END) as logged_units
        FROM reading_log l
        INNER JOIN books b ON l.book_id = b.id
        WHERE b.deleted_at IS NULL $yearLogFilter
        GROUP BY LOWER(COALESCE(b.unit_type, 'pages'))
      ''');

      for (final row in logRes) {
        final type = (row['unit_type'] as String?) ?? 'pages';
        final units = ((row['logged_units'] as num?) ?? 0).toDouble();
        if (units > 0) {
          breakdown[type] = (breakdown[type] ?? 0.0) + units;
        }
      }

      // 2. Fallback: Include base progress for books that have progress but no log rows yet (for all-time or matching year)
      if (year == null || year == DateTime.now().year) {
        final fallbackRes = await db.rawQuery('''
          SELECT 
            LOWER(COALESCE(unit_type, 'pages')) as unit_type,
            SUM(progress) as book_progress
          FROM books
          WHERE deleted_at IS NULL 
            AND progress > 0
            AND id NOT IN (SELECT DISTINCT book_id FROM reading_log)
          GROUP BY LOWER(COALESCE(unit_type, 'pages'))
        ''');

        for (final row in fallbackRes) {
          final type = (row['unit_type'] as String?) ?? 'pages';
          final units = ((row['book_progress'] as num?) ?? 0).toDouble();
          if (units > 0) {
            breakdown[type] = (breakdown[type] ?? 0.0) + units;
          }
        }
      }
    } catch (e) {
      debugPrint('[DatabaseHelper] getUnitBreakdownStats error: $e');
    }

    return breakdown;
  }

  /// Fetches daily reading activity units for a given year (or all time) for calendar heatmaps.
  Future<Map<String, double>> getDailyReadingActivityMap({int? year}) async {
    final db = await instance.database;
    final activity = <String, double>{};
    try {
      final yearFilter = year != null ? "WHERE logged_at LIKE '$year-%'" : "";
      final res = await db.rawQuery('''
        SELECT 
          SUBSTR(logged_at, 1, 10) as log_date,
          SUM(CASE WHEN to_progress > from_progress THEN (to_progress - from_progress) ELSE 1 END) as daily_units
        FROM reading_log
        $yearFilter
        GROUP BY SUBSTR(logged_at, 1, 10)
      ''');

      for (final row in res) {
        final date = row['log_date'] as String?;
        final units = ((row['daily_units'] as num?) ?? 0).toDouble();
        if (date != null && date.isNotEmpty) {
          activity[date] = units;
        }
      }
    } catch (e) {
      debugPrint('[DatabaseHelper] getDailyReadingActivityMap error: $e');
    }
    return activity;
  }

  /// Calculates reading streak statistics (current streak, longest streak, total active days).
  Future<Map<String, int>> getReadingStreakStats() async {
    final db = await instance.database;
    try {
      final res = await db.rawQuery('''
        SELECT DISTINCT SUBSTR(logged_at, 1, 10) as log_date
        FROM reading_log
        WHERE logged_at IS NOT NULL AND logged_at != ''
        ORDER BY log_date DESC
      ''');

      if (res.isEmpty) {
        return {'currentStreak': 0, 'longestStreak': 0, 'totalDays': 0};
      }

      final dates = <DateTime>[];
      for (final row in res) {
        final dStr = row['log_date'] as String?;
        if (dStr != null) {
          final dt = DateTime.tryParse(dStr);
          if (dt != null) {
            dates.add(DateTime(dt.year, dt.month, dt.day));
          }
        }
      }

      if (dates.isEmpty) {
        return {'currentStreak': 0, 'longestStreak': 0, 'totalDays': 0};
      }

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));

      // Calculate current streak
      int currentStreak = 0;
      final latest = dates.first;
      if (latest == today || latest == yesterday) {
        DateTime expected = latest;
        for (final d in dates) {
          if (d == expected) {
            currentStreak++;
            expected = expected.subtract(const Duration(days: 1));
          } else if (d.isBefore(expected)) {
            break;
          }
        }
      }

      // Calculate longest streak
      int longestStreak = 0;
      int tempStreak = 0;
      DateTime? prev;

      for (final d in dates) {
        if (prev == null) {
          tempStreak = 1;
        } else {
          final diff = prev.difference(d).inDays;
          if (diff == 1) {
            tempStreak++;
          } else {
            if (tempStreak > longestStreak) longestStreak = tempStreak;
            tempStreak = 1;
          }
        }
        prev = d;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;

      return {
        'currentStreak': currentStreak,
        'longestStreak': longestStreak,
        'totalDays': dates.length,
      };
    } catch (e) {
      debugPrint('[DatabaseHelper] getReadingStreakStats error: $e');
      return {'currentStreak': 0, 'longestStreak': 0, 'totalDays': 0};
    }
  }

  Future<int> deleteReadingLog(String id) async {
    final db = await instance.database;
    return await db.delete('reading_log', where: 'id = ?', whereArgs: [id]);
  }

  /// Fix 3: Recalculates and persists reading pace for a set of book IDs after
  /// remote logs are synced. Prevents cross-device pace staleness where the pace
  /// stored on the server may not reflect recent progress from another device
  /// until this client makes a local progress entry.
  Future<void> recalculatePaceForBooks(Set<String> bookIds) async {
    if (bookIds.isEmpty) return;
    final db = await instance.database;
    for (final bookId in bookIds) {
      try {
        final logRows = await db.query(
          'reading_log',
          where: 'book_id = ?',
          whereArgs: [bookId],
          orderBy: 'logged_at ASC',
        );
        if (logRows.isEmpty) continue;
        final logs = logRows.map((r) => ReadingLogEntry.fromMap(r)).toList();
        final newPace = calculateReadingPaceFromLogs(logs);
        await db.update(
          'books',
          {'reading_pace': newPace},
          where: 'id = ? AND sync_status = ?',
          whereArgs: [bookId, 'synced'],
        );
      } catch (e) {
        debugPrint('[DatabaseHelper] recalculatePaceForBooks error for $bookId: $e');
      }
    }
  }

  /// Fetches all distinct genre tags currently saved across non-deleted books in SQLite,
  /// ordered by frequency (most used first).
  Future<List<String>> getDistinctGenreTags() async {
    final db = await instance.database;
    final results = await db.rawQuery(
      "SELECT genre_tags FROM books WHERE genre_tags IS NOT NULL AND genre_tags != '' AND deleted_at IS NULL",
    );
    final tagCounts = <String, int>{};
    for (final row in results) {
      final tagsStr = row['genre_tags'] as String?;
      if (tagsStr != null && tagsStr.isNotEmpty) {
        final tags = tagsStr.split(',').map((t) => normalizeGenreTag(t)).where((t) => t.isNotEmpty);
        for (final tag in tags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
      }
    }
    final sorted = tagCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return sorted.map((e) => e.key).toList();
  }
}
