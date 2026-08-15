import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class BookCard extends StatelessWidget {
  final Book book;
  final VoidCallback onLogProgress;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final Function(double) onQuickIncrement;

  const BookCard({
    super.key,
    required this.book,
    required this.onLogProgress,
    required this.onEdit,
    required this.onDelete,
    required this.onQuickIncrement,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progressFraction = (book.completionPercentage / 100).clamp(0.0, 1.0);

    return BrutalistCard(
      onTap: onEdit,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row: Cover + Details
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cover
              Container(
                width: 60,
                height: 90,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                  border: Border.all(
                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                    width: 1.5,
                  ),
                ),
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(
                        book.coverUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildPlaceholderIcon(),
                      )
                    : _buildPlaceholderIcon(),
              ),
              const SizedBox(width: 12),

              // Title, Author, Tags
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      book.title.toUpperCase(),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (book.author != null && book.author!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        book.author!,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),

                    // Badges
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        BrutalistBadge(label: book.type),
                        if (book.isOngoing == true)
                          const BrutalistBadge(
                            label: 'ONGOING',
                            backgroundColor: AppColors.skyBlue,
                            textColor: Colors.white,
                          ),
                        if (book.rating != null && book.rating! > 0)
                          BrutalistBadge(
                            label: '${book.rating!.toStringAsFixed(1)} ★',
                            backgroundColor: AppColors.paperSurfaceHighest,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Progress section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatProgressDisplay(book).toUpperCase(),
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
              ),
              Text(
                '${book.completionPercentage.toInt()}%',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.primaryRed),
              ),
            ],
          ),
          const SizedBox(height: 6),
          BrutalistProgressBar(progress: progressFraction),
          const SizedBox(height: 12),

          // Quick Action Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Quick Increment Chips
              Row(
                children: getQuickChipOptions(book.type).take(3).map((amt) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: GestureDetector(
                      onTap: () => onQuickIncrement(amt.toDouble()),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                          border: Border.all(
                            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          '+$amt',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Action Buttons
              Row(
                children: [
                  BrutalistButton(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    backgroundColor: Colors.white,
                    textColor: AppColors.inkBlack,
                    onPressed: onLogProgress,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_note_rounded, size: 16, color: AppColors.inkBlack),
                        SizedBox(width: 4),
                        Text('LOG'),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  BrutalistButton(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    backgroundColor: AppColors.primaryRed,
                    textColor: Colors.white,
                    onPressed: onEdit,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.more_horiz_rounded, size: 16, color: Colors.white),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholderIcon() {
    return const Center(
      child: Icon(Icons.book_rounded, color: AppColors.inkMuted, size: 28),
    );
  }
}
