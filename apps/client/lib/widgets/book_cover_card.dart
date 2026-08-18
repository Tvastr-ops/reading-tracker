import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class BookCoverCard extends StatelessWidget {
  final Book book;
  final VoidCallback onLogProgress;
  final VoidCallback onEdit;
  final Function(double) onQuickIncrement;
  final VoidCallback? onToggleFavorite;
  final void Function(TapDownDetails details)? onContextMenu;
  final bool isSelected;

  const BookCoverCard({
    super.key,
    required this.book,
    required this.onLogProgress,
    required this.onEdit,
    required this.onQuickIncrement,
    this.onToggleFavorite,
    this.onContextMenu,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isSelected
        ? (details?.accentColor ?? Theme.of(context).colorScheme.primary)
        : (details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack));
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final quickOptions = getQuickChipOptions(book.type);
    final quickAmt = quickOptions.isNotEmpty ? quickOptions.first : 1;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onEdit,
        onSecondaryTapDown: onContextMenu != null ? (d) => onContextMenu!(d) : null,
        child: Container(
          decoration: BoxDecoration(
            color: details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white),
            border: Border.all(color: borderColor, width: isSelected ? 2.5 : AppTheme.borderLight),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: isSelected ? const Offset(4.0, 4.0) : const Offset(2.5, 2.5),
                blurRadius: 0,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Cover Image Background / Fallback
              if (book.coverUrl != null && book.coverUrl!.isNotEmpty)
                Image.network(
                  book.coverUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _buildFallbackPattern(isDark),
                )
              else
                _buildFallbackPattern(isDark),

              // Top Badges (Format, Favorite & Rating)
              Positioned(
                top: 6,
                left: 6,
                right: 6,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(
                            color: accentColor,
                            border: Border.all(color: Colors.white, width: 1),
                          ),
                          child: Text(
                            book.type.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        if (onToggleFavorite != null) ...[
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: onToggleFavorite,
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                                border: Border.all(color: AppColors.inkBlack, width: 1),
                              ),
                              child: Icon(
                                book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                size: 12,
                                color: book.isFavorite == true ? AppColors.primaryRed : AppColors.inkBlack,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (book.rating != null && book.rating! > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFB800),
                        border: Border.all(color: AppColors.inkBlack, width: 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, size: 11, color: AppColors.inkBlack),
                          const SizedBox(width: 2),
                          Text(
                            book.rating!.toStringAsFixed(1),
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: AppColors.inkBlack,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // Bottom Information Overlay
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                  border: Border(
                    top: BorderSide(color: borderColor, width: 1.5),
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      book.title.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            formatProgressDisplay(book),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        // Mini +1 Quick Chip
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => onQuickIncrement(quickAmt.toDouble()),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                                border: Border.all(color: borderColor, width: 1),
                              ),
                              child: Text(
                                '+$quickAmt',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    BrutalistProgressBar(
                      progress: book.completionPercentage / 100.0,
                      height: 4,
                      fillColor: accentColor,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

  Widget _buildFallbackPattern(bool isDark) {
    return Container(
      color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
      child: Center(
        child: Icon(
          Icons.auto_stories_rounded,
          size: 40,
          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.2),
        ),
      ),
    );
  }
}
