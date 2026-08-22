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

    test('getFormatShorthand returns max 3-letter acronyms', () {
      expect(getFormatShorthand('Novel'), 'NOV');
      expect(getFormatShorthand('Novella'), 'NVL');
      expect(getFormatShorthand('Novelette'), 'NVT');
      expect(getFormatShorthand('Light Novel'), 'LN');
      expect(getFormatShorthand('Web Novel'), 'WN');
      expect(getFormatShorthand('Short Story'), 'SS');
      expect(getFormatShorthand('Collection'), 'COL');
      expect(getFormatShorthand('Anthology'), 'ANT');
      expect(getFormatShorthand('Essay'), 'ESY');
      expect(getFormatShorthand('Fanfiction'), 'FF');
      expect(getFormatShorthand('Other'), 'OTH');
      expect(getFormatShorthand('Manga'), 'MNG');
      expect(getFormatShorthand('Manhwa'), 'MHW');
    });

    test('formatProgressDisplay compact mode formats with pg and ultra-compact units', () {
      const plannedNovel = Book(
        id: '1',
        title: 'Dune',
        type: 'Novel',
        status: BookStatus.planToRead,
        progress: 0,
        totalUnits: 600,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(plannedNovel, compact: true), '0/600 pg');

      const readingNovel = Book(
        id: '1b',
        title: 'Dune',
        type: 'Novel',
        status: BookStatus.reading,
        progress: 120,
        totalUnits: 600,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(readingNovel, compact: true), '120/600 pg');

      const plannedLN = Book(
        id: '2',
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
      expect(formatProgressDisplay(plannedLN, compact: true), '155 ch • 18 v');

      const readingLNContinuous = Book(
        id: '3',
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
      expect(formatProgressDisplay(readingLNContinuous, compact: true), 'V.14 • Ch. 42/50');

      const readingLNPerVol = Book(
        id: '4',
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
      expect(formatProgressDisplay(readingLNPerVol, compact: true), 'V.3/12 • Ch. 2');

      const volumeOnly = Book(
        id: '5',
        title: 'Complete Works',
        type: 'Anthology',
        unitType: 'volumes',
        status: BookStatus.reading,
        progress: 4,
        totalUnits: 17,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(volumeOnly, compact: false), 'Vol. 4 / 17');
      expect(formatProgressDisplay(volumeOnly, compact: true), 'V.4/17');

      const caughtUp = Book(
        id: '6',
        title: 'Shadow Slave',
        type: 'Web Novel',
        status: BookStatus.reading,
        isOngoing: true,
        progress: 1450,
        latestUnits: 1450,
        createdAt: '',
        updatedAt: '',
      );
      expect(formatProgressDisplay(caughtUp, compact: true), 'Ch. 1450 • Up');
    });
  });
}
