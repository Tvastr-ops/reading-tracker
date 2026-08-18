import '../models/book.dart';
import '../utils/formatters.dart';
import 'database_helper.dart';
import 'sync/sync_manager.dart';

class ReadingMutationService {
  static final ReadingMutationService instance = ReadingMutationService._init();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;

  ReadingMutationService._init();

  /// Advances progress by [delta] (e.g. +1, +5 chapters) and writes an atomic reading log.
  Future<Book> advanceProgress({
    required Book book,
    required double delta,
    String? note,
  }) async {
    final fromProgress = book.progress;
    final toProgress = fromProgress + delta;
    return await setProgress(
      book: book,
      newProgress: toProgress,
      fromProgress: fromProgress,
      note: note,
    );
  }

  /// Advances multi-tier continuous volume/chapter progress.
  Future<Book> advanceMultiTierProgress({
    required Book book,
    required int chaptersDelta,
    required int volumesDelta,
    String? note,
  }) async {
    final fromProgress = book.progress;
    final currentCh = fromProgress.toInt();
    final newCh = currentCh + chaptersDelta;
    final currentVol = (book.parentProgress ?? 0).toInt();
    final newVol = currentVol + volumesDelta;

    final now = DateTime.now().toIso8601String();
    var newStatus = book.status;
    if (newStatus == BookStatus.planToRead && (newCh > 0 || newVol > 0)) {
      newStatus = BookStatus.reading;
    }

    final updatedBook = book.copyWith(
      progress: newCh.toDouble(),
      parentProgress: newVol > 0 ? newVol : null,
      status: newStatus,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    final logEntry = ReadingLogEntry(
      id: generateUuidV4(),
      bookId: book.id,
      fromProgress: fromProgress,
      toProgress: newCh.toDouble(),
      note: note ?? (volumesDelta > 0 ? 'Advanced to Vol $newVol, Ch $newCh' : null),
      loggedAt: now,
      syncStatus: 'pending_create',
    );

    final db = await _dbHelper.database;
    await db.transaction((txn) async {
      await txn.insert('reading_log', logEntry.toMap());
      await txn.update('books', updatedBook.toMap(), where: 'id = ?', whereArgs: [book.id]);
    });

    _syncManager.syncNow();
    return updatedBook;
  }

  /// Sets absolute progress and logs the reading session.
  Future<Book> setProgress({
    required Book book,
    required double newProgress,
    double? fromProgress,
    String? note,
  }) async {
    final now = DateTime.now().toIso8601String();
    final startVal = fromProgress ?? book.progress;

    var newStatus = book.status;
    if (newStatus == BookStatus.planToRead && newProgress > 0) {
      newStatus = BookStatus.reading;
    }

    final updatedBook = book.copyWith(
      progress: newProgress,
      status: newStatus,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    final logEntry = ReadingLogEntry(
      id: generateUuidV4(),
      bookId: book.id,
      fromProgress: startVal,
      toProgress: newProgress,
      note: note,
      loggedAt: now,
      syncStatus: 'pending_create',
    );

    final db = await _dbHelper.database;
    await db.transaction((txn) async {
      await txn.insert('reading_log', logEntry.toMap());
      await txn.update('books', updatedBook.toMap(), where: 'id = ?', whereArgs: [book.id]);
    });

    _syncManager.syncNow();
    return updatedBook;
  }

  /// Changes the reading status (e.g. Reading, Completed, Dropped).
  Future<Book> changeStatus({
    required Book book,
    required String newStatus,
  }) async {
    final now = DateTime.now().toIso8601String();
    final updatedBook = book.copyWith(
      status: newStatus,
      dateFinished: newStatus == BookStatus.completed ? (book.dateFinished ?? now.substring(0, 10)) : book.dateFinished,
      dateStarted: (newStatus == BookStatus.reading && book.dateStarted == null) ? now.substring(0, 10) : book.dateStarted,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updatedBook);
    _syncManager.syncNow();
    return updatedBook;
  }

  /// Toggles the favorite flag on a book.
  Future<Book> toggleFavorite({required Book book}) async {
    final now = DateTime.now().toIso8601String();
    final nextFav = !(book.isFavorite == true);
    final updatedBook = book.copyWith(
      isFavorite: nextFav,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updatedBook);
    _syncManager.syncNow();
    return updatedBook;
  }
}
