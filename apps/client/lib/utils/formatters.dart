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

/// Returns a concise, standardized neo-brutalist shorthand for publication formats.
String getFormatShorthand(String bookType) {
  switch (bookType.toLowerCase()) {
    case 'novel':
      return 'NOV';
    case 'novella':
      return 'NVLA';
    case 'novelette':
      return 'NVLT';
    case 'light novel':
      return 'LN';
    case 'web novel':
      return 'WN';
    case 'short story':
      return 'SS';
    case 'collection':
      return 'COLL';
    case 'anthology':
      return 'ANTH';
    case 'essay':
      return 'ESY';
    case 'fanfiction':
      return 'FF';
    case 'other':
      return 'OTH';
    default:
      return bookType.toUpperCase();
  }
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

  // 1. Status-Aware Planned Scope Presentation (e.g. "1316 pages", "454 chapters", "155 chapters • 18 vols")
  if (isPlanned && current == 0 && (parentProg == null || parentProg == 0)) {
    if (structure == 'volume_chapter') {
      if (unit == 'volumes') {
        if (parentTot != null && parentTot > 0) return '${compact ? "V." : "Vol."} 0 / ${formatNum(parentTot)}';
        if (total != null && total > 0) return '${compact ? "V." : "Vol."} 0 / ${formatNum(total)}';
        return '${compact ? "V." : "Vol."} 0';
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
      if (unit == 'chapters') return '0 / ${formatNum(total)} ${compact ? "ch" : "chapters"}';
      if (unit == 'volumes') return '0 / ${formatNum(total)} ${compact ? "vol" : "volumes"}';
      if (compact && unit == 'pages') return '0 / ${formatNum(total)} p';
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
        if (unit == 'volumes') return 'Vol. ${formatNum(current)} • $caughtLabel';
        return '${formatNum(current)} $unit • $caughtLabel';
      }
      final behind = (latest - current);
      if (unit == 'chapters') return 'Ch. ${formatNum(current)} (${formatNum(behind)} behind)';
      if (unit == 'volumes') return 'Vol. ${formatNum(current)} (${formatNum(behind)} behind)';
      return '${formatNum(current)} $unit (${formatNum(behind)} behind)';
    }

    if (total == null || total <= 0) {
      if (unit == 'chapters') return 'Ch. ${formatNum(current)} (Ongoing)';
      if (unit == 'volumes') return 'Vol. ${formatNum(current)} (Ongoing)';
      return '${formatNum(current)} $unit (Ongoing)';
    }
  }

  // 3. Multi-tier: Volume -> Chapter
  if (structure == 'volume_chapter') {
    final vPrefix = compact ? 'V.' : 'Vol.';
    if (unit == 'volumes') {
      if (parentProg != null && parentTot != null) {
        return '$vPrefix ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      }
      if (parentTot != null) {
        return '$vPrefix ${formatNum(parentProg ?? current)} / ${formatNum(parentTot)}';
      }
      if (total != null && total > 0) {
        return '$vPrefix ${formatNum(current)} / ${formatNum(total)}';
      }
      return '$vPrefix ${formatNum(current)}';
    }

    var volStr = '';
    if (total != null && total > 0) {
      // Continuous chapters across series: volume is milestone marker ("Vol. 1" / "V.1")
      if (parentProg != null) {
        volStr = '$vPrefix ${formatNum(parentProg)}';
      }
    } else {
      // Per-volume reset chapters: volume is main series total ("Vol. 3 / 12" / "V.3/12")
      if (parentProg != null && parentTot != null) {
        volStr = compact
            ? 'V.${formatNum(parentProg)}/${formatNum(parentTot)}'
            : 'Vol. ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      } else if (parentProg != null) {
        volStr = '$vPrefix ${formatNum(parentProg)}';
      } else if (parentTot != null) {
        volStr = '$vPrefix 0 / ${formatNum(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = compact ? '${formatNum(current)} w' : '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = compact ? '${formatNum(current)} p' : '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      unitStr += compact ? '/${formatNum(total)}' : ' / ${formatNum(total)}';
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
        partStr = '$ptPrefix ${toRoman(parentProg)} / ${toRoman(parentTot)}';
      } else if (parentProg != null) {
        partStr = '$ptPrefix ${toRoman(parentProg)}';
      } else if (parentTot != null) {
        partStr = '$ptPrefix I / ${toRoman(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'volumes') {
      unitStr = '${compact ? "V." : "Vol."} ${formatNum(current)}';
    } else if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = compact ? '${formatNum(current)} w' : '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = compact ? '${formatNum(current)} p' : '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      unitStr += compact ? '/${formatNum(total)}' : ' / ${formatNum(total)}';
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
        ? 'Ch. ${formatNum(current)} / ${formatNum(total)}'
        : 'Ch. ${formatNum(current)}';
  }
  if (unit == 'volumes') {
    final vPrefix = compact ? 'V.' : 'Vol.';
    return total != null && total > 0
        ? '$vPrefix ${formatNum(current)} / ${formatNum(total)}'
        : '$vPrefix ${formatNum(current)}';
  }
  if (unit == 'words') {
    return total != null && total > 0
        ? '${formatNum(current)} / ${formatNum(total)} ${compact ? "w" : "words"}'
        : '${formatNum(current)} ${compact ? "w" : "words"}';
  }
  if (unit == 'percent') {
    return '${formatNum(current)}%';
  }
  if (unit == 'units') {
    return total != null && total > 0
        ? '${formatNum(current)} / ${formatNum(total)} units'
        : '${formatNum(current)} units';
  }

  // Default: pages
  if (compact) {
    return total != null && total > 0
        ? '${formatNum(current)} / ${formatNum(total)} p'
        : '${formatNum(current)} p';
  }
  return total != null && total > 0
      ? '${formatNum(current)} / ${formatNum(total)} pages'
      : '${formatNum(current)} pages';
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
