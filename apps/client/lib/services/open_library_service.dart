import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class OpenLibraryService {
  static Future<String?> searchCover(String title, [String? author]) async {
    final cleanTitle = title.trim();
    if (cleanTitle.isEmpty) return null;

    try {
      final query = author != null && author.trim().isNotEmpty
          ? '$cleanTitle ${author.trim()}'
          : cleanTitle;
      final encoded = Uri.encodeComponent(query);
      final url = Uri.parse('https://openlibrary.org/search.json?q=$encoded&limit=1');
      final response = await http.get(url).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['docs'] is List && (data['docs'] as List).isNotEmpty) {
          final doc = (data['docs'] as List).first;
          if (doc['cover_i'] != null) {
            final coverId = doc['cover_i'];
            return 'https://covers.openlibrary.org/b/id/$coverId-M.jpg';
          }
        }
      }
      return null;
    } catch (e) {
      debugPrint('OpenLibraryService searchCover error: $e');
      return null;
    }
  }
}
