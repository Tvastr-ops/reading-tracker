import 'package:archive/archive.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/services/obsidian_exporter.dart';

void main() {
  group('ObsidianExporter Unit Tests', () {
    test('safeFilename cleans illegal characters across platforms', () {
      expect(ObsidianExporter.safeFilename('Dune: Part One / Special?'), 'Dune- Part One - Special-');
      expect(ObsidianExporter.safeFilename('Re:Zero <Volume 1>*'), 'Re-Zero -Volume 1--');
      expect(ObsidianExporter.safeFilename('Title with dots....'), 'Title with dots');
      expect(ObsidianExporter.safeFilename(''), 'Untitled');
    });

    test('buildBookMarkdown formats YAML properties and callouts', () {
      const book = Book(
        id: 'b1',
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
        seriesName: 'The Stormlight Archive',
        seriesOrder: 1,
        status: BookStatus.reading,
        type: 'Novel',
        unitType: 'pages',
        progress: 680,
        totalUnits: 1007,
        rating: 5,
        isFavorite: true,
        dateStarted: '2026-08-01',
        description: 'Epic fantasy novel set in Roshar.',
        notes: 'Exceptional worldbuilding and pacing.',
        coverUrl: 'https://example.com/cover.jpg',
        sourceLink: 'https://brandonsanderson.com\nhttps://goodreads.com/book/show/7235533',
        createdAt: '',
        updatedAt: '',
      );

      final logs = [
        const ReadingLogEntry(
          id: 'l1',
          bookId: 'b1',
          fromProgress: 630,
          toProgress: 680,
          loggedAt: '2026-08-20T14:30:00Z',
          note: 'Chasmfiend battle scene',
        ),
      ];

      final md = ObsidianExporter.buildBookMarkdown(book, logs);

      // Verify YAML Frontmatter
      expect(md, contains('---'));
      expect(md, contains('title: "The Way of Kings"'));
      expect(md, contains('author: "[[Authors/Brandon Sanderson|Brandon Sanderson]]"'));
      expect(md, contains('series: "[[Series/The Stormlight Archive|The Stormlight Archive]]"'));
      expect(md, contains('series_order: 1.0'));
      expect(md, contains('status: "Reading"'));
      expect(md, contains('rating: 5.0'));
      expect(md, contains('cover: "https://example.com/cover.jpg"'));
      expect(md, contains('  - favorite'));
      expect(md, contains('sources:'));

      // Verify Callouts
      expect(md, contains('> [!abstract] Synopsis'));
      expect(md, contains('> Epic fantasy novel set in Roshar.'));
      expect(md, contains('> [!quote] Personal Review & Notes'));
      expect(md, contains('> Exceptional worldbuilding and pacing.'));
      expect(md, contains('> [!timeline] Reading Log Timeline'));
      expect(md, contains('Chasmfiend battle scene'));
      expect(md, contains('Read 50 pages (Progress: 680)'));
    });

    test('generateVaultZip builds valid zip containing dashboards, books, and .obsidian settings', () {
      const book1 = Book(
        id: '1',
        title: 'Overlord, Vol. 1',
        author: 'Kugane Maruyama',
        seriesName: 'Overlord',
        seriesOrder: 1,
        status: BookStatus.completed,
        type: 'Light Novel',
        createdAt: '',
        updatedAt: '',
      );

      const book2 = Book(
        id: '2',
        title: 'Shadow Slave',
        author: 'Guiltythree',
        status: BookStatus.reading,
        type: 'Web Novel',
        createdAt: '',
        updatedAt: '',
      );

      final zipBytes = ObsidianExporter.generateVaultZip(
        books: [book1, book2],
        journeys: [],
        allLogs: [],
      );

      expect(zipBytes.isNotEmpty, isTrue);

      // Decode the generated zip and inspect archive contents
      final archive = ZipDecoder().decodeBytes(zipBytes);
      final filenames = archive.files.map((f) => f.name).toSet();

      expect(filenames, contains('00 📚 Bookshelf.md'));
      expect(filenames, contains('01 📊 Reading Stats.md'));
      expect(filenames, contains('02 🌌 Reading Universe.canvas'));
      expect(filenames, contains('Books/Overlord, Vol. 1.md'));
      expect(filenames, contains('Books/Shadow Slave.md'));
      expect(filenames, contains('Authors/Kugane Maruyama.md'));
      expect(filenames, contains('Authors/Guiltythree.md'));
      expect(filenames, contains('Series/Overlord.md'));
      expect(filenames, contains('.obsidian/app.json'));
      expect(filenames, contains('.obsidian/core-plugins.json'));
      expect(filenames, contains('.obsidian/snippets/reading-vault.css'));
    });
  });
}
