import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/book.dart';

void main() {
  group('Book Model Tests', () {
    test('completionPercentage calculates correctly', () {
      const book = Book(
        id: '1',
        title: 'Test Book',
        progress: 150,
        totalUnits: 300,
        createdAt: '',
        updatedAt: '',
      );

      expect(book.completionPercentage, 50.0);
    });

    test('completionPercentage clamps at 100%', () {
      const book = Book(
        id: '1',
        title: 'Test Book',
        progress: 400,
        totalUnits: 300,
        createdAt: '',
        updatedAt: '',
      );

      expect(book.completionPercentage, 100.0);
    });

    test('toMap and fromMap serializes multi-tier and ongoing accurately', () {
      const book = Book(
        id: 'book-123',
        title: 'Overlord',
        author: 'Kugane Maruyama',
        type: 'Light Novel',
        status: BookStatus.reading,
        progressStructure: 'volume_chapter',
        parentProgress: 14,
        parentTotal: 16,
        latestUnits: 16,
        isOngoing: true,
        rating: 4.9,
        progress: 42,
        totalUnits: 50,
        genreTags: 'Isekai, Fantasy',
        coverUrl: 'https://example.com/overlord.jpg',
        createdAt: '2026-08-14T00:00:00Z',
        updatedAt: '2026-08-14T00:00:00Z',
        syncStatus: 'synced',
      );

      final map = book.toMap();
      final reconstructed = Book.fromMap(map);

      expect(reconstructed.id, book.id);
      expect(reconstructed.title, book.title);
      expect(reconstructed.author, book.author);
      expect(reconstructed.progressStructure, 'volume_chapter');
      expect(reconstructed.parentProgress, 14);
      expect(reconstructed.parentTotal, 16);
      expect(reconstructed.isOngoing, true);
      expect(reconstructed.rating, book.rating);
      expect(reconstructed.progress, book.progress);
      expect(reconstructed.totalUnits, book.totalUnits);
    });

    test('ReadingLogEntry toMap and fromMap serializes accurately', () {
      const log = ReadingLogEntry(
        id: 'log-456',
        bookId: 'book-123',
        fromProgress: 10.0,
        toProgress: 25.0,
        note: 'Finished arc 1',
        loggedAt: '2026-08-16T12:00:00Z',
        syncStatus: 'pending_create',
      );

      final map = log.toMap();
      final reconstructed = ReadingLogEntry.fromMap(map);

      expect(reconstructed.id, log.id);
      expect(reconstructed.bookId, log.bookId);
      expect(reconstructed.fromProgress, 10.0);
      expect(reconstructed.toProgress, 25.0);
      expect(reconstructed.note, 'Finished arc 1');
      expect(reconstructed.syncStatus, 'pending_create');
    });
  });
}
