import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

class SeriesStackCard extends StatefulWidget {
  final String seriesName;
  final List<Book> books;
  final Function(Book) onBookTap;
  final Function(Book) onLogProgress;
  final Function(Book) onEdit;
  final Function(Book)? onDelete;
  final Function(Book, String)? onStatusChange;

  const SeriesStackCard({
    super.key,
    required this.seriesName,
    required this.books,
    required this.onBookTap,
    required this.onLogProgress,
    required this.onEdit,
    this.onDelete,
    this.onStatusChange,
  });

  @override
  State<SeriesStackCard> createState() => _SeriesStackCardState();
}

class _SeriesStackCardState extends State<SeriesStackCard> with SingleTickerProviderStateMixin {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final cardBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final cardHighBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;

    // Sort books by seriesOrder or title
    final sortedBooks = List<Book>.from(widget.books)..sort((a, b) {
      if (a.seriesOrder != null && b.seriesOrder != null) {
        return a.seriesOrder!.compareTo(b.seriesOrder!);
      }
      if (a.seriesOrder != null) return -1;
      if (b.seriesOrder != null) return 1;
      return a.title.compareTo(b.title);
    });

    final totalVolumes = sortedBooks.length;
    final completedVolumes = sortedBooks.where((b) => b.status == BookStatus.completed).length;
    final readingBooks = sortedBooks.where((b) => b.status == BookStatus.reading).toList();
    final activeBook = readingBooks.isNotEmpty ? readingBooks.first : sortedBooks.first;

    final progressPct = totalVolumes > 0 ? (completedVolumes / totalVolumes) : 0.0;
    final seriesCover = sortedBooks.firstWhere(
      (b) => b.coverUrl != null && b.coverUrl!.isNotEmpty,
      orElse: () => activeBook,
    ).coverUrl;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Background Layer 2 (3D stacked deck effect)
          if (totalVolumes > 2)
            Positioned(
              top: 6,
              left: 6,
              right: -6,
              bottom: -6,
              child: Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh.withValues(alpha: 0.5) : AppColors.paperSurfaceHigh,
                  border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1.5),
                ),
              ),
            ),

          // Background Layer 1 (3D stacked deck effect)
          if (totalVolumes > 1)
            Positioned(
              top: 3,
              left: 3,
              right: -3,
              bottom: -3,
              child: Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                  border: Border.all(color: borderColor.withValues(alpha: 0.7), width: 1.5),
                ),
              ),
            ),

          // Foreground Interactive Card
          Container(
            decoration: BoxDecoration(
              color: cardBg,
              border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
              boxShadow: [
                BoxShadow(
                  color: isDark ? Colors.black.withValues(alpha: 0.6) : borderColor,
                  offset: isDark ? const Offset(2, 2) : (details?.shadowOffset ?? AppTheme.shadowOffset),
                  blurRadius: isDark ? 3 : 0,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Header Banner
                InkWell(
                  onTap: () => setState(() => _isExpanded = !_isExpanded),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Series Cover Thumbnail
                        if (seriesCover != null && seriesCover.isNotEmpty)
                          Container(
                            width: 48,
                            height: 68,
                            margin: const EdgeInsets.only(right: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: borderColor, width: 1.5),
                              color: cardHighBg,
                            ),
                            child: Image.network(
                              seriesCover,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Center(
                                child: Icon(Icons.auto_stories_rounded, size: 20, color: mutedInk),
                              ),
                            ),
                          )
                        else
                          Container(
                            width: 48,
                            height: 68,
                            margin: const EdgeInsets.only(right: 12),
                            decoration: BoxDecoration(
                              border: Border.all(color: borderColor, width: 1.5),
                              color: cardHighBg,
                            ),
                            child: Center(
                              child: Icon(Icons.collections_bookmark_rounded, size: 24, color: accentColor),
                            ),
                          ),

                        // Series Info & Progress
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: accentColor,
                                      border: Border.all(color: borderColor, width: 1),
                                    ),
                                    child: Text(
                                      'SERIES • $totalVolumes VOLS',
                                      style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  Icon(
                                    _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                    size: 20,
                                    color: inkColor,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.seriesName,
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                  color: inkColor,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                readingBooks.isNotEmpty
                                    ? 'Currently on ${activeBook.seriesOrder != null ? "Vol. ${formatNum(activeBook.seriesOrder!)}" : activeBook.title}'
                                    : (completedVolumes == totalVolumes ? 'Series Complete' : '$completedVolumes of $totalVolumes volumes finished'),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: mutedInk,
                                ),
                              ),
                              const SizedBox(height: 8),

                              // Progress Bar
                              Row(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.zero,
                                      child: Container(
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: cardHighBg,
                                          border: Border.all(color: borderColor.withValues(alpha: 0.3), width: 1),
                                        ),
                                        child: FractionallySizedBox(
                                          alignment: Alignment.centerLeft,
                                          widthFactor: progressPct.clamp(0.0, 1.0),
                                          child: Container(color: accentColor),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    '${(progressPct * 100).toInt()}%',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: inkColor,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Expandable Volume Breakdown List
                if (_isExpanded) ...[
                  Container(
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: borderColor.withValues(alpha: 0.25), width: 1.5)),
                      color: cardHighBg.withValues(alpha: 0.4),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Column(
                      children: sortedBooks.map((book) {
                        final isFinished = book.status == BookStatus.completed;
                        final isReading = book.status == BookStatus.reading;
                        final unitLabel = getUnitLabel(book.type, book.unitType);

                        return InkWell(
                          onTap: () => widget.onBookTap(book),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: borderColor.withValues(alpha: 0.15), width: 1),
                              ),
                            ),
                            child: Row(
                              children: [
                                // Order Badge / Number
                                Container(
                                  width: 32,
                                  alignment: Alignment.center,
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isFinished
                                        ? AppColors.successGreen.withValues(alpha: 0.2)
                                        : (isReading ? accentColor.withValues(alpha: 0.15) : cardBg),
                                    border: Border.all(
                                      color: isFinished ? AppColors.successGreen : borderColor.withValues(alpha: 0.4),
                                      width: 1,
                                    ),
                                  ),
                                  child: Text(
                                    book.seriesOrder != null ? '#${formatNum(book.seriesOrder!)}' : '•',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: isFinished ? AppColors.successGreen : inkColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Book Title & Sub-Progress
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        book.title,
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w800,
                                          color: inkColor,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 1),
                                      Text(
                                        book.totalUnits != null
                                            ? '${formatNum(book.progress)} / ${formatNum(book.totalUnits!)} $unitLabel'
                                            : '${formatNum(book.progress)} $unitLabel',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: mutedInk,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Status Indicator Pill
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: getStatusColor(book.status).withValues(alpha: 0.15),
                                    border: Border.all(color: getStatusColor(book.status), width: 1),
                                  ),
                                  child: Text(
                                    book.status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w900,
                                      color: getStatusColor(book.status),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Quick Log Button
                                GestureDetector(
                                  onTap: () => widget.onLogProgress(book),
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: cardBg,
                                      border: Border.all(color: borderColor, width: 1.2),
                                    ),
                                    child: Icon(Icons.add_rounded, size: 14, color: inkColor),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color getStatusColor(String status) {
    switch (status) {
      case BookStatus.completed:
        return AppColors.successGreen;
      case BookStatus.reading:
        return AppColors.electricCobalt;
      case BookStatus.onHold:
        return AppColors.warningAmber;
      case BookStatus.dropped:
        return AppColors.primaryRed;
      default:
        return AppColors.inkMuted;
    }
  }
}
