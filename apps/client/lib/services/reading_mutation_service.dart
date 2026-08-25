import '../models/book.dart';
import '../utils/progression_logic.dart';
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
    final toProgress = book.progress + delta;
    return await setProgress(
      book: book,
      newProgress: toProgress,
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

    final updatedBook = await _dbHelper.recordBookProgress(
      book,
      newCh.toDouble(),
      parentProgress: newVol > 0 ? newVol : null,
      note: note ?? (volumesDelta > 0 ? 'Advanced to Vol $newVol, Ch $newCh' : null),
    );

    _syncManager.syncNow();
    return updatedBook;
  }

  /// Sets absolute progress and logs the reading session using pure domain logic.
  Future<Book> setProgress({
    required Book book,
    required double newProgress,
    double? fromProgress,
    num? parentProgress,
    String? note,
  }) async {
    final updatedBook = await _dbHelper.recordBookProgress(
      book,
      newProgress,
      parentProgress: parentProgress,
      note: note,
    );

    _syncManager.syncNow();
    return updatedBook;
  }

  /// Changes the reading status with canonical lifecycle normalization.
  Future<Book> changeStatus({
    required Book book,
    required String newStatus,
  }) async {
    final normalized = normalizeStatusTransition(book, newStatus);
    await _dbHelper.updateBook(normalized);
    _syncManager.syncNow();
    return normalized;
  }

  /// Toggles the favorite flag on a book without modifying its shelf position.
  Future<Book> toggleFavorite({required Book book}) async {
    final nextFav = !(book.isFavorite == true);
    final updatedBook = book.copyWith(
      isFavorite: nextFav,
      // Preserve existing updatedAt so shelf order remains undisturbed
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updatedBook);
    _syncManager.syncNow();
    return updatedBook;
  }

  /// Initiates a conflict-free re-read: resets progress to 0, increments rereadCount, sets status to Reading.
  Future<Book> startReread({required Book book}) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final updatedBook = book.copyWith(
      progress: 0.0,
      parentProgress: book.progressStructure != 'single' ? 1 : null,
      status: BookStatus.reading,
      rereadCount: book.rereadCount + 1,
      dateStarted: now,
      clearDateFinished: true,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updatedBook);
    _syncManager.syncNow();
    return updatedBook;
  }
}
