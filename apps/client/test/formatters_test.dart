import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/utils/formatters.dart';

void main() {
  group('Formatters Unit Tests', () {
    test('getUnitLabel returns chapters for Light Novel and Web Novel', () {
      expect(getUnitLabel('Light Novel'), 'chapters');
      expect(getUnitLabel('Web Novel'), 'chapters');
      expect(getUnitLabel('Serial'), 'chapters');
      expect(getUnitLabel('Non-Fiction'), 'chapters');
      expect(getUnitLabel('Novel'), 'pages');
      expect(getUnitLabel('Short Story'), 'pages');
    });

    test('formatProgressDisplay formats multi-tier volume/chapter', () {
      const ln = Book(
        id: '1',
        title: 'Overlord',
        type: 'Light Novel',
        progressStructure: 'volume_chapter',
        parentProgress: 14,
        parentTotal: 16,
        progress: 42,
        totalUnits: 50,
        createdAt: '',
        updatedAt: '',
      );

      expect(formatProgressDisplay(ln), 'Vol. 14/16 Ch. 42/50');
    });

    test('formatProgressDisplay formats ongoing caught up', () {
      const wn = Book(
        id: '2',
        title: 'Shadow Slave',
        type: 'Web Novel',
        isOngoing: true,
        progress: 1450,
        latestUnits: 1450,
        createdAt: '',
        updatedAt: '',
      );

      expect(formatProgressDisplay(wn), 'Caught Up (Ch. 1450)');
    });

    test('getQuickChipOptions returns appropriate increments', () {
      expect(getQuickChipOptions('Light Novel'), [1, 2, 5, 10, 20]);
      expect(getQuickChipOptions('Novel'), [5, 10, 15, 25, 50]);
    });

    test('formatRating handles unrated, stars, and decimal modes', () {
      expect(formatRating(null), 'Unrated');
      expect(formatRating(0), 'Unrated');
      expect(formatRating(4.8), '4.8 ★');
      expect(formatRating(4.8, isDecimalMode: true), '4.8 / 5.0');
    });
  });
}
