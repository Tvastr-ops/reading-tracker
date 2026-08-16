import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class ReadingCarousel extends StatefulWidget {
  final List<Book> readingBooks;
  final Function(Book) onLogProgress;
  final Function(Book) onEdit;
  final Function(Book, double) onQuickIncrement;

  const ReadingCarousel({
    super.key,
    required this.readingBooks,
    required this.onLogProgress,
    required this.onEdit,
    required this.onQuickIncrement,
  });

  @override
  State<ReadingCarousel> createState() => _ReadingCarouselState();
}

class _ReadingCarouselState extends State<ReadingCarousel> {
  late PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.90);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.readingBooks.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final total = widget.readingBooks.length;

    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row with Title and Dynamic Snapping Index Badge
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.auto_stories_rounded, size: 16, color: accentColor),
                    const SizedBox(width: 6),
                    const Text(
                      'CURRENTLY READING',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: accentColor,
                    border: Border.all(color: borderColor, width: 1),
                  ),
                  child: Text(
                    total > 1 ? '${_currentPage + 1} / $total' : '$total ACTIVE',
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Adaptive Carousel: Hero Layout for 1 book, Snap PageView for 2+ books
          if (total == 1)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildBookCard(
                widget.readingBooks.first,
                isDark: isDark,
                borderColor: borderColor,
                accentColor: accentColor,
                details: details,
                isHero: true,
              ),
            )
          else
            SizedBox(
              height: 156,
              child: PageView.builder(
                controller: _pageController,
                itemCount: total,
                onPageChanged: (idx) => setState(() => _currentPage = idx),
                padEnds: false,
                itemBuilder: (context, index) {
                  final book = widget.readingBooks[index];
                  return Padding(
                    padding: EdgeInsets.only(
                      left: index == 0 ? 16 : 6,
                      right: index == total - 1 ? 16 : 6,
                    ),
                    child: _buildBookCard(
                      book,
                      isDark: isDark,
                      borderColor: borderColor,
                      accentColor: accentColor,
                      details: details,
                      isHero: false,
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBookCard(
    Book book, {
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required AppThemeDetails? details,
    required bool isHero,
  }) {
    final quickOptions = getQuickChipOptions(book.type).take(2).toList();

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white),
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffsetSm ?? AppTheme.shadowOffsetSm,
            blurRadius: 0,
          ),
        ],
      ),
      child: Row(
        children: [
          // Cover Thumbnail (Tapping opens Quick Log directly)
          GestureDetector(
            onTap: () => widget.onLogProgress(book),
            child: Container(
              width: isHero ? 78 : 70,
              height: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (book.coverUrl != null && book.coverUrl!.isNotEmpty)
                    Image.network(
                      book.coverUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.auto_stories_rounded, size: 24),
                    )
                  else
                    const Icon(Icons.auto_stories_rounded, size: 24),
                  Positioned(
                    bottom: 2,
                    right: 2,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: accentColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.edit_note_rounded, size: 10, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Info, Progress & Action Steppers
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => widget.onEdit(book),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        book.title.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        formatProgressDisplay(book),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                BrutalistProgressBar(
                  progress: book.completionPercentage / 100.0,
                  height: 5,
                  fillColor: accentColor,
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Quick Increment Chips
                    Row(
                      children: quickOptions.map((amt) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => widget.onQuickIncrement(book, amt.toDouble()),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                                  border: Border.all(color: borderColor, width: 1),
                                ),
                                child: Text(
                                  '+$amt',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    // Direct Log Button
                    BrutalistButton(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                      backgroundColor: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                      textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      onPressed: () => widget.onLogProgress(book),
                      child: const Text('LOG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
