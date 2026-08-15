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
      final uri = Uri.parse('$supabaseUrl/rest/v1/books');
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode([book.toSupabaseJson()]))
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushBook error: $e');
      return false;
    }
  }

  @override
  Future<bool> deleteBook(String id) async {
    if (supabaseUrl.isEmpty || anonKey.isEmpty) return false;
    try {
      final uri = Uri.parse('$supabaseUrl/rest/v1/books?id=eq.$id');
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
          .timeout(const Duration(seconds: 6));
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
      final uri = Uri.parse('$supabaseUrl/rest/v1/reading_log');
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode([entry.toMap()]))
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('SupabaseSyncProvider pushReadingLog error: $e');
      return false;
    }
  }
}
