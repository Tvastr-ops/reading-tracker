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

  const BookCoverCard({
    super.key,
    required this.book,
    required this.onLogProgress,
    required this.onEdit,
    required this.onQuickIncrement,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final quickOptions = getQuickChipOptions(book.type);
    final quickAmt = quickOptions.isNotEmpty ? quickOptions.first : 1;

    return GestureDetector(
      onTap: onEdit,
      child: Container(
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

            // Top Badges (Format & Rating)
            Positioned(
              top: 6,
              left: 6,
              right: 6,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                  if (book.rating != null && book.rating! > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                        border: Border.all(color: AppColors.inkBlack, width: 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.star_rounded, size: 11, color: accentColor),
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
