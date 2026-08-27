import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/reading_journey.dart';

void main() {
  group('ReadingJourney Model Tests', () {
    test('Round-trip serialization toMap and fromMap', () {
      const journey = ReadingJourney(
        id: 'journey-123',
        bookId: 'book-456',
        journeyIndex: 2,
        status: 'completed',
        dateStarted: '2026-01-01T10:00:00Z',
        dateFinished: '2026-01-15T10:00:00Z',
        rating: 4.5,
        review: 'Loved the climax!',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        syncStatus: 'synced',
      );

      final map = journey.toMap();
      expect(map['id'], 'journey-123');
      expect(map['book_id'], 'book-456');
      expect(map['journey_index'], 2);
      expect(map['status'], 'completed');
      expect(map['rating'], 4.5);
      expect(map['review'], 'Loved the climax!');

      final restored = ReadingJourney.fromMap(map);
      expect(restored.id, journey.id);
      expect(restored.bookId, journey.bookId);
      expect(restored.journeyIndex, journey.journeyIndex);
      expect(restored.status, journey.status);
      expect(restored.rating, journey.rating);
      expect(restored.review, journey.review);
      expect(restored.isCompleted, isTrue);
      expect(restored.isReread, isTrue);
    });

    test('toRemoteMap excludes syncStatus', () {
      const journey = ReadingJourney(
        id: 'journey-999',
        bookId: 'book-999',
        journeyIndex: 1,
        status: 'reading',
        dateStarted: '2026-08-01T10:00:00Z',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T10:00:00Z',
        syncStatus: 'pending_create',
      );

      final remoteMap = journey.toRemoteMap();
      expect(remoteMap.containsKey('sync_status'), isFalse);
      expect(remoteMap['id'], 'journey-999');
      expect(remoteMap['journey_index'], 1);
    });

    test('duration and formattedDuration calculations', () {
      const journey = ReadingJourney(
        id: 'j-1',
        bookId: 'b-1',
        dateStarted: '2026-08-01T00:00:00Z',
        dateFinished: '2026-08-15T00:00:00Z',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
      );

      expect(journey.duration?.inDays, 14);
      expect(journey.formattedDuration, '14 days');
    });
  });
}
