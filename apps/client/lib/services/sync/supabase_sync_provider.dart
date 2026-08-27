import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../models/book.dart';
import '../../models/reading_journey.dart';
import 'sync_provider.dart';

class SupabaseSyncProvider implements RemoteSyncProvider {
  final String supabaseUrl;
  final String anonKey;

  SupabaseSyncProvider({
    required this.supabaseUrl,
    required this.anonKey,
  });

  @override
  String get name => 'Supabase (PostgreSQL)';

  @override
  SyncBackendType get type => SyncBackendType.supabase;

  Map<String, String> get _headers => {
        'apikey': anonKey,
        'Authorization': 'Bearer $anonKey',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates',
      };

  @override
  Future<bool> testConnection() async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?limit=1');
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 4));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('SupabaseSyncProvider testConnection error: $e');
      return false;
    }
  }

  @override
  Future<List<Book>> fetchRemoteBooks({DateTime? since}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return [];
    try {
      var urlStr = '$supabaseUrl/rest/v1/books?order=updated_at.desc';
      if (since != null) {
        urlStr += '&updated_at=gt.${Uri.encodeComponent(since.toIso8601String())}';
      }
      final uri = Uri.parse(urlStr);
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final List<dynamic> list = jsonDecode(res.body);
        return list.map((item) => Book.fromMap(item as Map<String, dynamic>)).toList();
      }
      debugPrint('SupabaseSyncProvider fetchRemoteBooks failed with status: ${res.statusCode}');
      return [];
    } catch (e) {
      debugPrint('SupabaseSyncProvider fetchRemoteBooks error: $e');
      return [];
    }
  }

  @override
  Future<bool> pushBook(Book book) async {
    final failed = await pushBooks([book]);
    return failed.isEmpty;
  }

  @override
  Future<List<String>> pushBooks(List<Book> books) async {
    if (books.isEmpty) return [];
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return books.map((b) => b.id).toList();
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?on_conflict=id');
      final payload = books.map((b) => b.toRemoteMap()).toList();
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return [];
      }
      debugPrint('SupabaseSyncProvider pushBooks batch failed [${res.statusCode}]: ${res.body}');
      return books.map((b) => b.id).toList();
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushBooks batch error: $e');
      return books.map((b) => b.id).toList();
    }
  }

  @override
  Future<bool> deleteBook(String id, {bool permanent = false}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?id=eq.$id');
      if (permanent) {
        // First delete child reading log entries in Supabase
        try {
          final logUri = Uri.parse('$supabaseUrl/rest/v1/reading_log?book_id=eq.$id');
          await http.delete(logUri, headers: {
            'apikey': anonKey,
            'Authorization': 'Bearer $anonKey',
            'Prefer': 'return=minimal',
          }).timeout(const Duration(seconds: 4));
        } catch (_) {}

        // Delete child reading journeys in Supabase
        try {
          final journeyUri = Uri.parse('$supabaseUrl/rest/v1/reading_journeys?book_id=eq.$id');
          await http.delete(journeyUri, headers: {
            'apikey': anonKey,
            'Authorization': 'Bearer $anonKey',
            'Prefer': 'return=minimal',
          }).timeout(const Duration(seconds: 4));
        } catch (_) {}

        final res = await http.delete(uri, headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer $anonKey',
          'Prefer': 'return=minimal',
        }).timeout(const Duration(seconds: 8));
        return res.statusCode >= 200 && res.statusCode < 300;
      }

      final now = DateTime.now().toUtc().toIso8601String();
      final res = await http
          .patch(
            uri,
            headers: _headers,
            body: jsonEncode({
              'deleted_at': now,
              'updated_at': now,
            }),
          )
          .timeout(const Duration(seconds: 8));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('SupabaseSyncProvider deleteBook error: $e');
      return false;
    }
  }

  @override
  Future<bool> pushReadingJourney(ReadingJourney journey) async {
    final failed = await pushReadingJourneys([journey]);
    return failed.isEmpty;
  }

  @override
  Future<List<String>> pushReadingJourneys(List<ReadingJourney> journeys) async {
    if (journeys.isEmpty) return [];
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return journeys.map((j) => j.id).toList();
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/reading_journeys?on_conflict=id');
      final payload = journeys.map((j) => j.toRemoteMap()).toList();
      final res = await http
          .post(
            uri,
            headers: {
              ..._headers,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return [];
      }
      debugPrint('SupabaseSyncProvider pushReadingJourneys batch failed [${res.statusCode}]: ${res.body}');
      return journeys.map((j) => j.id).toList();
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushReadingJourneys batch error: $e');
      return journeys.map((j) => j.id).toList();
    }
  }

  @override
  Future<List<ReadingJourney>> fetchRemoteReadingJourneys({DateTime? since}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return [];
    final List<ReadingJourney> allJourneys = [];
    int offset = 0;
    const int batchSize = 1000;
    try {
      while (true) {
        var urlStr = '$supabaseUrl/rest/v1/reading_journeys?select=*&order=updated_at.desc&limit=$batchSize&offset=$offset';
        if (since != null) {
          urlStr += '&updated_at=gt.${Uri.encodeComponent(since.toIso8601String())}';
        }
        final uri = Uri.parse(urlStr);
        final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          final List<dynamic> list = jsonDecode(res.body);
          if (list.isEmpty) break;
          allJourneys.addAll(list.map((item) => ReadingJourney.fromMap(item as Map<String, dynamic>)));
          if (list.length < batchSize) break;
          offset += list.length;
        } else {
          debugPrint('SupabaseSyncProvider fetchRemoteReadingJourneys failed with status: ${res.statusCode}');
          break;
        }
      }
      return allJourneys;
    } catch (e) {
      debugPrint('SupabaseSyncProvider fetchRemoteReadingJourneys error: $e');
      return allJourneys;
    }
  }

  @override
  Future<bool> pushReadingLog(ReadingLogEntry entry) async {
    final failed = await pushReadingLogs([entry]);
    return failed.isEmpty;
  }

  @override
  Future<List<String>> pushReadingLogs(List<ReadingLogEntry> logs) async {
    if (logs.isEmpty) return [];
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return logs.map((l) => l.id).toList();
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/reading_log?on_conflict=id');
      final payload = logs.map((l) => l.toRemoteMap()).toList();
      final res = await http
          .post(
            uri,
            headers: {
              ..._headers,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return [];
      }
      debugPrint('SupabaseSyncProvider pushReadingLogs batch failed [${res.statusCode}]: ${res.body}');
      return logs.map((l) => l.id).toList();
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushReadingLogs batch error: $e');
      return logs.map((l) => l.id).toList();
    }
  }

  @override
  Future<List<ReadingLogEntry>> fetchRemoteReadingLogs({DateTime? since, List<String>? bookIds}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return [];
    final List<ReadingLogEntry> allLogs = [];
    int offset = 0;
    const int batchSize = 1000;
    try {
      while (true) {
        var urlStr = '$supabaseUrl/rest/v1/reading_log?select=*&order=logged_at.desc&limit=$batchSize&offset=$offset';
        if (bookIds != null && bookIds.isNotEmpty) {
          final joined = bookIds.map((id) => '"$id"').join(',');
          urlStr += '&book_id=in.($joined)';
        } else if (since != null) {
          urlStr += '&logged_at=gt.${Uri.encodeComponent(since.toIso8601String())}';
        }
        final uri = Uri.parse(urlStr);
        final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 12));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          final List<dynamic> list = jsonDecode(res.body);
          if (list.isEmpty) break;
          allLogs.addAll(list.map((item) => ReadingLogEntry.fromMap(item as Map<String, dynamic>)));
          if (list.length < batchSize) break;
          offset += list.length;
        } else {
          debugPrint('SupabaseSyncProvider fetchRemoteReadingLogs failed with status: ${res.statusCode}');
          break;
        }
      }
      return allLogs;
    } catch (e) {
      debugPrint('SupabaseSyncProvider fetchRemoteReadingLogs error: $e');
      return allLogs;
    }
  }

  @override
  Future<int?> fetchYearlyGoal() async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return null;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/app_settings?key=eq.yearly_goal&select=value');
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 6));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final dynamic data = jsonDecode(res.body);
        if (data is List && data.isNotEmpty) {
          final val = data.first['value'];
          if (val is Map && val['count'] != null) {
            return (val['count'] as num).toInt();
          }
        }
      }
      return null;
    } catch (e) {
      debugPrint('SupabaseSyncProvider fetchYearlyGoal error: $e');
      return null;
    }
  }

  @override
  Future<bool> pushYearlyGoal(int goal) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/app_settings?on_conflict=key');
      final now = DateTime.now().toUtc().toIso8601String();
      final res = await http
          .post(
            uri,
            headers: {
              ..._headers,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: jsonEncode([
              {
                'key': 'yearly_goal',
                'value': {'count': goal},
                'updated_at': now,
              }
            ]),
          )
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushYearlyGoal error: $e');
      return false;
    }
  }
}
