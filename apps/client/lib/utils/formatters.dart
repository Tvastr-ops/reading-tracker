import '../models/book.dart';

String getUnitLabel(String bookType, [String? unitType]) {
  if (unitType != null && unitType.isNotEmpty) {
    return unitType;
  }
  switch (bookType) {
    case 'Light Novel':
    case 'Web Novel':
    case 'Serial':
    case 'Non-Fiction':
      return 'chapters';
    default:
      return 'pages';
  }
}

String formatProgressDisplay(Book book) {
  final unit = getUnitLabel(book.type, book.unitType);

  // Multi-tier progress: Volume -> Chapter
  if (book.progressStructure == 'volume_chapter' && book.parentProgress != null) {
    final volStr = 'Vol. ${book.parentProgress}${book.parentTotal != null ? '/${book.parentTotal}' : ''}';
    final chStr = 'Ch. ${book.progress.toInt()}${book.totalUnits != null ? '/${book.totalUnits!.toInt()}' : ''}';
    return '$volStr $chStr';
  }

  // Multi-tier progress: Part -> Chapter
  if (book.progressStructure == 'part_chapter' && book.parentProgress != null) {
    final partStr = 'Part ${book.parentProgress}${book.parentTotal != null ? '/${book.parentTotal}' : ''}';
    final chStr = 'Ch. ${book.progress.toInt()}${book.totalUnits != null ? '/${book.totalUnits!.toInt()}' : ''}';
    return '$partStr $chStr';
  }

  // Ongoing serialization caught up check
  if (book.isOngoing == true && book.latestUnits != null) {
    if (book.progress >= book.latestUnits!) {
      return 'Caught Up (Ch. ${book.progress.toInt()})';
    }
    return 'Ch. ${book.progress.toInt()} (Latest: ${book.latestUnits!.toInt()})';
  }

  final totalStr = book.totalUnits != null
      ? ' / ${book.totalUnits! % 1 == 0 ? book.totalUnits!.toInt() : book.totalUnits}'
      : '';
  final progStr = book.progress % 1 == 0 ? book.progress.toInt().toString() : book.progress.toString();

  if (book.type == 'Light Novel' || book.type == 'Web Novel' || book.type == 'Serial') {
    return 'Ch. $progStr$totalStr';
  }
  return '$progStr$totalStr $unit';
}

List<int> getQuickChipOptions(String bookType) {
  switch (bookType) {
    case 'Light Novel':
    case 'Web Novel':
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
