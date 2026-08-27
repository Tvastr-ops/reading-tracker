import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

class UpdateInfo {
  final String latestVersion;
  final String currentVersion;
  final bool hasUpdate;
  final String releaseUrl;
  final String? releaseNotes;
  final String? publishedAt;

  const UpdateInfo({
    required this.latestVersion,
    required this.currentVersion,
    required this.hasUpdate,
    required this.releaseUrl,
    this.releaseNotes,
    this.publishedAt,
  });
}

class UpdateService {
  static final UpdateService instance = UpdateService._init();
  UpdateService._init();

  static const String repoOwner = 'Tvastr-ops';
  static const String repoName = 'reading-tracker';
  static const String currentReleaseVersion = 'v2.4.0c';

  String? _cachedAppVersion;

  /// Returns the current app version formatted with 'v' prefix (e.g. 'v1.7.0c').
  /// Reads dynamically from PackageInfo, but falls back gracefully if Windows/Linux returns generic '1.0.0'.
  Future<String> getCurrentAppVersion() async {
    if (_cachedAppVersion != null) return _cachedAppVersion!;
    try {
      final info = await PackageInfo.fromPlatform();
      final version = info.version.trim();
      if (version.isNotEmpty && version != '1.0.0' && version != '0.0.0') {
        _cachedAppVersion = version.startsWith('v') || version.startsWith('V')
            ? version
            : 'v$version';
        return _cachedAppVersion!;
      }
    } catch (e) {
      debugPrint('Error getting package info: $e');
    }
    _cachedAppVersion = currentReleaseVersion;
    return _cachedAppVersion!;
  }

  /// Compares two base-10 letter suffix versions (e.g., v1.6.0b vs v1.6.0c).
  /// Returns > 0 if [a] is newer than [b], 0 if equal, < 0 if older.
  static int compareVersions(String a, String b) {
    final normA = a.startsWith('v') || a.startsWith('V') ? a.substring(1) : a;
    final normB = b.startsWith('v') || b.startsWith('V') ? b.substring(1) : b;

    if (normA == normB) return 0;

    final reg = RegExp(r'^(\d+)\.(\d+)\.(\d+)([a-z]?)$', caseSensitive: false);
    final matchA = reg.firstMatch(normA);
    final matchB = reg.firstMatch(normB);

    if (matchA != null && matchB != null) {
      final majorA = int.tryParse(matchA.group(1)!) ?? 0;
      final majorB = int.tryParse(matchB.group(1)!) ?? 0;
      if (majorA != majorB) return majorA.compareTo(majorB);

      final minorA = int.tryParse(matchA.group(2)!) ?? 0;
      final minorB = int.tryParse(matchB.group(2)!) ?? 0;
      if (minorA != minorB) return minorA.compareTo(minorB);

      final patchA = int.tryParse(matchA.group(3)!) ?? 0;
      final patchB = int.tryParse(matchB.group(3)!) ?? 0;
      if (patchA != patchB) return patchA.compareTo(patchB);

      final suffixA = matchA.group(4)?.toLowerCase() ?? '';
      final suffixB = matchB.group(4)?.toLowerCase() ?? '';
      return suffixA.compareTo(suffixB);
    }

    return normA.compareTo(normB);
  }

  static bool isNewerVersion(String latest, String current) {
    return compareVersions(latest, current) > 0;
  }

  /// Checks GitHub releases API for the latest published tag.
  Future<UpdateInfo?> checkForUpdates() async {
    try {
      final currentVersion = await getCurrentAppVersion();
      final uri = Uri.parse('https://api.github.com/repos/$repoOwner/$repoName/releases/latest');
      final res = await http.get(uri, headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PaperbackReaderClient',
      }).timeout(const Duration(seconds: 6));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final dynamic data = jsonDecode(res.body);
        if (data is Map<String, dynamic>) {
          final tagName = data['tag_name']?.toString() ?? '';
          final htmlUrl = data['html_url']?.toString() ??
              'https://github.com/$repoOwner/$repoName/releases';
          final body = data['body']?.toString();
          final publishedAt = data['published_at']?.toString();

          final hasUpdate = isNewerVersion(tagName, currentVersion);

          return UpdateInfo(
            latestVersion: tagName,
            currentVersion: currentVersion,
            hasUpdate: hasUpdate,
            releaseUrl: htmlUrl,
            releaseNotes: body,
            publishedAt: publishedAt,
          );
        }
      }
      debugPrint('UpdateService check failed with status: ${res.statusCode}');
      return null;
    } catch (e) {
      debugPrint('UpdateService check error: $e');
      return null;
    }
  }
}
