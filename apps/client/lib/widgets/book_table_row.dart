import 'package:flutter/material.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class BookTableRow extends StatelessWidget {
  final Book book;
  final VoidCallback onLogProgress;
  final VoidCallback onEdit;
  final Function(double) onQuickIncrement;
  final VoidCallback? onToggleFavorite;
  final void Function(TapDownDetails details)? onContextMenu;
  final bool isSelected;

  const BookTableRow({
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
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? accentColor.withValues(alpha: 0.15) : accentColor.withValues(alpha: 0.08))
                : (details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white)),
            border: Border.all(color: borderColor, width: isSelected ? 2.0 : 1.5),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: isSelected ? const Offset(3.0, 3.0) : (details?.shadowOffsetSm ?? const Offset(2.0, 2.0)),
                blurRadius: 0,
              ),
            ],
          ),
        child: Row(
          children: [
            // Thumbnail
            Container(
              width: 32,
              height: 44,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                border: Border.all(color: borderColor, width: 1),
              ),
              child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                  ? Image.network(
                      book.coverUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.auto_stories_rounded, size: 16),
                    )
                  : const Icon(Icons.auto_stories_rounded, size: 16),
            ),
            const SizedBox(width: 10),

            // Title + Progress + Bar
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          book.title.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: accentColor,
                          border: Border.all(color: Colors.white, width: 0.5),
                        ),
                        child: Text(
                          book.type.toUpperCase(),
                          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ),
                      if (book.rating != null && book.rating! > 0) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFB800),
                            border: Border.all(color: AppColors.inkBlack, width: 0.5),
                          ),
                          child: Text(
                            '${book.rating!.toStringAsFixed(1)} ★',
                            style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.inkBlack),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatProgressDisplay(book),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '${book.completionPercentage.toInt()}%',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  BrutalistProgressBar(
                    progress: book.completionPercentage / 100.0,
                    height: 4,
                    fillColor: accentColor,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Quick Stepper Chip
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onQuickIncrement(quickAmt.toDouble()),
                child: Container(
                  constraints: const BoxConstraints(minWidth: 36, minHeight: 32),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                    border: Border.all(color: borderColor, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: borderColor,
                        offset: const Offset(1.5, 1.5),
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '+$quickAmt',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),

            // Favorite Button
            if (onToggleFavorite != null)
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                icon: Icon(
                  book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  size: 18,
                  color: book.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                ),
                tooltip: book.isFavorite == true ? 'Unmark Favorite' : 'Mark as Favorite',
                onPressed: onToggleFavorite,
              ),

            // Log Button
            IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              icon: Icon(Icons.edit_note_rounded, size: 20, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              onPressed: onLogProgress,
            ),
          ],
        ),
      ),
    ),
  );
  }
}
