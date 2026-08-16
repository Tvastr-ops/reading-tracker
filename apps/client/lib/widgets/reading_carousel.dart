import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class ReadingCarousel extends StatelessWidget {
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
  Widget build(BuildContext context) {
    if (readingBooks.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_stories_rounded, size: 16, color: AppColors.primaryRed),
                  SizedBox(width: 6),
                  Text(
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
                  color: AppColors.primaryRed,
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Text(
                  '${readingBooks.length} ACTIVE',
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
        SizedBox(
          height: 155,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            itemCount: readingBooks.length,
            itemBuilder: (context, index) {
              final book = readingBooks[index];
              final quickOptions = getQuickChipOptions(book.type).take(2).toList();

              return Container(
                width: 290,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
                  boxShadow: [
                    BoxShadow(
                      color: borderColor,
                      offset: AppTheme.shadowOffsetSm,
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Cover Thumbnail
                    GestureDetector(
                      onTap: () => onEdit(book),
                      child: Container(
                        width: 70,
                        height: double.infinity,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                          border: Border.all(color: borderColor, width: 1.5),
                        ),
                        child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                            ? Image.network(
                                book.coverUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.auto_stories_rounded, size: 24),
                              )
                            : const Icon(Icons.auto_stories_rounded, size: 24),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Info and Steppers
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          GestureDetector(
                            onTap: () => onEdit(book),
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
                            fillColor: AppColors.primaryRed,
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: quickOptions.map((amt) {
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 4),
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: () => onQuickIncrement(book, amt.toDouble()),
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
                              BrutalistButton(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                backgroundColor: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                                textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                onPressed: () => onLogProgress(book),
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
            },
          ),
        ),
        const SizedBox(height: 6),
      ],
    );
  }
}
