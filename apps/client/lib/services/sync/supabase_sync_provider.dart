import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../models/book.dart';
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
  Future<List<Book>> fetchRemoteBooks() async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return [];
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?deleted_at=is.null&order=updated_at.desc');
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
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?on_conflict=id');
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode([book.toRemoteMap()]))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return true;
      }
      debugPrint('SupabaseSyncProvider pushBook failed [${res.statusCode}]: ${res.body}');
      return false;
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushBook error: $e');
      return false;
    }
  }

  @override
  Future<bool> deleteBook(String id, {bool permanent = false}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?id=eq.$id');
      if (permanent) {
        final res = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 8));
        return res.statusCode >= 200 && res.statusCode < 300;
      }

      final now = DateTime.now().toIso8601String();
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
  Future<bool> pushReadingLog(ReadingLogEntry entry) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/reading_log?on_conflict=id');
      final res = await http
          .post(
            uri,
            headers: {
              ..._headers,
              'Prefer': 'resolution=merge-duplicates',
            },
            body: jsonEncode([entry.toRemoteMap()]),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return true;
      }
      debugPrint('SupabaseSyncProvider pushReadingLog failed [${res.statusCode}]: ${res.body}');
      return false;
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushReadingLog error: $e');
      return false;
    }
  }

  @override
  Future<List<ReadingLogEntry>> fetchRemoteReadingLogs({DateTime? since}) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return [];
    try {
      var urlStr = '$supabaseUrl/rest/v1/reading_log?select=*&order=logged_at.desc&limit=1000';
      if (since != null) {
        urlStr += '&logged_at=gt.${Uri.encodeComponent(since.toIso8601String())}';
      }
      final uri = Uri.parse(urlStr);
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final List<dynamic> list = jsonDecode(res.body);
        return list.map((item) => ReadingLogEntry.fromMap(item as Map<String, dynamic>)).toList();
      }
      debugPrint('SupabaseSyncProvider fetchRemoteReadingLogs failed with status: ${res.statusCode}');
      return [];
    } catch (e) {
      debugPrint('SupabaseSyncProvider fetchRemoteReadingLogs error: $e');
      return [];
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
      final now = DateTime.now().toIso8601String();
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
