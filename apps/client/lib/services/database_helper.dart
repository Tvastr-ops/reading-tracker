import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/book.dart';
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
      version: 3,
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

  Future<void> upsertRemoteBook(Book b) async {
    final db = await instance.database;

    // Proactively clean up any duplicate entries created locally with identical title
    try {
      final duplicates = await db.query(
        'books',
        where: "title = ? AND id != ?",
        whereArgs: [b.title, b.id],
      );
      for (final dup in duplicates) {
        final dupId = dup['id'] as String;
        await db.delete('reading_log', where: 'book_id = ?', whereArgs: [dupId]);
        await db.delete('books', where: 'id = ?', whereArgs: [dupId]);
      }
    } catch (_) {}

    await db.rawInsert('''
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

  /// Removes local synced books that have been permanently deleted from the remote backend.
  Future<void> cleanupMissingRemoteBooks(Set<String> remoteIds) async {
    final db = await instance.database;
    final localSynced = await db.query(
      'books',
      columns: ['id'],
      where: "sync_status = 'synced'",
    );
    for (final row in localSynced) {
      final localId = row['id'] as String;
      if (!remoteIds.contains(localId)) {
        await db.delete('reading_log', where: 'book_id = ?', whereArgs: [localId]);
        await db.delete('books', where: 'id = ?', whereArgs: [localId]);
      }
    }
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

  /// Upserts a remote reading log entry, actively deduplicating any legacy local rows
  /// that match the same progress transition within a close time window.
  Future<int> upsertRemoteReadingLog(ReadingLogEntry entry) async {
    final db = await instance.database;
    try {
      final duplicates = await db.query(
        'reading_log',
        where: 'book_id = ? AND from_progress = ? AND to_progress = ? AND id != ?',
        whereArgs: [entry.bookId, entry.fromProgress, entry.toProgress, entry.id],
      );
      if (duplicates.isNotEmpty) {
        final remoteTime = DateTime.tryParse(entry.loggedAt);
        for (final row in duplicates) {
          final localLoggedAt = row['logged_at']?.toString();
          if (localLoggedAt != null && remoteTime != null) {
            final localTime = DateTime.tryParse(localLoggedAt);
            if (localTime != null) {
              final diffSec = remoteTime.difference(localTime).inSeconds.abs();
              if (diffSec <= 60) {
                await db.delete('reading_log', where: 'id = ?', whereArgs: [row['id']]);
              }
            }
          }
        }
      }
    } catch (_) {}

    return await db.insert(
      'reading_log',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  /// Authoritative atomic operation for mutating reading progress in SQLite:
  /// Applies lifecycle normalization, updates the book, inserts a pending log entry,
  /// and recalculates reading pace in one synchronous transaction.
  Future<Book> recordBookProgress(
    Book book,
    double toProgress, {
    num? parentProgress,
    String? note,
  }) async {
    final db = await instance.database;
    final existingLogs = await getReadingLogs(book.id);

    final mutation = applyProgressIncrement(
      book,
      toProgress,
      parentProgress: parentProgress,
      note: note,
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
    });

    return mutation.updatedBook;
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
        COUNT(id) as total_logs
      FROM reading_log
      $yearFilter
    ''');
    if (res.isNotEmpty) {
      return {
        'totalUnits': ((res.first['total_units'] as num?) ?? 0).toDouble(),
        'totalLogs': ((res.first['total_logs'] as num?) ?? 0).toInt(),
      };
    }
    return {'totalUnits': 0.0, 'totalLogs': 0};
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
