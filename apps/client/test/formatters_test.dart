import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/utils/formatters.dart';

void main() {
  group('Formatters Unit Tests', () {
    test('getUnitLabel returns chapters for Light Novel and Web Novel', () {
      expect(getUnitLabel('Light Novel'), 'chapters');
      expect(getUnitLabel('Web Novel'), 'chapters');
      expect(getUnitLabel('Fanfiction'), 'chapters');
      expect(getUnitLabel('Serial'), 'chapters');
      expect(getUnitLabel('Collection'), 'volumes');
      expect(getUnitLabel('Anthology'), 'volumes');
      expect(getUnitLabel('Novel'), 'pages');
      expect(getUnitLabel('Short Story'), 'pages');
    });

    test('toRoman converts integers correctly', () {
      expect(toRoman(1), 'I');
      expect(toRoman(2), 'II');
      expect(toRoman(3), 'III');
      expect(toRoman(4), 'IV');
      expect(toRoman(10), 'X');
    });

    test('formatProgressDisplay formats continuous multi-tier volume/chapter', () {
      const ln = Book(
        id: '1',
        title: 'Overlord',
        type: 'Light Novel',
        status: BookStatus.reading,
        progressStructure: 'volume_chapter',
        parentProgress: 14,
        parentTotal: 16,
        progress: 42,
        totalUnits: 50,
        createdAt: '',
        updatedAt: '',
      );

      // Single-denominator rule: Vol. 14 • Ch. 42 / 50
      expect(formatProgressDisplay(ln), 'Vol. 14 • Ch. 42 / 50');
    });

    test('formatProgressDisplay formats per-volume reset multi-tier volume/chapter', () {
      const ln = Book(
        id: '1',
        title: 'Overlord',
        type: 'Light Novel',
        status: BookStatus.reading,
        progressStructure: 'volume_chapter',
        parentProgress: 3,
        parentTotal: 12,
        progress: 2,
        totalUnits: null,
        createdAt: '',
        updatedAt: '',
      );

      expect(formatProgressDisplay(ln), 'Vol. 3 / 12 • Ch. 2');
    });

    test('formatProgressDisplay formats planned scope cleanly', () {
      const plannedNovel = Book(
        id: '2',
        title: 'The Count of Monte Cristo',
        type: 'Novel',
        status: BookStatus.planToRead,
        progress: 0,
        totalUnits: 1316,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(plannedNovel), '0 / 1316 pages');

      const plannedLN = Book(
        id: '3',
        title: 'Ascendance of a Bookworm',
        type: 'Light Novel',
        status: BookStatus.planToRead,
        progressStructure: 'volume_chapter',
        parentTotal: 18,
        progress: 0,
        totalUnits: 155,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(plannedLN), '155 chapters • 18 vols');
    });

    test('formatProgressDisplay formats ongoing caught up & behind', () {
      const caughtUp = Book(
        id: '4',
        title: 'Shadow Slave',
        type: 'Web Novel',
        status: BookStatus.reading,
        isOngoing: true,
        progress: 1450,
        latestUnits: 1450,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(caughtUp), 'Ch. 1450 • Caught Up');

      const behind = Book(
        id: '5',
        title: 'Shadow Slave',
        type: 'Web Novel',
        status: BookStatus.reading,
        isOngoing: true,
        progress: 1400,
        latestUnits: 1450,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(behind), 'Ch. 1400 (50 behind)');
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

    test('generateUuidV4 generates valid RFC4122 compliant UUIDs', () {
      final uuid1 = generateUuidV4();
      final uuid2 = generateUuidV4();
      expect(uuid1, isNotEmpty);
      expect(uuid2, isNotEmpty);
      expect(isValidUuid(uuid1), isTrue);
      expect(isValidUuid(uuid2), isTrue);
      expect(uuid1, isNot(equals(uuid2)));
    });
  });
}
