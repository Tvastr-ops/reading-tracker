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

class _SeriesStackCardState extends State<SeriesStackCard> {
  int _selectedVolIndex = 0;
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

    if (sortedBooks.isEmpty) {
      return const SizedBox.shrink();
    }

    final totalVolumes = sortedBooks.length;
    final completedVolumes = sortedBooks.where((b) => b.status == BookStatus.completed).length;
    final readingBooks = sortedBooks.where((b) => b.status == BookStatus.reading).toList();

    // Default to active reading volume or selected volume
    final activeIndex = (_selectedVolIndex >= 0 && _selectedVolIndex < sortedBooks.length)
        ? _selectedVolIndex
        : (readingBooks.isNotEmpty
            ? sortedBooks.indexOf(readingBooks.first)
            : 0);

    final activeBook = sortedBooks[activeIndex.clamp(0, sortedBooks.length - 1)];
    final seriesProgressPct = totalVolumes > 0 ? (completedVolumes / totalVolumes) : 0.0;
    final seriesProgressInt = (seriesProgressPct * 100).toInt();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          // 1. Top Ribbon: Series Pill + Read Count
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
              border: Border(
                bottom: BorderSide(color: borderColor, width: 1.5),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.collections_bookmark_rounded, size: 14, color: accentColor),
                    const SizedBox(width: 6),
                    Text(
                      'SERIES • $totalVolumes VOLUMES',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: accentColor,
                      ),
                    ),
                  ],
                ),
                Text(
                  '$completedVolumes/$totalVolumes READ ($seriesProgressInt%)',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: inkColor.withValues(alpha: 0.75),
                  ),
                ),
              ],
            ),
          ),

          // 2. Active Volume Overview (Cover + Info)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Active Volume Cover Thumbnail
                GestureDetector(
                  onTap: () => widget.onBookTap(activeBook),
                  child: Container(
                    width: 68,
                    height: 98,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                      border: Border.all(color: borderColor, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: borderColor,
                          offset: const Offset(2, 2),
                          blurRadius: 0,
                        ),
                      ],
                    ),
                    child: activeBook.coverUrl != null && activeBook.coverUrl!.isNotEmpty
                        ? Image.network(
                            activeBook.coverUrl!,
                            fit: BoxFit.cover,
                            cacheWidth: 240,
                            errorBuilder: (_, __, ___) => _buildCoverFallback(activeBook, accentColor),
                          )
                        : _buildCoverFallback(activeBook, accentColor),
                  ),
                ),

                // Active Volume Metadata & Actions
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.seriesName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: inkColor,
                        ),
                      ),
                      if (activeBook.author != null && activeBook.author!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          activeBook.author!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: mutedInk,
                          ),
                        ),
                      ],
                      const SizedBox(height: 6),

                      // Active Volume Subtitle & Status
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: _getStatusBg(activeBook.status, accentColor, isDark),
                              border: Border.all(color: borderColor.withValues(alpha: 0.5), width: 1),
                            ),
                            child: Text(
                              activeBook.status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w900,
                                color: activeBook.status == BookStatus.reading ? Colors.white : inkColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Vol ${activeBook.seriesOrder != null ? formatNum(activeBook.seriesOrder!) : (activeIndex + 1)}: ${activeBook.title}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: inkColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Active Book Progress Bar
                      ClipRRect(
                        borderRadius: BorderRadius.zero,
                        child: LinearProgressIndicator(
                          value: (activeBook.completionPercentage / 100).clamp(0.0, 1.0),
                          minHeight: 6,
                          backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
                          valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            formatProgressDisplay(activeBook),
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: mutedInk),
                          ),
                          Text(
                            '${activeBook.completionPercentage.toInt()}%',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: accentColor),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 3. Quick Volume Chip Switcher Strip
          Container(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: borderColor.withValues(alpha: 0.3), width: 1),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'VOLUMES IN SERIES',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: mutedInk,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _isExpanded = !_isExpanded),
                      child: Row(
                        children: [
                          Text(
                            _isExpanded ? 'HIDE' : 'VIEW ALL ($totalVolumes)',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                              color: accentColor,
                              letterSpacing: 0.3,
                            ),
                          ),
                          Icon(
                            _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                            size: 14,
                            color: accentColor,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: List.generate(sortedBooks.length, (vIdx) {
                      final vol = sortedBooks[vIdx];
                      final isSel = vIdx == activeIndex;
                      final isDone = vol.status == BookStatus.completed;
                      final isReading = vol.status == BookStatus.reading;

                      return GestureDetector(
                        onTap: () => setState(() => _selectedVolIndex = vIdx),
                        child: Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSel
                                ? accentColor
                                : (isReading
                                    ? accentColor.withValues(alpha: 0.15)
                                    : (isDark ? AppColors.darkSurfaceHigh : Colors.white)),
                            border: Border.all(
                              color: isSel ? accentColor : borderColor.withValues(alpha: 0.5),
                              width: isSel ? 1.5 : 1.0,
                            ),
                          ),
                          child: Text(
                            '${isDone ? "✓ " : ""}Vol ${vol.seriesOrder != null ? formatNum(vol.seriesOrder!) : (vIdx + 1)}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: isSel
                                  ? Colors.white
                                  : (isReading ? accentColor : inkColor),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
          ),

          // 4. Expandable Full Volume List
          if (_isExpanded)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh.withValues(alpha: 0.5) : AppColors.paperSurface.withValues(alpha: 0.5),
                border: Border(
                  top: BorderSide(color: borderColor.withValues(alpha: 0.3), width: 1),
                ),
              ),
              child: Column(
                children: List.generate(sortedBooks.length, (vIdx) {
                  final vol = sortedBooks[vIdx];
                  final isSel = vIdx == activeIndex;

                  return Container(
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSel ? accentColor.withValues(alpha: 0.08) : cardHighBg,
                      border: Border.all(
                        color: isSel ? accentColor : borderColor.withValues(alpha: 0.3),
                        width: isSel ? 1.5 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '#${vol.seriesOrder != null ? formatNum(vol.seriesOrder!) : (vIdx + 1)}',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: mutedInk),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => widget.onBookTap(vol),
                            child: Text(
                              vol.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                color: isSel ? accentColor : inkColor,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: () => widget.onLogProgress(vol),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: accentColor,
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: const Text(
                              'LOG',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),

          // 5. Bottom Series Progress Bar
          LinearProgressIndicator(
            value: seriesProgressPct.clamp(0.0, 1.0),
            minHeight: 4,
            backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
            valueColor: AlwaysStoppedAnimation<Color>(accentColor),
          ),
        ],
      ),
    );
  }

  Color _getStatusBg(String status, Color accentColor, bool isDark) {
    switch (status) {
      case BookStatus.reading:
        return accentColor;
      case BookStatus.completed:
        return const Color(0xFF10B981);
      case BookStatus.onHold:
        return const Color(0xFFF59E0B);
      case BookStatus.dropped:
        return AppColors.primaryRed;
      default:
        return isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHighest;
    }
  }

  Widget _buildCoverFallback(Book b, Color accentColor) {
    return Container(
      color: accentColor.withValues(alpha: 0.12),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.auto_stories_rounded, size: 18, color: accentColor),
          const SizedBox(height: 2),
          Text(
            b.title.isNotEmpty ? b.title.substring(0, 1).toUpperCase() : '?',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: accentColor),
          ),
        ],
      ),
    );
  }
}
