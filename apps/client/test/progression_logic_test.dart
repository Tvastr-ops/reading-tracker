import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/utils/progression_logic.dart';

void main() {
  group('Progression Logic Unit Tests', () {
    test('normalizeStatusTransition handles Reading lifecycle', () {
      const book = Book(
        id: '1',
        title: 'Test Book',
        status: BookStatus.planToRead,
        createdAt: '',
        updatedAt: '',
      );

      final reading = normalizeStatusTransition(book, BookStatus.reading, DateTime(2026, 8, 22));
      expect(reading.status, BookStatus.reading);
      expect(reading.dateStarted, '2026-08-22');
      expect(reading.syncStatus, 'pending_update');
    });

    test('normalizeStatusTransition handles Completed auto-fill', () {
      const book = Book(
        id: '2',
        title: 'Completed LN',
        type: 'Light Novel',
        status: BookStatus.reading,
        progressStructure: 'volume_chapter',
        parentProgress: 2,
        parentTotal: 10,
        progress: 50,
        totalUnits: 250,
        isOngoing: true,
        dateStarted: '2026-01-01',
        createdAt: '',
        updatedAt: '',
      );

      final completed = normalizeStatusTransition(book, BookStatus.completed, DateTime(2026, 8, 22));
      expect(completed.status, BookStatus.completed);
      expect(completed.dateFinished, '2026-08-22');
      expect(completed.dateStarted, '2026-01-01');
      expect(completed.isOngoing, false);
      expect(completed.progress, 250.0);
      expect(completed.parentProgress, 10);
    });

    test('normalizeStatusTransition handles Completed for ongoing with latestUnits', () {
      const ongoing = Book(
        id: '3',
        title: 'Ongoing Web Novel',
        type: 'Web Novel',
        status: BookStatus.reading,
        isOngoing: true,
        progress: 1400,
        latestUnits: 1450,
        createdAt: '',
        updatedAt: '',
      );

      final completed = normalizeStatusTransition(ongoing, BookStatus.completed, DateTime(2026, 8, 22));
      expect(completed.status, BookStatus.completed);
      expect(completed.isOngoing, false);
      expect(completed.progress, 1450.0);
      expect(completed.totalUnits, 1450.0);
    });

    test('calculateReadingPaceFromLogs computes units per week accurately', () {
      final logs = [
        const ReadingLogEntry(
          id: 'log1',
          bookId: '1',
          fromProgress: 0,
          toProgress: 100,
          loggedAt: '2026-08-01T12:00:00Z',
        ),
        const ReadingLogEntry(
          id: 'log2',
          bookId: '1',
          fromProgress: 100,
          toProgress: 240,
          loggedAt: '2026-08-08T12:00:00Z',
        ),
      ];

      // Delta: 240 - 100 = 140 units in 7 days -> pace = 140.0 units/week
      final pace = calculateReadingPaceFromLogs(logs);
      expect(pace, 140.0);
    });

    test('applyProgressIncrement updates book, status, and generates pending log', () {
      const initialBook = Book(
        id: '10',
        title: 'Solo Leveling',
        type: 'Web Novel',
        status: BookStatus.planToRead,
        progress: 0,
        totalUnits: 270,
        createdAt: '',
        updatedAt: '',
      );

      final result = applyProgressIncrement(
        initialBook,
        15,
        note: 'Starting read',
        date: DateTime(2026, 8, 22),
      );

      expect(result.updatedBook.progress, 15.0);
      expect(result.updatedBook.status, BookStatus.reading);
      expect(result.updatedBook.dateStarted, '2026-08-22');
      expect(result.logEntry, isNotNull);
      expect(result.logEntry!.fromProgress, 0.0);
      expect(result.logEntry!.toProgress, 15.0);
      expect(result.logEntry!.note, 'Starting read');
      expect(result.logEntry!.syncStatus, 'pending_create');
    });

    test('applyProgressIncrement auto-completes when totalUnits reached', () {
      const book = Book(
        id: '11',
        title: 'Short Story',
        type: 'Short Story',
        status: BookStatus.reading,
        progress: 20,
        totalUnits: 30,
        createdAt: '',
        updatedAt: '',
      );

      final result = applyProgressIncrement(
        book,
        30,
        date: DateTime(2026, 8, 22),
      );

      expect(result.updatedBook.status, BookStatus.completed);
      expect(result.updatedBook.dateFinished, '2026-08-22');
    });
  });
}
