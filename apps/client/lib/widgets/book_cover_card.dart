import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/theme_service.dart';
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
  final VoidCallback? onLongPress;
  final bool isSelected;

  const BookCoverCard({
    super.key,
    required this.book,
    required this.onLogProgress,
    required this.onEdit,
    required this.onQuickIncrement,
    this.onToggleFavorite,
    this.onContextMenu,
    this.onLongPress,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final isCompact = ThemeService.instance.compactMode;
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
        onLongPress: onLongPress,
        child: Container(
          decoration: BoxDecoration(
            color: (details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white)).withValues(alpha: 0.94),
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
                  cacheWidth: isCompact ? 280 : 380,
                  errorBuilder: (_, __, ___) => _buildFallbackPattern(isDark),
                )
              else
                _buildFallbackPattern(isDark),

              // Top Badges (Format, Favorite & Rating)
              Positioned(
                top: 5,
                left: 5,
                right: 5,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Format Tag (Full title in Comfortable, Max 3-Letter in Compact)
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: isCompact ? 3.5 : 5,
                        vertical: isCompact ? 1 : 2,
                      ),
                      decoration: BoxDecoration(
                        color: accentColor,
                        border: Border.all(color: Colors.white, width: 0.8),
                      ),
                      child: Text(
                        isCompact ? getFormatShorthand(book.type) : book.type.toUpperCase(),
                        style: TextStyle(
                          fontSize: isCompact ? 7.5 : 8.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.3,
                          color: Colors.white,
                        ),
                      ),
                    ),

                    // Top-Right Badges (Rating & Favorite)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (book.rating != null && book.rating! > 0) ...[
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: isCompact ? 3 : 4.5,
                              vertical: isCompact ? 1 : 1.5,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFB800),
                              border: Border.all(color: AppColors.inkBlack, width: 0.8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.star_rounded,
                                  size: isCompact ? 9.5 : 10.5,
                                  color: AppColors.inkBlack,
                                ),
                                const SizedBox(width: 1),
                                Text(
                                  book.rating!.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: isCompact ? 7.5 : 8.5,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.inkBlack,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 3),
                        ],
                        if (onToggleFavorite != null)
                          GestureDetector(
                            onTap: onToggleFavorite,
                            child: Container(
                              padding: EdgeInsets.all(isCompact ? 1.5 : 2.5),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                                border: Border.all(color: AppColors.inkBlack, width: 0.8),
                              ),
                              child: Icon(
                                book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                size: isCompact ? 10.5 : 12,
                                color: book.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // Floating Quick Stepper Chip (Bottom-Right over cover)
              Positioned(
                bottom: isCompact ? 48 : 53,
                right: 5,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => onQuickIncrement(quickAmt.toDouble()),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : Colors.white,
                        border: Border.all(color: borderColor, width: 1.2),
                        boxShadow: [
                          BoxShadow(
                            color: borderColor,
                            offset: const Offset(1.5, 1.5),
                            blurRadius: 0,
                          ),
                        ],
                      ),
                      child: Text(
                        '+$quickAmt',
                        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ),
              ),

              // Bottom Information Overlay (100% full-width for text!)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: isCompact ? 5 : 6, vertical: isCompact ? 4 : 5),
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
                      // Title (Line 1)
                      Text(
                        book.title.toUpperCase(),
                        style: TextStyle(
                          fontSize: isCompact ? 10.5 : 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),

                      // Progress String (Line 2 - Full 100% Width!)
                      Text(
                        formatProgressDisplay(book, compact: isCompact),
                        style: TextStyle(
                          fontSize: isCompact ? 9 : 9.5,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.75) : AppColors.inkMuted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),

                      // Progress Bar (Line 3)
                      BrutalistProgressBar(
                        progress: book.completionPercentage / 100.0,
                        height: 3.5,
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
    return TypographicBookCover(
      title: book.title,
      author: book.author,
      type: book.type,
    );
  }
}
