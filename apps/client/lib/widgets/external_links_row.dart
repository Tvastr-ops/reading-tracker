import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';

class ParsedExternalLink {
  final String url;
  final String label;
  final String domain;
  final IconData icon;

  const ParsedExternalLink({
    required this.url,
    required this.label,
    required this.domain,
    required this.icon,
  });
}

List<ParsedExternalLink> parseExternalLinks(String? raw) {
  if (raw == null || raw.trim().isEmpty) return [];

  final lines = raw.split(RegExp(r'[\n,;]+')).map((l) => l.trim()).where((l) => l.isNotEmpty);
  final List<ParsedExternalLink> parsed = [];

  for (final item in lines) {
    String url = item;
    String? customLabel;

    final mdMatch = RegExp(r'^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$').firstMatch(item);
    if (mdMatch != null) {
      customLabel = mdMatch.group(1);
      url = mdMatch.group(2) ?? url;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.contains('.') && !url.contains(' ')) {
        url = 'https://$url';
      } else {
        continue;
      }
    }

    try {
      final uri = Uri.parse(url);
      final hostname = uri.host.toLowerCase().replaceFirst(RegExp(r'^www\.'), '');

      String label = customLabel ?? hostname;
      IconData icon = Icons.public;

      if (hostname.contains('wikipedia.org')) {
        label = customLabel ?? 'Wikipedia';
        icon = Icons.menu_book;
      } else if (hostname.contains('fandom.com')) {
        label = customLabel ?? 'Fandom Wiki';
        icon = Icons.menu_book;
      } else if (hostname.contains('anilist.co') || hostname.contains('myanimelist.net')) {
        label = customLabel ?? (hostname.contains('anilist.co') ? 'AniList' : 'MyAnimeList');
        icon = Icons.insights;
      } else if (hostname.contains('goodreads.com') || hostname.contains('thestorygraph.com') || hostname.contains('hardcover.app')) {
        label = customLabel ?? (hostname.contains('goodreads.com') ? 'Goodreads' : 'StoryGraph');
        icon = Icons.local_library;
      } else if (hostname.contains('royalroad.com') || hostname.contains('novelupdates.com') || hostname.contains('syosetu.com')) {
        label = customLabel ?? (hostname.contains('royalroad.com') ? 'Royal Road' : 'NovelUpdates');
        icon = Icons.bolt;
      } else if (hostname.contains('mangadex.org')) {
        label = customLabel ?? 'MangaDex';
        icon = Icons.menu_book;
      } else if (hostname.contains('amazon.') || hostname.contains('bookwalker.jp')) {
        label = customLabel ?? 'Store / Amazon';
        icon = Icons.shopping_bag;
      }

      parsed.add(ParsedExternalLink(
        url: url,
        label: label,
        domain: hostname,
        icon: icon,
      ));
    } catch (_) {}
  }

  return parsed;
}

class ExternalLinksRow extends StatelessWidget {
  final String? sourceLink;

  const ExternalLinksRow({super.key, required this.sourceLink});

  Future<void> _launch(String urlStr) async {
    try {
      final uri = Uri.parse(urlStr);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('Could not launch URL: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final links = parseExternalLinks(sourceLink);
    if (links.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final cardBg = isDark ? AppColors.darkSurface : AppColors.paperBg;

    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: links.map((link) {
        return InkWell(
          onTap: () => _launch(link.url),
          borderRadius: BorderRadius.zero,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            decoration: BoxDecoration(
              color: cardBg,
              border: Border.all(color: borderColor, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: borderColor,
                  offset: const Offset(1.5, 1.5),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(link.icon, size: 13, color: inkColor),
                const SizedBox(width: 5),
                Text(
                  link.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: inkColor,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(Icons.open_in_new, size: 10, color: inkColor.withValues(alpha: 0.6)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
