import '../models/book.dart';
import '../models/reading_journey.dart';
import '../utils/formatters.dart';
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
    String? journeyId,
  }) async {
    final toProgress = book.progress + delta;
    return await setProgress(
      book: book,
      newProgress: toProgress,
      note: note,
      journeyId: journeyId,
    );
  }

  /// Advances multi-tier continuous volume/chapter progress.
  Future<Book> advanceMultiTierProgress({
    required Book book,
    required int chaptersDelta,
    required int volumesDelta,
    String? note,
    String? journeyId,
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
      journeyId: journeyId,
    );

    _syncManager.scheduleSyncSoon();
    return updatedBook;
  }

  /// Sets absolute progress and logs the reading session using pure domain logic.
  Future<Book> setProgress({
    required Book book,
    required double newProgress,
    double? fromProgress,
    num? parentProgress,
    String? note,
    String? journeyId,
  }) async {
    final updatedBook = await _dbHelper.recordBookProgress(
      book,
      newProgress,
      parentProgress: parentProgress,
      note: note,
      journeyId: journeyId,
    );

    _syncManager.scheduleSyncSoon();
    return updatedBook;
  }

  /// Changes the reading status with canonical lifecycle normalization.
  Future<Book> changeStatus({
    required Book book,
    required String newStatus,
  }) async {
    final now = DateTime.now().toUtc();
    final nowIso = now.toIso8601String();
    final normalized = normalizeStatusTransition(book, newStatus);
    await _dbHelper.updateBook(normalized);

    // Synchronize active journey status
    final activeJourney = await _dbHelper.getActiveJourney(book.id);
    if (activeJourney != null) {
      if (newStatus == BookStatus.completed) {
        final updatedJourney = activeJourney.copyWith(
          status: 'completed',
          dateFinished: normalized.dateFinished ?? nowIso,
          rating: normalized.rating,
          updatedAt: nowIso,
          syncStatus: 'pending_update',
        );
        await _dbHelper.updateReadingJourney(updatedJourney);
      } else if (newStatus == BookStatus.dropped || newStatus == BookStatus.onHold) {
        final updatedJourney = activeJourney.copyWith(
          status: newStatus == BookStatus.dropped ? 'abandoned' : 'on_hold',
          updatedAt: nowIso,
          syncStatus: 'pending_update',
        );
        await _dbHelper.updateReadingJourney(updatedJourney);
      }
    }

    _syncManager.scheduleSyncSoon();
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
    _syncManager.scheduleSyncSoon();
    return updatedBook;
  }

  /// Initiates a conflict-free re-read: closes previous journey, spawns a new journey,
  /// resets progress to 0, increments rereadCount, and sets status to Reading.
  Future<Book> startReread({required Book book}) async {
    final now = DateTime.now().toUtc();
    final nowIso = now.toIso8601String();
    final newRereadCount = book.rereadCount + 1;
    final newJourneyIndex = newRereadCount + 1;

    // 1. Finalize any currently open journey if one exists
    final activeJourney = await _dbHelper.getActiveJourney(book.id);
    if (activeJourney != null) {
      final finalizedJourney = activeJourney.copyWith(
        status: 'completed',
        dateFinished: activeJourney.dateFinished ?? nowIso,
        updatedAt: nowIso,
        syncStatus: 'pending_update',
      );
      await _dbHelper.updateReadingJourney(finalizedJourney);
    }

    // 2. Create and insert new journey for this re-read
    final newJourney = ReadingJourney(
      id: generateUuidV4(),
      bookId: book.id,
      journeyIndex: newJourneyIndex,
      status: 'reading',
      dateStarted: nowIso,
      dateFinished: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: 'pending_create',
    );
    await _dbHelper.insertReadingJourney(newJourney);

    // 3. Update book state
    final updatedBook = book.copyWith(
      progress: 0.0,
      parentProgress: book.progressStructure != 'single' ? 1 : null,
      status: BookStatus.reading,
      rereadCount: newRereadCount,
      dateStarted: nowIso,
      clearDateFinished: true,
      updatedAt: nowIso,
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updatedBook);
    _syncManager.scheduleSyncSoon();
    return updatedBook;
  }
}
