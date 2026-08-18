import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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
  final VoidCallback? onToggleFavorite;
  final void Function(TapDownDetails details)? onContextMenu;
  final bool isSelected;

  const BookCard({
    super.key,
    required this.book,
    required this.onLogProgress,
    required this.onEdit,
    required this.onDelete,
    required this.onQuickIncrement,
    this.onToggleFavorite,
    this.onContextMenu,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final progressFraction = (book.completionPercentage / 100).clamp(0.0, 1.0);

    return BrutalistCard(
      onTap: onEdit,
      onSecondaryTapDown: onContextMenu != null ? (d) => onContextMenu!(d) : null,
      borderColor: isSelected ? accentColor : null,
      borderWidth: isSelected ? 2.5 : AppTheme.borderLight,
      shadowOffset: isSelected ? const Offset(4.0, 4.0) : null,
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
                            backgroundColor: const Color(0xFFFFB800),
                            textColor: AppColors.inkBlack,
                          ),
                        if (book.dateStarted != null || book.dateFinished != null) ...[
                          BrutalistBadge(
                            label: book.dateFinished != null
                                ? 'FIN: ${DateFormat('MMM d').format(DateTime.tryParse(book.dateFinished!) ?? DateTime.now())}'
                                : 'STR: ${DateFormat('MMM d').format(DateTime.tryParse(book.dateStarted!) ?? DateTime.now())}',
                            backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
                            textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                          ),
                        ],
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
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).extension<AppThemeDetails>()?.accentColor ?? Theme.of(context).colorScheme.primary,
                ),
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
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => onQuickIncrement(amt.toDouble()),
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 38, minHeight: 32),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                            border: Border.all(
                              color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                offset: const Offset(1.5, 1.5),
                                blurRadius: 0,
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '+$amt',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Action Buttons (Favorite + Log Progress)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    icon: Icon(
                      book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      color: book.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                      size: 20,
                    ),
                    tooltip: book.isFavorite == true ? 'Unmark Favorite' : 'Mark as Favorite',
                    onPressed: onToggleFavorite,
                  ),
                  const SizedBox(width: 4),
                  BrutalistButton(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    backgroundColor: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                    textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                    onPressed: onLogProgress,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.edit_note_rounded,
                          size: 17,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                        const SizedBox(width: 4),
                        const Text('LOG', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
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
