import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../models/book.dart';
import 'sync_provider.dart';

class GenericRestSyncProvider implements RemoteSyncProvider {
  final String serverUrl;
  final String? apiKey;

  GenericRestSyncProvider({
    required this.serverUrl,
    this.apiKey,
  });

  @override
  String get name => 'Self-Hosted REST Server';

  @override
  SyncBackendType get type => SyncBackendType.selfHostedRest;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (apiKey != null && apiKey!.isNotEmpty) ...{
          'Authorization': 'Bearer $apiKey',
          'x-api-key': apiKey!,
        },
      };

  String _cleanUrl(String path) {
    final base = serverUrl.endsWith('/') ? serverUrl.substring(0, serverUrl.length - 1) : serverUrl;
    final sub = path.startsWith('/') ? path : '/$path';
    return '$base$sub';
  }

  @override
  Future<bool> testConnection() async {
    if (serverUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(_cleanUrl('/api/books'));
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 4));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('GenericRestSyncProvider testConnection error: $e');
      return false;
    }
  }

  @override
  Future<List<Book>> fetchRemoteBooks() async {
    if (serverUrl.isEmpty) return [];
    try {
      final uri = Uri.parse(_cleanUrl('/api/books'));
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final dynamic data = jsonDecode(res.body);
        final List<dynamic> list = data is List ? data : (data['books'] as List? ?? []);
        return list.map((item) => Book.fromMap(item as Map<String, dynamic>)).toList();
      }
      debugPrint('GenericRestSyncProvider fetchRemoteBooks failed with status: ${res.statusCode}');
      return [];
    } catch (e) {
      debugPrint('GenericRestSyncProvider fetchRemoteBooks error: $e');
      return [];
    }
  }

  @override
  Future<bool> pushBook(Book book) async {
    if (serverUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(_cleanUrl('/api/books'));
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode(book.toSupabaseJson()))
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('GenericRestSyncProvider pushBook error: $e');
      return false;
    }
  }

  @override
  Future<bool> deleteBook(String id) async {
    if (serverUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(_cleanUrl('/api/books/$id'));
      final res = await http.delete(uri, headers: _headers).timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('GenericRestSyncProvider deleteBook error: $e');
      return false;
    }
  }

  @override
  Future<bool> pushReadingLog(ReadingLogEntry entry) async {
    if (serverUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(_cleanUrl('/api/books/${entry.bookId}/log'));
      final res = await http
          .post(uri, headers: _headers, body: jsonEncode(entry.toSupabaseJson()))
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('GenericRestSyncProvider pushReadingLog error: $e');
      return false;
    }
  }

  @override
  Future<List<ReadingLogEntry>> fetchRemoteReadingLogs({DateTime? since}) async {
    if (serverUrl.isEmpty) return [];
    try {
      var path = '/api/logs';
      if (since != null) {
        path += '?since=${Uri.encodeComponent(since.toIso8601String())}';
      }
      final uri = Uri.parse(_cleanUrl(path));
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final dynamic data = jsonDecode(res.body);
        final List<dynamic> list = data is Map && data['entries'] != null ? data['entries'] : (data is List ? data : []);
        return list.map((item) => ReadingLogEntry.fromMap(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('GenericRestSyncProvider fetchRemoteReadingLogs error: $e');
      return [];
    }
  }

  @override
  Future<int?> fetchYearlyGoal() async {
    if (serverUrl.isEmpty) return null;
    try {
      final uri = Uri.parse(_cleanUrl('/api/settings'));
      final res = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 6));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final dynamic data = jsonDecode(res.body);
        if (data is Map && data['yearlyGoal'] != null) {
          return (data['yearlyGoal'] as num).toInt();
        }
      }
      return null;
    } catch (e) {
      debugPrint('GenericRestSyncProvider fetchYearlyGoal error: $e');
      return null;
    }
  }

  @override
  Future<bool> pushYearlyGoal(int goal) async {
    if (serverUrl.isEmpty) return false;
    try {
      final uri = Uri.parse(_cleanUrl('/api/settings'));
      final res = await http
          .patch(
            uri,
            headers: _headers,
            body: jsonEncode({'yearlyGoal': goal}),
          )
          .timeout(const Duration(seconds: 6));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (e) {
      debugPrint('GenericRestSyncProvider pushYearlyGoal error: $e');
      return false;
    }
  }
}
