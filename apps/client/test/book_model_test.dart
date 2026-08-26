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

      final remoteMap = log.toRemoteMap();
      expect(remoteMap.containsKey('sync_status'), isFalse);
      expect(remoteMap['id'], 'log-456');
    });

    test('toRemoteMap strips local-only SQLite sync_status', () {
      const book = Book(
        id: '100',
        title: 'Clean Remote Test',
        progress: 10,
        createdAt: '',
        updatedAt: '',
        syncStatus: 'pending_create',
        isFavorite: true,
      );

      final remote = book.toRemoteMap();
      expect(remote.containsKey('sync_status'), isFalse);
      expect(remote['id'], '100');
      expect(remote['is_favorite'], true);
    });

    test('copyWith unsetting sentinels work correctly', () {
      const original = Book(
        id: '101',
        title: 'Original',
        rating: 4.5,
        totalUnits: 500,
        latestUnits: 50,
        coverUrl: 'https://example.com/cover.jpg',
        notes: 'Some notes',
        dateStarted: '2026-01-01',
        dateFinished: '2026-02-01',
        deletedAt: '2026-03-01',
        createdAt: '',
        updatedAt: '',
      );

      final unSet = original.copyWith(
        clearRating: true,
        clearTotalUnits: true,
        clearLatestUnits: true,
        clearCoverUrl: true,
        clearNotes: true,
        clearDateStarted: true,
        clearDateFinished: true,
        clearDeletedAt: true,
      );

      expect(unSet.rating, isNull);
      expect(unSet.totalUnits, isNull);
      expect(unSet.latestUnits, isNull);
      expect(unSet.coverUrl, isNull);
      expect(unSet.notes, isNull);
      expect(unSet.dateStarted, isNull);
      expect(unSet.dateFinished, isNull);
      expect(unSet.deletedAt, isNull);
    });

    test('completionPercentage calculates against latestUnits for ongoing works', () {
      const ongoingBook = Book(
        id: '102',
        title: 'Ongoing Manga',
        progress: 50,
        isOngoing: true,
        latestUnits: 100,
        createdAt: '',
        updatedAt: '',
      );

      expect(ongoingBook.completionPercentage, 50.0);
    });

    test('series, shelves, and rereadCount serialize cleanly', () {
      const book = Book(
        id: '103',
        title: 'Dune Messiah',
        seriesName: 'Dune Saga',
        seriesOrder: 2.0,
        shelfNames: '["Sci-Fi Classics","Favorites"]',
        rereadCount: 1,
        createdAt: '',
        updatedAt: '',
      );

      final map = book.toMap();
      expect(map['series_name'], 'Dune Saga');
      expect(map['series_order'], 2.0);
      expect(map['shelf_names'], '["Sci-Fi Classics","Favorites"]');
      expect(map['reread_count'], 1);

      final remote = book.toRemoteMap();
      expect(remote['series_name'], 'Dune Saga');
      expect(remote['series_order'], 2.0);
      expect(remote['shelf_names'], '["Sci-Fi Classics","Favorites"]');
      expect(remote['reread_count'], 1);

      final reconstructed = Book.fromMap(map);
      expect(reconstructed.seriesName, 'Dune Saga');
      expect(reconstructed.seriesOrder, 2.0);
      expect(reconstructed.shelfNames, '["Sci-Fi Classics","Favorites"]');
      expect(reconstructed.rereadCount, 1);
    });

    test('shelvesList parses JSON and legacy comma-separated lists, and withShelves updates cleanly', () {
      const jsonBook = Book(
        id: '104',
        title: 'Book A',
        shelfNames: '["Sci-Fi","Summer Reads"]',
        createdAt: '',
        updatedAt: '',
      );
      expect(jsonBook.shelvesList, ['Sci-Fi', 'Summer Reads']);

      const legacyBook = Book(
        id: '105',
        title: 'Book B',
        shelfNames: 'Sci-Fi, Summer Reads, Classics',
        createdAt: '',
        updatedAt: '',
      );
      expect(legacyBook.shelvesList, ['Sci-Fi', 'Summer Reads', 'Classics']);

      final updated = jsonBook.withShelves(['Masterpieces', 'Top 10']);
      expect(updated.shelvesList, ['Masterpieces', 'Top 10']);
      expect(updated.shelfNames, '["Masterpieces","Top 10"]');
    });

    test('status exclusivity vs multi-membership shelves and cross-filtering', () {
      // 1. Status is mutually exclusive (exactly 1 value)
      const book1 = Book(
        id: '1',
        title: 'Hyperion',
        status: BookStatus.reading,
        shelfNames: '["Sci-Fi","Favorites","To Recommend"]',
        createdAt: '',
        updatedAt: '',
      );

      const book2 = Book(
        id: '2',
        title: 'Foundation',
        status: BookStatus.completed,
        shelfNames: '["Sci-Fi","Classics"]',
        createdAt: '',
        updatedAt: '',
      );

      const book3 = Book(
        id: '3',
        title: '1984',
        status: BookStatus.completed,
        shelfNames: '["Dystopia","Classics","Favorites"]',
        createdAt: '',
        updatedAt: '',
      );

      final books = [book1, book2, book3];

      // Verify book1 has 1 status and 3 shelves
      expect(book1.status, BookStatus.reading);
      expect(book1.shelvesList.length, 3);
      expect(book1.shelvesList, containsAll(['Sci-Fi', 'Favorites', 'To Recommend']));

      // Cross-Filter 1: Shelf "Sci-Fi" AND Status "Reading" -> Only book1 (Hyperion)
      final sciFiReading = books.where((b) =>
        b.shelvesList.contains('Sci-Fi') && b.status == BookStatus.reading
      ).toList();
      expect(sciFiReading.length, 1);
      expect(sciFiReading.first.title, 'Hyperion');

      // Cross-Filter 2: Shelf "Classics" AND Status "Completed" -> book2 (Foundation) and book3 (1984)
      final classicsCompleted = books.where((b) =>
        b.shelvesList.contains('Classics') && b.status == BookStatus.completed
      ).toList();
      expect(classicsCompleted.length, 2);
      expect(classicsCompleted.map((b) => b.title), containsAll(['Foundation', '1984']));

      // Cross-Filter 3: Shelf "Favorites" AND Status "Completed" -> Only book3 (1984)
      final favoritesCompleted = books.where((b) =>
        b.shelvesList.contains('Favorites') && b.status == BookStatus.completed
      ).toList();
      expect(favoritesCompleted.length, 1);
      expect(favoritesCompleted.first.title, '1984');
    });

    test('search prefix parsing for tag:, #, series:, and shelf:', () {
      const bookA = Book(
        id: '1',
        title: 'The Way of Kings',
        genreTags: 'Epic Fantasy, High Fantasy, Adventure',
        seriesName: 'The Stormlight Archive',
        shelfNames: '["Favorites","Cosmere"]',
        createdAt: '',
        updatedAt: '',
      );

      const bookB = Book(
        id: '2',
        title: 'Neuromancer',
        genreTags: 'Cyberpunk, Sci-Fi',
        seriesName: 'Sprawl Trilogy',
        shelfNames: '["Sci-Fi Classics"]',
        createdAt: '',
        updatedAt: '',
      );

      final list = [bookA, bookB];

      // Helper simulating the search parser in client & web
      List<Book> search(String query) {
        final q = query.trim().toLowerCase();
        if (q.startsWith('#') || q.startsWith('tag:')) {
          final tq = (q.startsWith('#') ? q.substring(1) : q.substring(4)).trim();
          return list.where((b) => !tq.isNotEmpty || (b.genreTags != null && b.genreTags!.toLowerCase().contains(tq))).toList();
        } else if (q.startsWith('series:')) {
          final sq = q.substring(7).trim();
          return list.where((b) => !sq.isNotEmpty || (b.seriesName != null && b.seriesName!.toLowerCase().contains(sq))).toList();
        } else if (q.startsWith('shelf:')) {
          final shq = q.substring(6).trim();
          return list.where((b) => !shq.isNotEmpty || b.shelvesList.any((s) => s.toLowerCase().contains(shq))).toList();
        }
        return list;
      }

      // tag:fantasy -> matches bookA
      final tagRes = search('tag:fantasy');
      expect(tagRes.length, 1);
      expect(tagRes.first.title, 'The Way of Kings');

      // #fantasy -> matches bookA
      final hashRes = search('#fantasy');
      expect(hashRes.length, 1);
      expect(hashRes.first.title, 'The Way of Kings');

      // tag:cyberpunk -> matches bookB
      final cyberRes = search('tag:cyberpunk');
      expect(cyberRes.length, 1);
      expect(cyberRes.first.title, 'Neuromancer');

      // series:stormlight -> matches bookA
      final seriesRes = search('series:stormlight');
      expect(seriesRes.length, 1);
      expect(seriesRes.first.title, 'The Way of Kings');

      // shelf:cosmere -> matches bookA
      final shelfRes = search('shelf:cosmere');
      expect(shelfRes.length, 1);
      expect(shelfRes.first.title, 'The Way of Kings');
    });

    test('tagsList parses JSON and comma-separated tags accurately', () {
      const book1 = Book(
        id: '10',
        title: 'Fantasy Tale',
        genreTags: '["High Fantasy","Adventure","Magic"]',
        createdAt: '',
        updatedAt: '',
      );
      expect(book1.tagsList, ['High Fantasy', 'Adventure', 'Magic']);

      const book2 = Book(
        id: '11',
        title: 'SciFi Tale',
        genreTags: 'Cyberpunk, Space Opera, Hard Sci-Fi',
        createdAt: '',
        updatedAt: '',
      );
      expect(book2.tagsList, ['Cyberpunk', 'Space Opera', 'Hard Sci-Fi']);
    });

    test('multi-tag and keyword combo search queries', () {
      const book1 = Book(
        id: '1',
        title: 'Mistborn: The Final Empire',
        author: 'Brandon Sanderson',
        genreTags: 'Fantasy, High Fantasy, Heist',
        seriesName: 'Mistborn',
        shelfNames: '["Favorites","Cosmere"]',
        createdAt: '',
        updatedAt: '',
      );

      const book2 = Book(
        id: '2',
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
        genreTags: 'Epic Fantasy, High Fantasy, Military',
        seriesName: 'The Stormlight Archive',
        shelfNames: '["Favorites","Cosmere"]',
        createdAt: '',
        updatedAt: '',
      );

      const book3 = Book(
        id: '3',
        title: 'Neuromancer',
        author: 'William Gibson',
        genreTags: 'Sci-Fi, Cyberpunk, Heist',
        seriesName: 'Sprawl',
        shelfNames: '["Sci-Fi Classics"]',
        createdAt: '',
        updatedAt: '',
      );

      final books = [book1, book2, book3];

      List<Book> search(String query) {
        final rawQuery = query.trim();
        if (rawQuery.isEmpty) return books;
        final tokens = rawQuery.split(RegExp(r'[\s,]+')).where((t) => t.isNotEmpty).toList();
        final requiredTags = <String>[];
        final requiredShelves = <String>[];
        final textKeywords = <String>[];

        for (final token in tokens) {
          final low = token.toLowerCase();
          if (low.startsWith('#') && low.length > 1) {
            requiredTags.add(low.substring(1));
          } else if (low.startsWith('tag:') && low.length > 4) {
            requiredTags.add(low.substring(4));
          } else if (low.startsWith('shelf:') && low.length > 6) {
            requiredShelves.add(low.substring(6));
          } else {
            textKeywords.add(low);
          }
        }

        return books.where((b) {
          for (final tag in requiredTags) {
            final hasTag = b.tagsList.any((t) => t.toLowerCase().contains(tag)) ||
                (b.genreTags != null && b.genreTags!.toLowerCase().contains(tag));
            if (!hasTag) return false;
          }
          for (final shelf in requiredShelves) {
            final hasShelf = b.shelvesList.any((s) => s.toLowerCase().contains(shelf));
            if (!hasShelf) return false;
          }
          for (final kw in textKeywords) {
            final matchesKw = b.title.toLowerCase().contains(kw) ||
                (b.author != null && b.author!.toLowerCase().contains(kw)) ||
                (b.seriesName != null && b.seriesName!.toLowerCase().contains(kw)) ||
                (b.genreTags != null && b.genreTags!.toLowerCase().contains(kw)) ||
                b.shelvesList.any((s) => s.toLowerCase().contains(kw)) ||
                b.type.toLowerCase().contains(kw);
            if (!matchesKw) return false;
          }
          return true;
        }).toList();
      }

      // Combo 1: Two hashtags #fantasy #heist -> only Mistborn
      final res1 = search('#fantasy #heist');
      expect(res1.length, 1);
      expect(res1.first.title, 'Mistborn: The Final Empire');

      // Combo 2: Two hashtags #heist #cyberpunk -> only Neuromancer
      final res2 = search('#heist #cyberpunk');
      expect(res2.length, 1);
      expect(res2.first.title, 'Neuromancer');

      // Combo 3: Keyword + hashtag "Sanderson #military" -> only The Way of Kings
      final res3 = search('Sanderson #military');
      expect(res3.length, 1);
      expect(res3.first.title, 'The Way of Kings');

      // Combo 4: Shelf + tag "shelf:cosmere #heist" -> only Mistborn
      final res4 = search('shelf:cosmere #heist');
      expect(res4.length, 1);
      expect(res4.first.title, 'Mistborn: The Final Empire');
    });

    test('Boolean OR and NOT search operators', () {
      const book1 = Book(
        id: '1',
        title: 'Mistborn: The Final Empire',
        author: 'Brandon Sanderson',
        genreTags: 'Fantasy, High Fantasy, Heist',
        seriesName: 'Mistborn',
        shelfNames: '["Favorites","Cosmere"]',
        createdAt: '',
        updatedAt: '',
      );

      const book2 = Book(
        id: '2',
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
        genreTags: 'Epic Fantasy, High Fantasy, Military',
        seriesName: 'The Stormlight Archive',
        shelfNames: '["Favorites","Cosmere"]',
        createdAt: '',
        updatedAt: '',
      );

      const book3 = Book(
        id: '3',
        title: 'Neuromancer',
        author: 'William Gibson',
        genreTags: 'Sci-Fi, Cyberpunk, Heist',
        seriesName: 'Sprawl',
        shelfNames: '["Sci-Fi Classics"]',
        createdAt: '',
        updatedAt: '',
      );

      final books = [book1, book2, book3];

      List<Book> search(String query) {
        final rawQuery = query.trim();
        if (rawQuery.isEmpty) return books;
        final orClauses = rawQuery.split(RegExp(r'\s+(?:OR|or|\|)\s+|\s*\|\s*')).where((c) => c.trim().isNotEmpty).toList();

        return books.where((b) {
          return orClauses.any((clause) {
            final tokens = clause.trim().split(RegExp(r'[\s,]+')).where((t) => t.isNotEmpty).toList();
            final requiredTags = <String>[];
            final excludedTags = <String>[];
            final textKeywords = <String>[];
            final excludedKeywords = <String>[];

            for (final token in tokens) {
              final low = token.toLowerCase();
              final isNegated = low.startsWith('-') || low.startsWith('!');
              final cleanToken = isNegated ? low.substring(1) : low;

              if (cleanToken.isEmpty) continue;

              if (cleanToken.startsWith('#') && cleanToken.length > 1) {
                final tag = cleanToken.substring(1);
                if (isNegated) {
                  excludedTags.add(tag);
                } else {
                  requiredTags.add(tag);
                }
              } else if (cleanToken.startsWith('tag:') && cleanToken.length > 4) {
                final tag = cleanToken.substring(4);
                if (isNegated) {
                  excludedTags.add(tag);
                } else {
                  requiredTags.add(tag);
                }
              } else {
                if (isNegated) {
                  excludedKeywords.add(cleanToken);
                } else {
                  textKeywords.add(cleanToken);
                }
              }
            }

            for (final exTag in excludedTags) {
              final hasTag = b.tagsList.any((t) => t.toLowerCase().contains(exTag)) ||
                  (b.genreTags != null && b.genreTags!.toLowerCase().contains(exTag));
              if (hasTag) return false;
            }

            for (final exKw in excludedKeywords) {
              final matchesEx = b.title.toLowerCase().contains(exKw) ||
                  (b.author != null && b.author!.toLowerCase().contains(exKw)) ||
                  (b.genreTags != null && b.genreTags!.toLowerCase().contains(exKw));
              if (matchesEx) return false;
            }

            for (final tag in requiredTags) {
              final hasTag = b.tagsList.any((t) => t.toLowerCase().contains(tag)) ||
                  (b.genreTags != null && b.genreTags!.toLowerCase().contains(tag));
              if (!hasTag) return false;
            }

            for (final kw in textKeywords) {
              final matchesKw = b.title.toLowerCase().contains(kw) ||
                  (b.author != null && b.author!.toLowerCase().contains(kw)) ||
                  (b.genreTags != null && b.genreTags!.toLowerCase().contains(kw));
              if (!matchesKw) return false;
            }

            return true;
          });
        }).toList();
      }

      // OR: #cyberpunk OR #military -> Neuromancer & The Way of Kings
      final orRes = search('#cyberpunk OR #military');
      expect(orRes.length, 2);
      expect(orRes.map((b) => b.title), containsAll(['Neuromancer', 'The Way of Kings']));

      // Pipe OR: #cyberpunk | #military -> Neuromancer & The Way of Kings
      final pipeRes = search('#cyberpunk | #military');
      expect(pipeRes.length, 2);

      // NOT tag: #fantasy -#heist -> only The Way of Kings (excludes Mistborn)
      final notTagRes = search('#fantasy -#heist');
      expect(notTagRes.length, 1);
      expect(notTagRes.first.title, 'The Way of Kings');

      // NOT keyword: Sanderson -Mistborn -> only The Way of Kings
      final notKwRes = search('Sanderson -Mistborn');
      expect(notKwRes.length, 1);
      expect(notKwRes.first.title, 'The Way of Kings');
    });
  });
}
