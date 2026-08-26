import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import '../models/book.dart';
import 'database_helper.dart';

class BackupResult {
  final bool success;
  final int importedBooks;
  final int importedLogs;
  final String message;
  final String? exportPath;

  const BackupResult({
    required this.success,
    this.importedBooks = 0,
    this.importedLogs = 0,
    required this.message,
    this.exportPath,
  });
}

class BackupService {
  static final BackupService instance = BackupService._internal();
  BackupService._internal();

  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  /// Exports entire library (books + reading logs) into a standardized JSON string.
  Future<String> generateJsonBackup() async {
    final books = await _dbHelper.getBooks();
    final allLogs = <Map<String, dynamic>>[];

    for (final book in books) {
      final logs = await _dbHelper.getReadingLogs(book.id);
      for (final log in logs) {
        allLogs.add(log.toMap());
      }
    }

    final backupPayload = {
      'version': '2.0',
      'exported_at': DateTime.now().toUtc().toIso8601String(),
      'app': 'Paperback Reader',
      'books_count': books.length,
      'logs_count': allLogs.length,
      'books': books.map((b) => b.toRemoteMap()).toList(),
      'reading_logs': allLogs,
    };

    return const JsonEncoder.withIndent('  ').convert(backupPayload);
  }

  /// Exports books into a CSV string matching Web App canonical export headers.
  Future<String> generateCsvBackup() async {
    final books = await _dbHelper.getBooks();
    const columns = [
      'title',
      'type',
      'author',
      'status',
      'rating',
      'progress',
      'total_units',
      'genre_tags',
      'source_link',
      'cover_url',
      'date_started',
      'date_finished',
      'notes',
      'unit_type',
      'progress_structure',
      'parent_progress',
      'parent_total',
      'latest_units',
      'is_ongoing',
      'is_favorite',
      'series_name',
      'series_order',
      'shelf_names',
      'reread_count',
    ];

    final buffer = StringBuffer();
    buffer.writeln(columns.join(','));

    for (final b in books) {
      final map = b.toRemoteMap();
      final row = columns.map((col) => _escapeCsvValue(map[col])).join(',');
      buffer.writeln(row);
    }

    return buffer.toString();
  }

  String _escapeCsvValue(dynamic val) {
    if (val == null) return '';
    var str = val.toString();
    if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
      str = "'$str";
    }
    if (str.contains(',') || str.contains('"') || str.contains('\n') || str.contains('\r')) {
      return '"${str.replaceAll('"', '""')}"';
    }
    return str;
  }

  /// Saves backup text (JSON or CSV) to the user's Downloads directory.
  Future<BackupResult> saveBackupToFile({required bool isJson}) async {
    try {
      final ext = isJson ? 'json' : 'csv';
      final content = isJson ? await generateJsonBackup() : await generateCsvBackup();
      final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
      final filename = 'paperback_backup_$timestamp.$ext';

      Directory? targetDir;
      if (!kIsWeb) {
        if (Platform.isAndroid) {
          targetDir = Directory('/storage/emulated/0/Download');
          if (!targetDir.existsSync()) {
            targetDir = await getExternalStorageDirectory();
          }
        } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
          targetDir = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
        } else {
          targetDir = await getApplicationDocumentsDirectory();
        }
      }

      targetDir ??= await getApplicationDocumentsDirectory();
      final file = File('${targetDir.path}/$filename');
      await file.writeAsString(content);

      return BackupResult(
        success: true,
        message: 'Backup saved successfully to ${file.path}',
        exportPath: file.path,
      );
    } catch (e) {
      return BackupResult(
        success: false,
        message: 'Failed to export backup: $e',
      );
    }
  }

  /// Restores library from a raw JSON or CSV backup string.
  Future<BackupResult> restoreFromBackupString(String rawData) async {
    final trimmed = rawData.trim();
    if (trimmed.isEmpty) {
      return const BackupResult(success: false, message: 'Backup file is empty.');
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return await _restoreFromJson(trimmed);
    } else {
      return await _restoreFromCsv(trimmed);
    }
  }

  Future<BackupResult> _restoreFromJson(String jsonString) async {
    try {
      final decoded = jsonDecode(jsonString);
      List<dynamic> booksList = [];
      List<dynamic> logsList = [];

      if (decoded is List) {
        booksList = decoded;
      } else if (decoded is Map<String, dynamic>) {
        if (decoded['books'] is List) {
          booksList = decoded['books'] as List;
        }
        if (decoded['reading_logs'] is List) {
          logsList = decoded['reading_logs'] as List;
        }
      }

      int importedBooks = 0;
      int importedLogs = 0;

      for (final rawBook in booksList) {
        if (rawBook is! Map<String, dynamic>) continue;
        final book = Book.fromMap(rawBook);
        await _dbHelper.insertBook(book);
        importedBooks++;
      }

      for (final rawLog in logsList) {
        if (rawLog is! Map<String, dynamic>) continue;
        final entry = ReadingLogEntry.fromMap(rawLog);
        await _dbHelper.insertReadingLog(entry);
        importedLogs++;
      }

      return BackupResult(
        success: true,
        importedBooks: importedBooks,
        importedLogs: importedLogs,
        message: 'Restored $importedBooks books and $importedLogs reading logs successfully!',
      );
    } catch (e) {
      return BackupResult(
        success: false,
        message: 'Failed to parse JSON backup: $e',
      );
    }
  }

  Future<BackupResult> _restoreFromCsv(String csvString) async {
    try {
      final lines = const LineSplitter().convert(csvString).where((l) => l.trim().isNotEmpty).toList();
      if (lines.isEmpty) {
        return const BackupResult(success: false, message: 'CSV file is empty.');
      }

      final header = _parseCsvLine(lines.first).map((h) => h.toLowerCase().trim()).toList();
      int importedBooks = 0;

      for (int i = 1; i < lines.length; i++) {
        final values = _parseCsvLine(lines[i]);
        if (values.isEmpty) continue;

        final map = <String, dynamic>{};
        for (int j = 0; j < header.length && j < values.length; j++) {
          final key = header[j];
          final val = values[j].trim();
          map[key] = val.isEmpty ? null : val;
        }

        if (map['title'] == null || map['title'].toString().trim().isEmpty) continue;

        final book = Book(
          id: map['id']?.toString() ?? (DateTime.now().millisecondsSinceEpoch + i).toString(),
          title: map['title'].toString(),
          type: map['type']?.toString() ?? 'Novel',
          unitType: map['unit_type']?.toString() ?? 'pages',
          progressStructure: map['progress_structure']?.toString() ?? 'single',
          parentProgress: map['parent_progress'] != null ? num.tryParse(map['parent_progress'].toString()) : null,
          parentTotal: map['parent_total'] != null ? num.tryParse(map['parent_total'].toString()) : null,
          latestUnits: map['latest_units'] != null ? num.tryParse(map['latest_units'].toString()) : null,
          isOngoing: map['is_ongoing'] == 'true' || map['is_ongoing'] == '1',
          author: map['author']?.toString(),
          status: map['status']?.toString() ?? 'Plan to Read',
          rating: map['rating'] != null ? double.tryParse(map['rating'].toString()) : null,
          progress: map['progress'] != null ? double.tryParse(map['progress'].toString()) ?? 0 : 0,
          totalUnits: map['total_units'] != null ? double.tryParse(map['total_units'].toString()) : null,
          genreTags: map['genre_tags']?.toString(),
          sourceLink: map['source_link']?.toString(),
          coverUrl: map['cover_url']?.toString(),
          dateStarted: map['date_started']?.toString(),
          dateFinished: map['date_finished']?.toString(),
          notes: map['notes']?.toString(),
          isFavorite: map['is_favorite'] == 'true' || map['is_favorite'] == '1',
          seriesName: map['series_name']?.toString(),
          seriesOrder: map['series_order'] != null ? double.tryParse(map['series_order'].toString()) : null,
          shelfNames: map['shelf_names']?.toString(),
          rereadCount: map['reread_count'] != null ? int.tryParse(map['reread_count'].toString()) ?? 0 : 0,
          createdAt: map['created_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
          updatedAt: map['updated_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
          syncStatus: 'pending_upsert',
        );

        await _dbHelper.insertBook(book);
        importedBooks++;
      }

      return BackupResult(
        success: true,
        importedBooks: importedBooks,
        message: 'Imported $importedBooks books from CSV successfully!',
      );
    } catch (e) {
      return BackupResult(
        success: false,
        message: 'Failed to parse CSV backup: $e',
      );
    }
  }

  List<String> _parseCsvLine(String line) {
    final result = <String>[];
    final buffer = StringBuffer();
    bool inQuotes = false;

    for (int i = 0; i < line.length; i++) {
      final char = line[i];
      if (char == '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
          buffer.write('"');
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char == ',' && !inQuotes) {
        result.add(buffer.toString());
        buffer.clear();
      } else {
        buffer.write(char);
      }
    }
    result.add(buffer.toString());
    return result;
  }
}
