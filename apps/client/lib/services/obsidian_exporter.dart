import 'dart:convert';
import 'package:archive/archive.dart';
import '../models/book.dart';
import '../models/reading_journey.dart';
import '../utils/formatters.dart';

class ObsidianExporter {
  /// Sanitizes string to be a safe filename across Windows, macOS, Linux, Android, and iOS.
  static String safeFilename(String name) {
    var clean = name
        .replaceAll(RegExp(r'[\\/:*?"<>|]'), '-')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    while (clean.endsWith('.')) {
      clean = clean.substring(0, clean.length - 1).trim();
    }
    return clean.isEmpty ? 'Untitled' : clean;
  }

  /// Safely escapes a string for YAML frontmatter.
  static String escapeYaml(String? value) {
    if (value == null || value.isEmpty) return '""';
    final sanitized = value.replaceAll('"', r'\"');
    return '"$sanitized"';
  }

  /// Builds an individual Book Markdown note with YAML frontmatter, cover hero, and callouts.
  static String buildBookMarkdown(Book book, List<ReadingLogEntry> logs) {
    final buffer = StringBuffer();

    // 1. YAML Frontmatter (Obsidian Properties)
    buffer.writeln('---');
    buffer.writeln('title: ${escapeYaml(book.title)}');
    if (book.author != null && book.author!.trim().isNotEmpty) {
      final safeAuth = safeFilename(book.author!.trim());
      buffer.writeln('author: "[[Authors/$safeAuth|$safeAuth]]"');
    } else {
      buffer.writeln('author: null');
    }

    if (book.seriesName != null && book.seriesName!.trim().isNotEmpty) {
      final safeSer = safeFilename(book.seriesName!.trim());
      buffer.writeln('series: "[[Series/$safeSer|$safeSer]]"');
      if (book.seriesOrder != null) {
        buffer.writeln('series_order: ${book.seriesOrder}');
      }
    }

    buffer.writeln('status: ${escapeYaml(book.status)}');
    buffer.writeln('rating: ${book.rating != null && book.rating! > 0 ? book.rating : "null"}');
    buffer.writeln('progress: ${book.progress}');
    buffer.writeln('total: ${book.totalUnits ?? "null"}');
    buffer.writeln('unit: ${escapeYaml(getUnitLabel(book.type, book.unitType))}');
    buffer.writeln('type: ${escapeYaml(book.type)}');
    buffer.writeln('is_ongoing: ${book.isOngoing ?? false}');
    buffer.writeln('is_favorite: ${book.isFavorite ?? false}');
    buffer.writeln('started: ${escapeYaml(book.dateStarted)}');
    buffer.writeln('finished: ${escapeYaml(book.dateFinished)}');

    if (book.coverUrl != null && book.coverUrl!.trim().isNotEmpty) {
      buffer.writeln('cover: ${escapeYaml(book.coverUrl!.trim())}');
    }

    // Frontmatter Tags
    buffer.writeln('tags:');
    buffer.writeln('  - reading');
    buffer.writeln('  - format/${safeFilename(book.type.toLowerCase()).replaceAll(' ', '-')}');
    buffer.writeln('  - status/${safeFilename(book.status.toLowerCase()).replaceAll(' ', '-')}');
    if (book.isFavorite == true) {
      buffer.writeln('  - favorite');
    }
    for (final tag in book.tagsList) {
      final cleanTag = safeFilename(tag.toLowerCase()).replaceAll(' ', '-');
      if (cleanTag.isNotEmpty) {
        buffer.writeln('  - genre/$cleanTag');
      }
    }

    // Sources list
    if (book.sourceLink != null && book.sourceLink!.trim().isNotEmpty) {
      final links = book.sourceLink!
          .split(RegExp(r'[\n,;]+'))
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty);
      if (links.isNotEmpty) {
        buffer.writeln('sources:');
        for (final l in links) {
          buffer.writeln('  - ${escapeYaml(l)}');
        }
      }
    }

    buffer.writeln('---');
    buffer.writeln();

    // 2. Note Header & Cover Embed
    buffer.writeln('# ${book.title}');
    if (book.author != null && book.author!.trim().isNotEmpty) {
      final safeAuth = safeFilename(book.author!.trim());
      buffer.writeln('*By [[Authors/$safeAuth|${book.author!.trim()}]]*');
    }
    buffer.writeln();

    if (book.coverUrl != null && book.coverUrl!.trim().isNotEmpty) {
      buffer.writeln('![Book Cover|200](${book.coverUrl!.trim()})');
      buffer.writeln();
    }

    // 3. Quick Stats Metadata Table
    final displayProgress = formatProgressDisplay(book);
    final ratingStr = book.rating != null && book.rating! > 0 ? '${book.rating} ★' : 'Unrated';
    buffer.writeln('| Status | Progress | Rating | Format |');
    buffer.writeln('| :--- | :--- | :--- | :--- |');
    buffer.writeln('| **${book.status}** | `$displayProgress` | `$ratingStr` | ${book.type} |');
    buffer.writeln();

    // 4. Callout: Synopsis
    if (book.description != null && book.description!.trim().isNotEmpty) {
      buffer.writeln('> [!abstract] Synopsis');
      for (final line in book.description!.trim().split('\n')) {
        buffer.writeln('> $line');
      }
      buffer.writeln();
    }

    // 5. Callout: Personal Review & Notes
    if (book.notes != null && book.notes!.trim().isNotEmpty) {
      buffer.writeln('> [!quote] Personal Review & Notes');
      for (final line in book.notes!.trim().split('\n')) {
        buffer.writeln('> $line');
      }
      buffer.writeln();
    }

    // 6. Callout: Reading Log Timeline
    if (logs.isNotEmpty) {
      buffer.writeln('> [!timeline] Reading Log Timeline');
      final sortedLogs = List<ReadingLogEntry>.from(logs)
        ..sort((a, b) => b.loggedAt.compareTo(a.loggedAt));
      final unit = getUnitLabel(book.type, book.unitType);

      for (final log in sortedLogs) {
        final date = log.loggedAt.length >= 10 ? log.loggedAt.substring(0, 10) : log.loggedAt;
        final inc = log.fromProgress != null ? (log.toProgress - log.fromProgress!) : log.toProgress;
        final notesPart = log.note != null && log.note!.trim().isNotEmpty ? ' — *"${log.note!.trim()}"*' : '';
        buffer.writeln('> - **$date**: Read ${formatNum(inc)} $unit (Progress: ${formatNum(log.toProgress)})$notesPart');
      }
      buffer.writeln();
    }

    // 7. External Links Section
    if (book.sourceLink != null && book.sourceLink!.trim().isNotEmpty) {
      final links = book.sourceLink!
          .split(RegExp(r'[\n,;]+'))
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty);
      if (links.isNotEmpty) {
        buffer.writeln('### External Resources');
        for (final l in links) {
          buffer.writeln('- <$l>');
        }
        buffer.writeln();
      }
    }

    return buffer.toString();
  }

  /// Builds an Author Hub note linking all works by that author.
  static String buildAuthorMarkdown(String author, List<Book> authorBooks) {
    final buffer = StringBuffer();

    buffer.writeln('---');
    buffer.writeln('title: ${escapeYaml(author)}');
    buffer.writeln('type: author');
    buffer.writeln('books_count: ${authorBooks.length}');
    buffer.writeln('tags:');
    buffer.writeln('  - author');
    buffer.writeln('---');
    buffer.writeln();

    buffer.writeln('# $author');
    buffer.writeln('Total cataloged works: **${authorBooks.length}**');
    buffer.writeln();

    buffer.writeln('### Works in Library');
    buffer.writeln('| Title | Status | Rating | Progress | Format |');
    buffer.writeln('| :--- | :--- | :--- | :--- | :--- |');

    for (final b in authorBooks) {
      final safeBook = safeFilename(b.title);
      final rate = b.rating != null && b.rating! > 0 ? '${b.rating} ★' : '—';
      buffer.writeln(
        '| [[Books/$safeBook|${b.title}]] | ${b.status} | $rate | ${formatProgressDisplay(b)} | ${b.type} |',
      );
    }
    buffer.writeln();

    return buffer.toString();
  }

  /// Builds a Series Hub note with volume order checklist.
  static String buildSeriesMarkdown(String seriesName, List<Book> seriesBooks) {
    final buffer = StringBuffer();

    final sorted = List<Book>.from(seriesBooks)
      ..sort((a, b) => (a.seriesOrder ?? 9999).compareTo(b.seriesOrder ?? 9999));

    buffer.writeln('---');
    buffer.writeln('title: ${escapeYaml(seriesName)}');
    buffer.writeln('type: series');
    buffer.writeln('books_count: ${seriesBooks.length}');
    buffer.writeln('tags:');
    buffer.writeln('  - series');
    buffer.writeln('---');
    buffer.writeln();

    buffer.writeln('# $seriesName');
    buffer.writeln('Total tracked volumes: **${seriesBooks.length}**');
    buffer.writeln();

    buffer.writeln('### Reading Checklist');
    for (final b in sorted) {
      final safeBook = safeFilename(b.title);
      final isDone = b.status == BookStatus.completed;
      final orderStr = b.seriesOrder != null ? '#${formatNum(b.seriesOrder!)} · ' : '';
      buffer.writeln('- [${isDone ? "x" : " "}] $orderStr[[Books/$safeBook|${b.title}]] *(${b.status})*');
    }
    buffer.writeln();

    return buffer.toString();
  }

  /// Builds the 00 📚 Bookshelf.md dashboard.
  static String buildBookshelfDashboard(List<Book> books) {
    final buffer = StringBuffer();

    buffer.writeln('---');
    buffer.writeln('title: Bookshelf');
    buffer.writeln('tags:');
    buffer.writeln('  - dashboard');
    buffer.writeln('---');
    buffer.writeln();

    buffer.writeln('# 📚 Library Bookshelf');
    buffer.writeln();
    buffer.writeln('> [!tip] Dataview Compatible');
    buffer.writeln('> If you have the Obsidian Dataview plugin enabled, you can run queries below. Standard Markdown tables are also pre-rendered below.');
    buffer.writeln();

    final reading = books.where((b) => b.status == BookStatus.reading).toList();
    final plan = books.where((b) => b.status == BookStatus.planToRead).toList();
    final completed = books.where((b) => b.status == BookStatus.completed).toList();
    final onHoldOrDropped = books.where((b) => b.status == BookStatus.onHold || b.status == BookStatus.dropped).toList();

    _writeBookshelfSection(buffer, '📖 Currently Reading', reading);
    _writeBookshelfSection(buffer, '🎯 Up Next (Plan to Read)', plan);
    _writeBookshelfSection(buffer, '🏆 Completed', completed);
    if (onHoldOrDropped.isNotEmpty) {
      _writeBookshelfSection(buffer, '⏸️ On Hold & Dropped', onHoldOrDropped);
    }

    return buffer.toString();
  }

  static void _writeBookshelfSection(StringBuffer buffer, String heading, List<Book> list) {
    buffer.writeln('## $heading (${list.length})');
    if (list.isEmpty) {
      buffer.writeln('*No books in this section.*');
      buffer.writeln();
      return;
    }

    buffer.writeln('| Cover | Title | Author | Progress | Rating | Format |');
    buffer.writeln('| :---: | :--- | :--- | :--- | :---: | :--- |');

    for (final b in list) {
      final safeBook = safeFilename(b.title);
      final coverCell = b.coverUrl != null && b.coverUrl!.trim().isNotEmpty
          ? '<img src="${b.coverUrl!.trim()}" width="42" style="border-radius:4px" />'
          : '📖';
      final authorCell = b.author != null && b.author!.trim().isNotEmpty
          ? '[[Authors/${safeFilename(b.author!.trim())}|${b.author!.trim()}]]'
          : '—';
      final rate = b.rating != null && b.rating! > 0 ? '${b.rating} ★' : '—';
      buffer.writeln(
        '| $coverCell | [[Books/$safeBook|${b.title}]] | $authorCell | `${formatProgressDisplay(b)}` | $rate | ${b.type} |',
      );
    }
    buffer.writeln();
  }

  /// Builds the 01 📊 Reading Stats.md dashboard.
  static String buildStatsDashboard(List<Book> books, List<ReadingLogEntry> allLogs) {
    final buffer = StringBuffer();

    final total = books.length;
    final completed = books.where((b) => b.status == BookStatus.completed).length;
    final reading = books.where((b) => b.status == BookStatus.reading).length;
    final plan = books.where((b) => b.status == BookStatus.planToRead).length;

    // Type distribution
    final typeCounts = <String, int>{};
    for (final b in books) {
      typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
    }

    buffer.writeln('---');
    buffer.writeln('title: Reading Stats & Analytics');
    buffer.writeln('tags:');
    buffer.writeln('  - dashboard');
    buffer.writeln('---');
    buffer.writeln();

    buffer.writeln('# 📊 Reading Analytics & Insights');
    buffer.writeln();

    buffer.writeln('### 📈 High-Level Metrics');
    buffer.writeln('- **Total Tracked Works**: $total');
    buffer.writeln('- **Currently Reading**: $reading');
    buffer.writeln('- **Completed Titles**: $completed');
    buffer.writeln('- **Plan to Read Queue**: $plan');
    buffer.writeln('- **Logged Reading Sessions**: ${allLogs.length}');
    buffer.writeln();

    buffer.writeln('### 📚 Catalog by Format');
    buffer.writeln('| Format | Count | Share |');
    buffer.writeln('| :--- | :---: | :---: |');
    for (final entry in typeCounts.entries) {
      final pct = total > 0 ? ((entry.value / total) * 100).toStringAsFixed(1) : '0';
      buffer.writeln('| **${entry.key}** | ${entry.value} | $pct% |');
    }
    buffer.writeln();

    return buffer.toString();
  }

  /// Builds the 02 🌌 Reading Universe.canvas visual node graph.
  static String buildCanvasJson(List<Book> books) {
    final nodes = <Map<String, dynamic>>[];
    final edges = <Map<String, dynamic>>[];

    // 1. Root Category Nodes
    final statusGroups = [
      {'id': 'status_reading', 'text': '📖 Currently Reading', 'color': '4', 'x': 0, 'y': -250},
      {'id': 'status_completed', 'text': '🏆 Completed', 'color': '2', 'x': 500, 'y': -250},
      {'id': 'status_plan', 'text': '🎯 Plan to Read', 'color': '3', 'x': -500, 'y': -250},
    ];

    for (final sg in statusGroups) {
      nodes.add({
        'id': sg['id'],
        'type': 'text',
        'text': '# ${sg['text']}',
        'x': sg['x'],
        'y': sg['y'],
        'width': 280,
        'height': 90,
        'color': sg['color'],
      });
    }

    // 2. Add top books (up to 12 per status) as linked file nodes
    for (final status in [BookStatus.reading, BookStatus.completed, BookStatus.planToRead]) {
      final groupKey = status == BookStatus.reading
          ? 'status_reading'
          : (status == BookStatus.completed ? 'status_completed' : 'status_plan');
      final groupX = status == BookStatus.reading ? 0 : (status == BookStatus.completed ? 500 : -500);

      final matching = books.where((b) => b.status == status).take(10).toList();
      var yOffset = -120;

      for (var i = 0; i < matching.length; i++) {
        final b = matching[i];
        final safeBook = safeFilename(b.title);
        final nodeId = 'book_${b.id}';

        nodes.add({
          'id': nodeId,
          'type': 'file',
          'file': 'Books/$safeBook.md',
          'x': groupX + (i % 2 == 0 ? -120 : 120),
          'y': yOffset,
          'width': 220,
          'height': 160,
        });

        edges.add({
          'id': 'edge_${groupKey}_$nodeId',
          'fromNode': groupKey,
          'fromSide': 'bottom',
          'toNode': nodeId,
          'toSide': 'top',
        });

        yOffset += 190;
      }
    }

    final canvasMap = {
      'nodes': nodes,
      'edges': edges,
    };

    return const JsonEncoder.withIndent('  ').convert(canvasMap);
  }

  /// Default .obsidian/app.json settings.
  static String getAppJson() {
    return jsonEncode({
      'legacyEditor': false,
      'livePreview': true,
      'readableLineLength': true,
      'showLineNumber': false,
      'autoPairMarkdown': true,
      'strictLineBreaks': false,
      'spellcheck': false,
    });
  }

  /// Default .obsidian/core-plugins.json list.
  static String getCorePluginsJson() {
    return jsonEncode([
      'file-explorer',
      'global-search',
      'switcher',
      'graph',
      'backlink',
      'canvas',
      'page-preview',
      'outline',
      'word-count',
      'properties',
    ]);
  }

  /// Bundled CSS styling for reading vault (.obsidian/snippets/reading-vault.css).
  static String getReadingVaultCss() {
    return '''
/* Reading Tracker Obsidian Vault Aesthetic */
.metadata-properties-heading {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
}

/* Callout Styling */
.callout[data-callout="timeline"] {
  --callout-color: 99, 102, 241;
  --callout-icon: lucide-history;
  border-left-width: 4px;
}

.callout[data-callout="abstract"] {
  --callout-color: 16, 185, 129;
}

.callout[data-callout="quote"] {
  --callout-color: 245, 158, 11;
}

/* Table Card Formatting */
table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.04em;
}
''';
  }

  /// Generates the complete, standalone Obsidian Vault as a compressed Zip archive.
  static List<int> generateVaultZip({
    required List<Book> books,
    required List<ReadingJourney> journeys,
    required List<ReadingLogEntry> allLogs,
  }) {
    final archive = Archive();

    // 1. Dashboards
    final bookshelfMd = buildBookshelfDashboard(books);
    archive.addFile(ArchiveFile('00 📚 Bookshelf.md', bookshelfMd.length, utf8.encode(bookshelfMd)));

    final statsMd = buildStatsDashboard(books, allLogs);
    archive.addFile(ArchiveFile('01 📊 Reading Stats.md', statsMd.length, utf8.encode(statsMd)));

    final canvasJson = buildCanvasJson(books);
    archive.addFile(ArchiveFile('02 🌌 Reading Universe.canvas', canvasJson.length, utf8.encode(canvasJson)));

    // 2. Individual Book Notes
    final logsByBookId = <String, List<ReadingLogEntry>>{};
    for (final log in allLogs) {
      logsByBookId.putIfAbsent(log.bookId, () => []).add(log);
    }

    final usedBookFilenames = <String, int>{};
    for (final book in books) {
      var baseName = safeFilename(book.title);
      if (usedBookFilenames.containsKey(baseName)) {
        final count = usedBookFilenames[baseName]! + 1;
        usedBookFilenames[baseName] = count;
        baseName = '$baseName ($count)';
      } else {
        usedBookFilenames[baseName] = 1;
      }

      final bookLogs = logsByBookId[book.id] ?? [];
      final bookMd = buildBookMarkdown(book, bookLogs);
      archive.addFile(ArchiveFile('Books/$baseName.md', bookMd.length, utf8.encode(bookMd)));
    }

    // 3. Author Hubs
    final booksByAuthor = <String, List<Book>>{};
    for (final b in books) {
      final auth = b.author?.trim();
      if (auth != null && auth.isNotEmpty) {
        booksByAuthor.putIfAbsent(auth, () => []).add(b);
      }
    }

    for (final entry in booksByAuthor.entries) {
      final safeAuth = safeFilename(entry.key);
      final authorMd = buildAuthorMarkdown(entry.key, entry.value);
      archive.addFile(ArchiveFile('Authors/$safeAuth.md', authorMd.length, utf8.encode(authorMd)));
    }

    // 4. Series Hubs
    final booksBySeries = <String, List<Book>>{};
    for (final b in books) {
      final ser = b.seriesName?.trim();
      if (ser != null && ser.isNotEmpty) {
        booksBySeries.putIfAbsent(ser, () => []).add(b);
      }
    }

    for (final entry in booksBySeries.entries) {
      final safeSer = safeFilename(entry.key);
      final seriesMd = buildSeriesMarkdown(entry.key, entry.value);
      archive.addFile(ArchiveFile('Series/$safeSer.md', seriesMd.length, utf8.encode(seriesMd)));
    }

    // 5. Pre-configured .obsidian Settings
    final appJson = getAppJson();
    archive.addFile(ArchiveFile('.obsidian/app.json', appJson.length, utf8.encode(appJson)));

    final corePluginsJson = getCorePluginsJson();
    archive.addFile(ArchiveFile('.obsidian/core-plugins.json', corePluginsJson.length, utf8.encode(corePluginsJson)));

    final css = getReadingVaultCss();
    archive.addFile(ArchiveFile('.obsidian/snippets/reading-vault.css', css.length, utf8.encode(css)));

    // Compress with ZipEncoder
    final zipEncoder = ZipEncoder();
    return zipEncoder.encode(archive);
  }
}
