import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/book.dart';
import '../services/theme_service.dart';
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
    final isCompact = ThemeService.instance.compactMode;
    final coverWidth = isCompact ? 50.0 : 60.0;
    final coverHeight = isCompact ? 76.0 : 90.0;
    final cardPadding = isCompact ? const EdgeInsets.all(10) : const EdgeInsets.all(12);

    return BrutalistCard(
      margin: EdgeInsets.zero,
      padding: cardPadding,
      onTap: onEdit,
      onSecondaryTapDown: onContextMenu != null ? (d) => onContextMenu!(d) : null,
      borderColor: isSelected ? accentColor : null,
      borderWidth: isSelected ? 2.5 : AppTheme.borderLight,
      shadowOffset: isSelected ? const Offset(4.0, 4.0) : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Row: Cover + Details
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cover
              Container(
                width: coverWidth,
                height: coverHeight,
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
              const SizedBox(width: 10),

              // Title, Author, Tags
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      book.title.toUpperCase(),
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: isCompact ? 13.5 : 15.0,
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
                          fontSize: 11.5,
                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 6),

                    // Badges
                    Wrap(
                      spacing: 5,
                      runSpacing: 3,
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

          // Bottom Section: Progress + Action Footer
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Progress section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      formatProgressDisplay(book).toUpperCase(),
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${book.completionPercentage.toInt()}%',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).extension<AppThemeDetails>()?.accentColor ?? Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              BrutalistProgressBar(progress: progressFraction, height: isCompact ? 3.5 : 4.0),
              SizedBox(height: isCompact ? 6 : 8),

              // Quick Action Footer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Quick Increment Chips
                  Row(
                    children: getQuickChipOptions(book.type).take(3).map((amt) {
                      return Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => onQuickIncrement(amt.toDouble()),
                            child: Container(
                              constraints: BoxConstraints(minWidth: isCompact ? 30 : 36, minHeight: isCompact ? 26 : 30),
                              padding: EdgeInsets.symmetric(horizontal: isCompact ? 6 : 8, vertical: isCompact ? 3 : 4),
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
                                style: TextStyle(fontSize: isCompact ? 9.5 : 10.5, fontWeight: FontWeight.w900),
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
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                        icon: Icon(
                          book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          color: book.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                          size: 18,
                        ),
                        tooltip: book.isFavorite == true ? 'Unmark Favorite' : 'Mark as Favorite',
                        onPressed: onToggleFavorite,
                      ),
                      const SizedBox(width: 2),
                      BrutalistButton(
                        padding: EdgeInsets.symmetric(horizontal: isCompact ? 10 : 12, vertical: isCompact ? 5 : 7),
                        backgroundColor: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                        textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        onPressed: onLogProgress,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.edit_note_rounded,
                              size: isCompact ? 15 : 17,
                              color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              'LOG',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: isCompact ? 11 : 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
