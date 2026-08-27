import 'dart:math';
import 'package:intl/intl.dart';
import '../models/book.dart';
import 'formatters.dart';

class ProgressionMutationResult {
  final Book updatedBook;
  final ReadingLogEntry? logEntry;

  const ProgressionMutationResult({
    required this.updatedBook,
    this.logEntry,
  });
}

/// Formats a DateTime to standard YYYY-MM-DD format.
String getLocalDateString([DateTime? date]) {
  final d = date ?? DateTime.now();
  return DateFormat('yyyy-MM-dd').format(d);
}

/// Normalizes status transitions according to the canonical Paperback reading lifecycle:
/// - Reading: Auto-populates `dateStarted` if empty.
/// - Completed: Auto-populates `dateFinished`, fills `progress = totalUnits`, completes parent tiers, and clears `isOngoing`.
/// - Transitioning away from Completed: Clears `dateFinished`.
Book normalizeStatusTransition(Book book, String nextStatus, [DateTime? date]) {
  final today = getLocalDateString(date);
  final nowIso = (date ?? DateTime.now()).toUtc().toIso8601String();

  if (nextStatus == BookStatus.reading) {
    return book.copyWith(
      status: BookStatus.reading,
      dateStarted: (book.dateStarted != null && book.dateStarted!.isNotEmpty) ? book.dateStarted : today,
      updatedAt: nowIso,
      syncStatus: 'pending_update',
    );
  }

  if (nextStatus == BookStatus.completed) {
    double completedProgress = book.progress;
    double? completedTotal = book.totalUnits;

    if (book.totalUnits != null && book.totalUnits! > 0) {
      completedProgress = book.totalUnits!;
    } else if (book.latestUnits != null && book.latestUnits! > 0) {
      completedTotal = book.latestUnits!.toDouble();
      completedProgress = book.latestUnits!.toDouble();
    }

    num? completedParentProg = book.parentProgress;
    if (book.progressStructure != null &&
        book.progressStructure != 'single' &&
        book.parentTotal != null &&
        book.parentTotal! > 0) {
      completedParentProg = book.parentTotal;
    }

    return book.copyWith(
      status: BookStatus.completed,
      isOngoing: false,
      dateStarted: (book.dateStarted != null && book.dateStarted!.isNotEmpty) ? book.dateStarted : today,
      dateFinished: today,
      progress: completedProgress,
      totalUnits: completedTotal,
      parentProgress: completedParentProg,
      updatedAt: nowIso,
      syncStatus: 'pending_update',
    );
  }

  // Other statuses (Plan to Read, On Hold, Dropped)
  final wasCompleted = book.status == BookStatus.completed;
  return book.copyWith(
    status: nextStatus,
    dateFinished: wasCompleted ? null : book.dateFinished,
    clearDateFinished: wasCompleted,
    updatedAt: nowIso,
    syncStatus: 'pending_update',
  );
}

/// Calculates reading pace (units per week) from historical log entries.
/// Matches PostgreSQL / Supabase `record_progress()` calculation 1:1.
double? calculateReadingPaceFromLogs(List<ReadingLogEntry> logs) {
  if (logs.length < 2) return null;

  // Sort chronologically ascending
  final sorted = List<ReadingLogEntry>.from(logs);
  sorted.sort((a, b) => a.loggedAt.compareTo(b.loggedAt));

  final oldest = sorted.first;
  final newest = sorted.last;

  try {
    final oldestTime = DateTime.parse(oldest.loggedAt);
    final newestTime = DateTime.parse(newest.loggedAt);

    if (oldestTime.isAtSameMomentAs(newestTime)) return null;

    final deltaProgress = newest.toProgress - oldest.toProgress;
    if (deltaProgress <= 0) return null;

    final seconds = newestTime.difference(oldestTime).inSeconds.abs();
    final deltaDays = max(1.0, seconds / 86400.0);

    final pace = (deltaProgress / deltaDays) * 7.0;
    return (pace * 10).round() / 10.0; // Round to 1 decimal place
  } catch (_) {
    return null;
  }
}

/// Authoritative domain operation for applying a reading progress increment on the client.
/// Auto-updates status, dates, parent progress, and constructs a pending ReadingLogEntry.
ProgressionMutationResult applyProgressIncrement(
  Book book,
  double toProgress, {
  num? parentProgress,
  String? note,
  String? journeyId,
  DateTime? date,
  List<ReadingLogEntry> existingLogs = const [],
}) {
  final now = date ?? DateTime.now();
  final nowIso = now.toUtc().toIso8601String();

  final prevProgress = book.progress;
  var nextStatus = book.status;

  // Status transitions
  if (toProgress > 0 && book.status == BookStatus.planToRead) {
    nextStatus = BookStatus.reading;
  } else if (book.status == BookStatus.completed && toProgress < (book.totalUnits ?? toProgress)) {
    nextStatus = BookStatus.reading;
  }

  // Auto-completion check on fixed works
  final isFixedWork = book.isOngoing != true;
  if (isFixedWork && book.totalUnits != null && book.totalUnits! > 0 && toProgress >= book.totalUnits!) {
    nextStatus = BookStatus.completed;
  }

  // Base updated book
  var updated = book.copyWith(
    progress: toProgress,
    parentProgress: parentProgress ?? book.parentProgress,
    status: nextStatus,
    updatedAt: nowIso,
    syncStatus: 'pending_update',
  );

  // Normalize lifecycle dates
  updated = normalizeStatusTransition(updated, nextStatus, now);

  // Create reading log entry if progress advanced or note was written
  ReadingLogEntry? logEntry;
  if (toProgress > prevProgress || (note != null && note.trim().isNotEmpty)) {
    logEntry = ReadingLogEntry(
      id: generateUuidV4(),
      bookId: book.id,
      journeyId: journeyId,
      fromProgress: prevProgress,
      toProgress: toProgress,
      note: (note != null && note.trim().isNotEmpty) ? note.trim() : null,
      loggedAt: nowIso,
      syncStatus: 'pending_create',
    );
  }

  // Recalculate local pace
  if (logEntry != null) {
    final combinedLogs = [...existingLogs, logEntry];
    final calculatedPace = calculateReadingPaceFromLogs(combinedLogs);
    if (calculatedPace != null) {
      updated = updated.copyWith(readingPace: calculatedPace);
    }
  }

  return ProgressionMutationResult(
    updatedBook: updated,
    logEntry: logEntry,
  );
}

/// Generates a realistic, organic reading session log distribution for a completed backlogged read cycle.
///
/// Guardrails & Guarantees:
/// - Guarantees monotonically increasing reading progress ending exactly at [totalUnits].
/// - Introduces natural organic variance (+/- 25-35% daily noise) so reading is not robotic/flat.
/// - Sets realistic session timestamps in the evening hours (8:00 PM - 10:30 PM).
/// - Attaches strictly to [journeyId] without mutating global state.
List<ReadingLogEntry> simulateReadingHistoryLogs({
  required String bookId,
  required String journeyId,
  required double totalUnits,
  required DateTime startDate,
  required DateTime endDate,
}) {
  if (totalUnits <= 0) return [];

  // Normalize dates to start of day
  final start = DateTime(startDate.year, startDate.month, startDate.day);
  final end = DateTime(endDate.year, endDate.month, endDate.day);

  // If end is before start, or single day read
  final totalDays = max(1, end.difference(start).inDays + 1);

  if (totalDays == 1) {
    // Single session completion
    final sessionTime = DateTime.utc(start.year, start.month, start.day, 21, 30);
    return [
      ReadingLogEntry(
        id: generateUuidV4(),
        bookId: bookId,
        journeyId: journeyId,
        fromProgress: 0,
        toProgress: totalUnits,
        note: 'Completed book',
        loggedAt: sessionTime.toIso8601String(),
        syncStatus: 'pending_create',
      ),
    ];
  }

  // Multi-day read cycle: distribute progress with organic noise
  // Generate pseudo-random weights with deterministic seed from bookId + journeyId
  final seed = (bookId.hashCode ^ journeyId.hashCode ^ totalUnits.toInt()).abs();
  final rng = Random(seed);

  final weights = <double>[];
  double weightSum = 0;

  for (int i = 0; i < totalDays; i++) {
    // Base weight 1.0 with 0.65 to 1.35 organic variance
    final variance = 0.65 + (rng.nextDouble() * 0.70);
    weights.add(variance);
    weightSum += variance;
  }

  final logs = <ReadingLogEntry>[];
  double currentProgress = 0;

  for (int i = 0; i < totalDays; i++) {
    final dayDate = start.add(Duration(days: i));
    // Evening hours between 8:00 PM and 10:30 PM (20:00 - 22:30)
    final hour = 20 + rng.nextInt(2);
    final minute = rng.nextInt(60);
    final sessionTime = DateTime.utc(dayDate.year, dayDate.month, dayDate.day, hour, minute);

    double nextProgress;
    if (i == totalDays - 1) {
      // Last day completes exactly
      nextProgress = totalUnits;
    } else {
      final proportion = weights[i] / weightSum;
      final rawIncrement = proportion * totalUnits;
      // Round reasonably (e.g. integer or clean single decimal)
      final roundedIncrement = max(1.0, (rawIncrement).roundToDouble());
      nextProgress = min(totalUnits - (totalDays - 1 - i), currentProgress + roundedIncrement);
    }

    if (nextProgress > currentProgress) {
      logs.add(
        ReadingLogEntry(
          id: generateUuidV4(),
          bookId: bookId,
          journeyId: journeyId,
          fromProgress: currentProgress,
          toProgress: nextProgress,
          note: i == totalDays - 1 ? 'Completed book' : null,
          loggedAt: sessionTime.toIso8601String(),
          syncStatus: 'pending_create',
        ),
      );
      currentProgress = nextProgress;
    }
  }

  return logs;
}

