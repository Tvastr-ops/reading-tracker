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

/// Formats the progress presentation text matching the web application semantics 1:1.
String formatProgressDisplay(Book book) {
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
        if (parentTot != null && parentTot > 0) return 'Vol. 0 / ${formatNum(parentTot)}';
        if (total != null && total > 0) return 'Vol. 0 / ${formatNum(total)}';
        return 'Vol. 0';
      }
      if (total != null && total > 0 && parentTot != null && parentTot > 0) {
        return '${formatNum(total)} $unit • ${formatNum(parentTot)} vols';
      }
      if (total != null && total > 0) return '${formatNum(total)} $unit';
      if (parentTot != null && parentTot > 0) return '${formatNum(parentTot)} volumes';
      return 'Plan to Read';
    }

    if (structure == 'part_chapter') {
      if (total != null && total > 0 && parentTot != null && parentTot > 0) {
        return '${formatNum(total)} $unit • ${formatNum(parentTot)} parts';
      }
      if (total != null && total > 0) return '${formatNum(total)} $unit';
      if (parentTot != null && parentTot > 0) return '${formatNum(parentTot)} parts';
      return 'Plan to Read';
    }

    // Single structure planned
    if (total != null && total > 0) {
      if (unit == 'chapters') return '0 / ${formatNum(total)} chapters';
      if (unit == 'volumes') return '0 / ${formatNum(total)} volumes';
      return '0 / ${formatNum(total)} $unit';
    }
    return 'Plan to Read';
  }

  // 2. Ongoing Serialization formatting
  if (book.isOngoing == true) {
    if (book.latestUnits != null && book.latestUnits! > 0) {
      final latest = book.latestUnits!;
      if (current >= latest) {
        if (unit == 'chapters') return 'Ch. ${formatNum(current)} • Caught Up';
        if (unit == 'volumes') return 'Vol. ${formatNum(current)} • Caught Up';
        return '${formatNum(current)} $unit • Caught Up';
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
    if (unit == 'volumes') {
      if (parentProg != null && parentTot != null) {
        return 'Vol. ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      }
      if (parentTot != null) {
        return 'Vol. ${formatNum(parentProg ?? current)} / ${formatNum(parentTot)}';
      }
      if (total != null && total > 0) {
        return 'Vol. ${formatNum(current)} / ${formatNum(total)}';
      }
      return 'Vol. ${formatNum(current)}';
    }

    var volStr = '';
    if (total != null && total > 0) {
      // Continuous chapters across series: volume is milestone marker ("Vol. 1")
      if (parentProg != null) {
        volStr = 'Vol. ${formatNum(parentProg)}';
      }
    } else {
      // Per-volume reset chapters: volume is main series total ("Vol. 3 / 12")
      if (parentProg != null && parentTot != null) {
        volStr = 'Vol. ${formatNum(parentProg)} / ${formatNum(parentTot)}';
      } else if (parentProg != null) {
        volStr = 'Vol. ${formatNum(parentProg)}';
      } else if (parentTot != null) {
        volStr = 'Vol. 0 / ${formatNum(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      unitStr += ' / ${formatNum(total)}';
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
    var partStr = '';
    if (total != null && total > 0) {
      if (parentProg != null) {
        partStr = 'Part ${toRoman(parentProg)}';
      }
    } else {
      if (parentProg != null && parentTot != null) {
        partStr = 'Part ${toRoman(parentProg)} / ${toRoman(parentTot)}';
      } else if (parentProg != null) {
        partStr = 'Part ${toRoman(parentProg)}';
      } else if (parentTot != null) {
        partStr = 'Part I / ${toRoman(parentTot)}';
      }
    }

    var unitStr = '';
    if (unit == 'volumes') {
      unitStr = 'Vol. ${formatNum(current)}';
    } else if (unit == 'chapters') {
      unitStr = 'Ch. ${formatNum(current)}';
    } else if (unit == 'words') {
      unitStr = '${formatNum(current)} words';
    } else if (unit == 'percent') {
      unitStr = '${formatNum(current)}%';
    } else if (unit == 'units') {
      unitStr = '${formatNum(current)} units';
    } else {
      unitStr = '${formatNum(current)} pages';
    }

    if (total != null && total > 0) {
      unitStr += ' / ${formatNum(total)}';
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
    return total != null && total > 0
        ? 'Vol. ${formatNum(current)} / ${formatNum(total)}'
        : 'Vol. ${formatNum(current)}';
  }
  if (unit == 'words') {
    return total != null && total > 0
        ? '${formatNum(current)} / ${formatNum(total)} words'
        : '${formatNum(current)} words';
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
