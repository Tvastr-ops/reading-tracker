import 'dart:math';
import '../models/book.dart';

/// Converts an integer to Roman Numerals (for Part -> Chapter structures).
String toRoman(num value) {
  final numInt = value.toInt();
  if (numInt <= 0) return numInt.toString();
  const romanMap = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  var remainder = numInt;
  final buffer = StringBuffer();
  for (final entry in romanMap) {
    final value = entry[0] as int;
    final letter = entry[1] as String;
    while (remainder >= value) {
      buffer.write(letter);
      remainder -= value;
    }
  }
  return buffer.toString();
}

String formatNum(num value) {
  if (value % 1 == 0) {
    return value.toInt().toString();
  }
  return value.toString();
}

/// Formats date cleanly with 3-letter month (e.g. 'Jul 31, 2026').
String formatDisplayDate(String? isoString) {
  if (isoString == null || isoString.isEmpty) return '';
  final dt = DateTime.tryParse(isoString);
  if (dt == null) return isoString;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
}

/// Returns the standard unit label based on explicit unit_type or book publication type.
String getUnitLabel(String bookType, [String? unitType]) {
  if (unitType != null && unitType.isNotEmpty) {
    return unitType;
  }
  switch (bookType) {
    case 'Light Novel':
    case 'Web Novel':
    case 'Fanfiction':
    case 'Serial':
      return 'chapters';
    case 'Collection':
    case 'Anthology':
      return 'volumes';
    case 'Novel':
    case 'Novella':
    case 'Novelette':
    case 'Short Story':
    case 'Essay':
    case 'Non-Fiction':
    default:
      return 'pages';
  }
}

/// Returns a concise, standardized neo-brutalist shorthand for publication formats (max 3 characters).
String getFormatShorthand(String bookType) {
  switch (bookType.toLowerCase()) {
    case 'novel':
      return 'NOV';
    case 'novella':
      return 'NVL';
    case 'novelette':
      return 'NVT';
    case 'light novel':
      return 'LN';
    case 'web novel':
      return 'WN';
    case 'short story':
      return 'SS';
    case 'collection':
      return 'COL';
    case 'anthology':
      return 'ANT';
    case 'essay':
      return 'ESY';
    case 'fanfiction':
      return 'FF';
    case 'other':
      return 'OTH';
    case 'manga':
      return 'MNG';
    case 'manhwa':
      return 'MHW';
    case 'manhua':
      return 'MHA';
    case 'serial':
      return 'SER';
    case 'play':
      return 'PLY';
    case 'poetry':
      return 'POE';
    default:
      return bookType.length <= 3 ? bookType.toUpperCase() : bookType.substring(0, 3).toUpperCase();
  }
}

String _formatCompactWords(num count) {
  if (count >= 1000000) {
    final m = count / 1000000.0;
    return '${m == m.roundToDouble() ? m.toInt() : m.toStringAsFixed(1)}m';
  }
  if (count >= 1000) {
    final k = count / 1000.0;
    return '${k == k.roundToDouble() ? k.toInt() : k.toStringAsFixed(1)}k';
  }
  return formatNum(count);
}

/// Formats the progress presentation text matching the web application semantics 1:1.
String formatProgressDisplay(Book book, {bool compact = false}) {
  final current = book.progress;
  final total = book.totalUnits;
  final unit = getUnitLabel(book.type, book.unitType);
  final structure = book.progressStructure ?? 'single';
  final parentProg = book.parentProgress;
  final parentTot = book.parentTotal;
  final isPlanned = book.status == BookStatus.planToRead;

  // 1. Status-Aware Planned Scope Presentation (e.g. "0/350 pg", "0/450 ch", "V.0/17", "155 ch • 18 v")
  if (isPlanned && current == 0 && (parentProg == null || parentProg == 0)) {
    if (structure == 'volume_chapter') {
      if (unit == 'volumes') {
        if (parentTot != null && parentTot > 0) {
          return compact ? 'V.0/${formatNum(parentTot)}' : 'Vol. 0 / ${formatNum(parentTot)}';
        }
        if (total != null && total > 0) {
          return compact ? 'V.0/${formatNum(total)}' : 'Vol. 0 / ${formatNum(total)}';
        }
        return compact ? 'V.0' : 'Vol. 0';
      }
      if (total != null && total > 0 && parentTot != null && parentTot > 0) {
        return compact
            ? '${formatNum(total)} ch • ${formatNum(parentTot)} v'
            : '${formatNum(total)} $unit • ${formatNum(parentTot)} vols';
      }
      if (total != null && total > 0) return '${formatNum(total)} ${compact && unit == "chapters" ? "ch" : unit}';
      if (parentTot != null && parentTot > 0) return '${formatNum(parentTot)} ${compact ? "vols" : "volumes"}';
      return 'Plan to Read';
    }

    if (structure == 'part_chapter') {
      if (total != null && total > 0 && parentTot != null && parentTot > 0) {
        return compact
            ? '${formatNum(total)} ch • ${formatNum(parentTot)} pt'
            : '${formatNum(total)} $unit • ${formatNum(parentTot)} parts';
      }
      if (total != null && total > 0) return '${formatNum(total)} ${compact && unit == "chapters" ? "ch" : unit}';
      if (parentTot != null && parentTot > 0) return '${formatNum(parentTot)} parts';
      return 'Plan to Read';
    }

    // Single structure planned
    if (total != null && total > 0) {
      if (unit == 'chapters') return compact ? '0/${formatNum(total)} ch' : '0 / ${formatNum(total)} chapters';
      if (unit == 'volumes') return compact ? 'V.0/${formatNum(total)}' : 'Vol. 0 / ${formatNum(total)}';
      if (unit == 'words') {
        return compact
            ? '0/${_formatCompactWords(total)} w'
            : '0 / ${formatNum(total)} words';
      }
      if (unit == 'percent') return '0%';
      if (compact && unit == 'pages') return '0/${formatNum(total)} pg';
      return '0 / ${formatNum(total)} $unit';
    }
    return 'Plan to Read';
  }

  // 2. Ongoing Serialization formatting
  if (book.isOngoing == true) {
    if (book.latestUnits != null && book.latestUnits! > 0) {
      final latest = book.latestUnits!;
      if (current >= latest) {
        final caughtLabel = compact ? 'Up' : 'Caught Up';
        if (unit == 'chapters') return 'Ch. ${formatNum(current)} • $caughtLabel';
        if (unit == 'volumes') return '${compact ? "V." : "Vol. "}${formatNum(current)} • $caughtLabel';
        if (compact && unit == 'pages') return '${formatNum(current)} pg • $caughtLabel';
        return '${formatNum(current)} $unit • $caughtLabel';
      }
      final behind = (latest - current);
      if (unit == 'chapters') return 'Ch. ${formatNum(current)} (${formatNum(behind)} behind)';
      if (unit == 'volumes') return '${compact ? "V." : "Vol. "}${formatNum(current)} (${formatNum(behind)} behind)';
      if (compact && unit == 'pages') return '${formatNum(current)} pg (${formatNum(behind)} behind)';
      return '${formatNum(current)} $unit (${formatNum(behind)} behind)';
    }

    if (total == null || total <= 0) {
      if (unit == 'chapters') return 'Ch. ${formatNum(current)} (Ongoing)';
      if (unit == 'volumes') return '${compact ? "V." : "Vol. "}${formatNum(current)} (Ongoing)';
      if (compact && unit == 'pages') return '${formatNum(current)} pg (Ongoing)';
      return '${formatNum(current)} $unit (Ongoing)';
    }
  }

  // 3. Multi-tier: Volume -> Chapter
  if (structure == 'volume_chapter') {
    if (unit == 'volumes') {
      if (parentProg != null && parentTot != null) {
        return compact
            ? 'V.${formatNum(parentProg)}/${formatNum(parentTot)}'
            : 'Vol. ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      }
      if (parentTot != null) {
        return compact
            ? 'V.${formatNum(parentProg ?? current)}/${formatNum(parentTot)}'
            : 'Vol. ${formatNum(parentProg ?? current)} / ${formatNum(parentTot)}';
      }
      if (total != null && total > 0) {
        return compact
            ? 'V.${formatNum(current)}/${formatNum(total)}'
            : 'Vol. ${formatNum(current)} / ${formatNum(total)}';
      }
      return compact ? 'V.${formatNum(current)}' : 'Vol. ${formatNum(current)}';
    }

    var volStr = '';
    if (total != null && total > 0) {
      // Continuous chapters across series: volume is milestone marker ("Vol. 1" / "V.1")
      if (parentProg != null) {
        volStr = compact ? 'V.${formatNum(parentProg)}' : 'Vol. ${formatNum(parentProg)}';
      }
    } else {
      // Per-volume reset chapters: volume is main series total ("Vol. 3 / 12" / "V.3/12")
      if (parentProg != null && parentTot != null) {
        volStr = compact
            ? 'V.${formatNum(parentProg)}/${formatNum(parentTot)}'
            : 'Vol. ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      } else if (parentProg != null) {
        volStr = compact ? 'V.${formatNum(parentProg)}' : 'Vol. ${formatNum(parentProg)}';
      } else if (parentTot != null) {
        volStr = compact ? 'V.0/${formatNum(parentTot)}' : 'Vol. 0 / ${formatNum(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = compact ? '${_formatCompactWords(current)} w' : '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = compact ? '${formatNum(current)} pg' : '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      if (unit == 'words' && compact) {
        unitStr += '/${_formatCompactWords(total)}';
      } else {
        unitStr += compact ? '/${formatNum(total)}' : ' / ${formatNum(total)}';
      }
    }

    if (volStr.isNotEmpty && (current > 0 || unit == 'chapters')) {
      return '$volStr • $unitStr';
    }
    if (volStr.isNotEmpty) {
      return volStr;
    }
    return unitStr;
  }

  // 4. Multi-tier: Part -> Chapter
  if (structure == 'part_chapter') {
    final ptPrefix = compact ? 'Pt.' : 'Part';
    var partStr = '';
    if (total != null && total > 0) {
      if (parentProg != null) {
        partStr = '$ptPrefix ${toRoman(parentProg)}';
      }
    } else {
      if (parentProg != null && parentTot != null) {
        partStr = compact
            ? 'Pt. ${toRoman(parentProg)}/${toRoman(parentTot)}'
            : 'Part ${toRoman(parentProg)} / ${toRoman(parentTot)}';
      } else if (parentProg != null) {
        partStr = '$ptPrefix ${toRoman(parentProg)}';
      } else if (parentTot != null) {
        partStr = compact
            ? 'Pt. I/${toRoman(parentTot)}'
            : 'Part I / ${toRoman(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'volumes') {
      unitStr = '${compact ? "V." : "Vol."} ${formatNum(current)}';
    } else if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = compact ? '${_formatCompactWords(current)} w' : '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = compact ? '${formatNum(current)} pg' : '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      if (unit == 'words' && compact) {
        unitStr += '/${_formatCompactWords(total)}';
      } else {
        unitStr += compact ? '/${formatNum(total)}' : ' / ${formatNum(total)}';
      }
    }

    if (partStr.isNotEmpty && (current > 0 || unit == 'chapters' || unit == 'volumes')) {
      return '$partStr • $unitStr';
    }
    if (partStr.isNotEmpty) {
      return partStr;
    }
    return unitStr;
  }

  // 5. Single level
  if (unit == 'chapters') {
    return total != null && total > 0
        ? (compact ? 'Ch. ${formatNum(current)}/${formatNum(total)}' : 'Ch. ${formatNum(current)} / ${formatNum(total)}')
        : 'Ch. ${formatNum(current)}';
  }
  if (unit == 'volumes') {
    return total != null && total > 0
        ? (compact ? 'V.${formatNum(current)}/${formatNum(total)}' : 'Vol. ${formatNum(current)} / ${formatNum(total)}')
        : (compact ? 'V.${formatNum(current)}' : 'Vol. ${formatNum(current)}');
  }
  if (unit == 'words') {
    return total != null && total > 0
        ? (compact ? '${_formatCompactWords(current)}/${_formatCompactWords(total)} w' : '${formatNum(current)} / ${formatNum(total)} words')
        : (compact ? '${_formatCompactWords(current)} w' : '${formatNum(current)} words');
  }
  if (unit == 'percent') {
    return '${formatNum(current)}%';
  }
  if (unit == 'units') {
    return total != null && total > 0
        ? (compact ? '${formatNum(current)}/${formatNum(total)} units' : '${formatNum(current)} / ${formatNum(total)} units')
        : '${formatNum(current)} units';
  }

  // Default: pages
  return total != null && total > 0
      ? (compact ? '${formatNum(current)}/${formatNum(total)} pg' : '${formatNum(current)} / ${formatNum(total)} pages')
      : (compact ? '${formatNum(current)} pg' : '${formatNum(current)} pages');
}

List<int> getQuickChipOptions(String bookType) {
  switch (bookType) {
    case 'Light Novel':
    case 'Web Novel':
    case 'Fanfiction':
    case 'Serial':
      return [1, 2, 5, 10, 20];
    default:
      return [5, 10, 15, 25, 50];
  }
}

String formatRating(double? rating, {bool isDecimalMode = false}) {
  if (rating == null || rating == 0) return 'Unrated';
  if (isDecimalMode) {
    return '${rating.toStringAsFixed(1)} / 5.0';
  }
  return '${rating.toStringAsFixed(1)} ★';
}

final _uuidRandom = Random();

/// Generates a RFC-4122 compliant UUID v4.
String generateUuidV4() {
  final bytes = List<int>.generate(16, (_) => _uuidRandom.nextInt(256));
  // Set version to 0100 (v4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant to 10xx (RFC4122)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}';
}

bool isValidUuid(String? str) {
  if (str == null) return false;
  final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
  return uuidRegex.hasMatch(str);
}

/// Canonical alias mapping to merge synonymous genre tags (e.g. Science Fiction -> Sci-Fi)
const Map<String, String> _genreSynonymMap = {
  'science fiction': 'Sci-Fi',
  'scifi': 'Sci-Fi',
  'sci fi': 'Sci-Fi',
  'sf': 'Sci-Fi',
  'progression': 'Progression Fantasy',
  'progression fantasy': 'Progression Fantasy',
  'lit-rpg': 'LitRPG',
  'lit rpg': 'LitRPG',
  'litrpg': 'LitRPG',
  'gamelit': 'GameLit',
  'non fiction': 'Non-Fiction',
  'non-fiction': 'Non-Fiction',
  'nonfiction': 'Non-Fiction',
  'slice-of-life': 'Slice of Life',
  'slice of life': 'Slice of Life',
  'sol': 'Slice of Life',
  'historical fiction': 'Historical',
  'historical': 'Historical',
  'young adult': 'YA',
  'ya': 'YA',
  'post-apocalyptic': 'Post-Apocalyptic',
  'post apocalyptic': 'Post-Apocalyptic',
  'post apocalypse': 'Post-Apocalyptic',
  'apocalypse': 'Post-Apocalyptic',
  'apocalyptic': 'Post-Apocalyptic',
  'xianxia': 'Cultivation',
  'xuanhuan': 'Cultivation',
  'cultivation': 'Cultivation',
  'wuxia': 'Martial Arts',
  'martial arts': 'Martial Arts',
  'urban fantasy': 'Urban Fantasy',
  'contemporary fantasy': 'Urban Fantasy',
  'grimdark': 'Grimdark',
  'dark fantasy': 'Dark Fantasy',
  'cyberpunk': 'Cyberpunk',
  'steampunk': 'Steampunk',
  'biography': 'Biography & Memoir',
  'autobiography': 'Biography & Memoir',
  'memoir': 'Biography & Memoir',
  'self help': 'Self-Help',
  'self-help': 'Self-Help',
  'psychology': 'Psychology',
  'philosophy': 'Philosophy',
  'classics': 'Classics',
  'classic': 'Classics',
};

/// Expanded canonical default genre seeds covering major reading genres
const List<String> defaultGenreSeeds = [
  'Fantasy',
  'Sci-Fi',
  'Progression Fantasy',
  'LitRPG',
  'Cultivation',
  'Mystery',
  'Thriller',
  'Horror',
  'Romance',
  'Adventure',
  'Slice of Life',
  'Urban Fantasy',
  'Cyberpunk',
  'Post-Apocalyptic',
  'Grimdark',
  'Historical',
  'Classics',
  'Non-Fiction',
  'Biography & Memoir',
  'Philosophy',
  'Self-Help',
];

/// Normalizes a genre tag string, mapping common synonyms/aliases to canonical forms
/// and applying clean Title Case formatting.
String normalizeGenreTag(String rawTag) {
  final trimmed = rawTag.trim();
  if (trimmed.isEmpty) return '';
  final lower = trimmed.toLowerCase();
  if (_genreSynonymMap.containsKey(lower)) {
    return _genreSynonymMap[lower]!;
  }
  // Title Case formatting for unmatched custom tags
  return trimmed.split(' ').map((word) {
    if (word.isEmpty) return '';
    return word[0].toUpperCase() + (word.length > 1 ? word.substring(1).toLowerCase() : '');
  }).join(' ');
}

/// Sanitizes a source or web link, auto-prepending `https://` if a valid domain is entered
/// without a protocol (e.g. `goodreads.com/book/...` -> `https://goodreads.com/book/...`).
String sanitizeSourceLink(String? rawUrl) {
  if (rawUrl == null) return '';
  final trimmed = rawUrl.trim();
  if (trimmed.isEmpty) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return 'https://$trimmed';
}

