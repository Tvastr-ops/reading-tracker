import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class EnrichmentResult {
  final String id;
  final String source;
  final String sourceLabel;
  final String title;
  final String? author;
  final String? coverUrl;
  final num? totalUnits;
  final String? unitType;
  final String? description;
  final String? publisher;
  final int? publishedYear;
  final String? genreTags;
  final String? isbn;
  final String? seriesName;
  final double? seriesOrder;
  final bool? isOngoing;
  final String? externalLink;

  const EnrichmentResult({
    required this.id,
    required this.source,
    required this.sourceLabel,
    required this.title,
    this.author,
    this.coverUrl,
    this.totalUnits,
    this.unitType,
    this.description,
    this.publisher,
    this.publishedYear,
    this.genreTags,
    this.isbn,
    this.seriesName,
    this.seriesOrder,
    this.isOngoing,
    this.externalLink,
  });
}

class EnrichmentService {
  static final EnrichmentService instance = EnrichmentService._();
  EnrichmentService._();

  static String _stripHtml(String? html) {
    if (html == null || html.isEmpty) return '';
    return html
        .replaceAll(RegExp(r'<br\s*[\/]?>', caseSensitive: false), '\n')
        .replaceAll(RegExp(r'<[^>]+>'), '')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .trim();
  }

  static String? _cleanIsbn(String val) {
    final cleaned = val.replaceAll(RegExp(r'[^0-9X]', caseSensitive: false), '');
    if (cleaned.length == 10 || cleaned.length == 13) {
      return cleaned;
    }
    return null;
  }

  Future<List<EnrichmentResult>> search(String query, {String type = 'all'}) async {
    final q = query.trim();
    if (q.isEmpty) return [];

    final isbnCandidate = _cleanIsbn(q);
    final List<Future<List<EnrichmentResult>>> futures = [];

    if (type == 'isbn' && isbnCandidate != null) {
      futures.add(_queryOpenLibrary(q, isbnCandidate));
      futures.add(_queryGoogleBooks('isbn:$isbnCandidate'));
    } else if (type == 'manga' || type == 'lightnovel') {
      futures.add(_queryAniList(q));
      futures.add(_queryGoogleBooks(q));
      futures.add(_queryOpenLibrary(q, isbnCandidate));
    } else {
      futures.add(_queryGoogleBooks(isbnCandidate != null ? 'isbn:$isbnCandidate' : q));
      futures.add(_queryOpenLibrary(q, isbnCandidate));
      if (isbnCandidate == null) {
        futures.add(_queryAniList(q));
      }
    }

    final nested = await Future.wait(futures);
    final flat = nested.expand((x) => x).toList();

    // Deduplicate
    final seen = <String>{};
    final deduped = <EnrichmentResult>[];
    for (final item in flat) {
      final key = '${item.title.toLowerCase().trim()}-${item.author?.toLowerCase().trim() ?? ''}-${item.source}';
      if (!seen.contains(key)) {
        seen.add(key);
        deduped.add(item);
      }
    }

    return deduped;
  }

  Future<List<EnrichmentResult>> _queryOpenLibrary(String query, String? isbnCandidate) async {
    final results = <EnrichmentResult>[];
    try {
      if (isbnCandidate != null) {
        final uri = Uri.parse('https://openlibrary.org/isbn/$isbnCandidate.json');
        final res = await http.get(uri, headers: {
          'User-Agent': 'PaperbackReadingTracker/2.7 (Flutter Client)'
        }).timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data is Map<String, dynamic> && data['title'] != null) {
            String? coverUrl;
            if (data['covers'] is List && (data['covers'] as List).isNotEmpty) {
              coverUrl = 'https://covers.openlibrary.org/b/id/${data['covers'][0]}-L.jpg';
            }

            String? desc;
            if (data['description'] is String) {
              desc = data['description'];
            } else if (data['description'] is Map) {
              desc = data['description']['value'];
            }

            results.add(EnrichmentResult(
              id: 'ol-isbn-${data['key'] ?? isbnCandidate}',
              source: 'openlibrary',
              sourceLabel: 'Open Library (ISBN Match)',
              title: data['title'] as String,
              author: null,
              coverUrl: coverUrl,
              totalUnits: data['number_of_pages'] as num?,
              unitType: 'pages',
              description: _stripHtml(desc),
              publisher: data['publishers'] is List && (data['publishers'] as List).isNotEmpty
                  ? data['publishers'][0].toString()
                  : null,
              isbn: isbnCandidate,
              externalLink: 'https://openlibrary.org${data['key'] ?? ''}',
            ));
          }
        }
      }

      final searchUrl = isbnCandidate != null
          ? 'https://openlibrary.org/search.json?isbn=$isbnCandidate&limit=5'
          : 'https://openlibrary.org/search.json?q=${Uri.encodeComponent(query)}&limit=6';

      final resSearch = await http.get(Uri.parse(searchUrl), headers: {
        'User-Agent': 'PaperbackReadingTracker/2.7 (Flutter Client)'
      }).timeout(const Duration(seconds: 4));

      if (resSearch.statusCode == 200) {
        final searchData = jsonDecode(resSearch.body);
        if (searchData is Map && searchData['docs'] is List) {
          for (final doc in (searchData['docs'] as List).take(5)) {
            if (doc is! Map || doc['title'] == null) continue;

            String? coverUrl;
            if (doc['cover_i'] != null) {
              coverUrl = 'https://covers.openlibrary.org/b/id/${doc['cover_i']}-L.jpg';
            }

            String? author;
            if (doc['author_name'] is List && (doc['author_name'] as List).isNotEmpty) {
              author = doc['author_name'][0].toString();
            }

            String? genreTags;
            if (doc['subject'] is List) {
              genreTags = (doc['subject'] as List).take(5).map((e) => e.toString()).join(', ');
            }

            num? pages;
            if (doc['number_of_pages_median'] != null) {
              pages = doc['number_of_pages_median'] as num?;
            } else if (doc['number_of_pages'] != null) {
              pages = doc['number_of_pages'] as num?;
            }

            results.add(EnrichmentResult(
              id: 'ol-${doc['key'] ?? doc['cover_i'] ?? doc['title']}',
              source: 'openlibrary',
              sourceLabel: 'Open Library',
              title: doc['title'].toString(),
              author: author,
              coverUrl: coverUrl,
              totalUnits: pages,
              unitType: 'pages',
              description: null,
              publisher: doc['publisher'] is List && (doc['publisher'] as List).isNotEmpty
                  ? doc['publisher'][0].toString()
                  : null,
              publishedYear: doc['first_publish_year'] is int ? doc['first_publish_year'] as int : null,
              genreTags: genreTags,
              isbn: doc['isbn'] is List && (doc['isbn'] as List).isNotEmpty ? doc['isbn'][0].toString() : null,
              externalLink: doc['key'] != null ? 'https://openlibrary.org${doc['key']}' : null,
            ));
          }
        }
      }
    } catch (e) {
      debugPrint('EnrichmentService OpenLibrary error: $e');
    }
    return results;
  }

  Future<List<EnrichmentResult>> _queryGoogleBooks(String query) async {
    final results = <EnrichmentResult>[];
    try {
      final url = 'https://www.googleapis.com/books/v1/volumes?q=${Uri.encodeComponent(query)}&maxResults=6&printType=books';
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data['items'] is List) {
          for (final item in data['items'] as List) {
            if (item is! Map || item['volumeInfo'] is! Map) continue;
            final info = item['volumeInfo'] as Map<String, dynamic>;
            final title = info['title']?.toString();
            if (title == null || title.isEmpty) continue;

            final subtitle = info['subtitle']?.toString();
            final fullTitle = subtitle != null && subtitle.isNotEmpty ? '$title: $subtitle' : title;

            String? author;
            if (info['authors'] is List && (info['authors'] as List).isNotEmpty) {
              author = info['authors'][0].toString();
            }

            String? coverUrl;
            if (info['imageLinks'] is Map) {
              final links = info['imageLinks'] as Map<String, dynamic>;
              coverUrl = links['extraLarge'] ?? links['large'] ?? links['medium'] ?? links['thumbnail'];
              if (coverUrl != null) {
                coverUrl = coverUrl.replaceFirst(RegExp(r'^http://', caseSensitive: false), 'https://').replaceAll('&edge=curl', '');
              }
            }

            int? publishedYear;
            if (info['publishedDate'] != null) {
              final dateStr = info['publishedDate'].toString();
              if (dateStr.length >= 4) {
                publishedYear = int.tryParse(dateStr.substring(0, 4));
              }
            }

            String? genreTags;
            if (info['categories'] is List) {
              genreTags = (info['categories'] as List).take(4).map((e) => e.toString()).join(', ');
            }

            String? isbn;
            if (info['industryIdentifiers'] is List) {
              for (final id in info['industryIdentifiers'] as List) {
                if (id is Map && id['type'] == 'ISBN_13') {
                  isbn = id['identifier']?.toString();
                  break;
                }
              }
            }

            results.add(EnrichmentResult(
              id: 'gb-${item['id'] ?? fullTitle}',
              source: 'googlebooks',
              sourceLabel: 'Google Books',
              title: fullTitle,
              author: author,
              coverUrl: coverUrl,
              totalUnits: info['pageCount'] as num?,
              unitType: 'pages',
              description: _stripHtml(info['description']?.toString()),
              publisher: info['publisher']?.toString(),
              publishedYear: publishedYear,
              genreTags: genreTags,
              isbn: isbn,
              externalLink: info['infoLink']?.toString() ?? info['previewLink']?.toString(),
            ));
          }
        }
      }
    } catch (e) {
      debugPrint('EnrichmentService Google Books error: $e');
    }
    return results;
  }

  Future<List<EnrichmentResult>> _queryAniList(String query) async {
    final results = <EnrichmentResult>[];
    try {
      const graphqlQuery = '''
        query (\$search: String) {
          Page(page: 1, perPage: 5) {
            media(search: \$search, type: MANGA, sort: SEARCH_MATCH) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
              }
              description(asHtml: false)
              format
              status
              chapters
              volumes
              genres
              startDate {
                year
              }
              siteUrl
            }
          }
        }
      ''';

      final res = await http.post(
        Uri.parse('https://graphql.anilist.co'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'query': graphqlQuery,
          'variables': {'search': query},
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final mediaList = data['data']?['Page']?['media'];
        if (mediaList is List) {
          for (final media in mediaList) {
            if (media is! Map) continue;
            final titles = media['title'] as Map?;
            final title = titles?['english'] ?? titles?['romaji'] ?? titles?['native'];
            if (title == null || title.toString().isEmpty) continue;

            String? coverUrl;
            if (media['coverImage'] is Map) {
              coverUrl = media['coverImage']['extraLarge'] ?? media['coverImage']['large'];
            }

            final isOngoing = media['status'] == 'RELEASING';
            String? genreTags;
            if (media['genres'] is List) {
              genreTags = (media['genres'] as List).take(5).map((e) => e.toString()).join(', ');
            }

            final format = media['format']?.toString();
            final unitType = format == 'NOVEL' ? 'volumes' : 'chapters';
            final totalUnits = unitType == 'volumes' ? media['volumes'] as num? : media['chapters'] as num?;

            int? startYear;
            if (media['startDate'] is Map && media['startDate']['year'] is int) {
              startYear = media['startDate']['year'] as int;
            }

            results.add(EnrichmentResult(
              id: 'al-${media['id']}',
              source: 'anilist',
              sourceLabel: 'AniList ($format)',
              title: title.toString(),
              author: null,
              coverUrl: coverUrl?.toString(),
              totalUnits: totalUnits,
              unitType: unitType,
              description: _stripHtml(media['description']?.toString()),
              publisher: null,
              publishedYear: startYear,
              genreTags: genreTags,
              isOngoing: isOngoing,
              externalLink: media['siteUrl']?.toString() ?? 'https://anilist.co/manga/${media['id']}',
            ));
          }
        }
      }
    } catch (e) {
      debugPrint('EnrichmentService AniList error: $e');
    }
    return results;
  }
}
