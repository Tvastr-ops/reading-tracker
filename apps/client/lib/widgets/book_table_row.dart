import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/theme_service.dart';
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
    final isCompact = ThemeService.instance.compactMode;
    final isWide = MediaQuery.of(context).size.width >= 750;

    final rowPadding = isWide
        ? const EdgeInsets.symmetric(horizontal: 12, vertical: 7)
        : EdgeInsets.symmetric(horizontal: isCompact ? 8 : 10, vertical: isCompact ? 5 : 7);
    final rowMargin = EdgeInsets.symmetric(horizontal: 16, vertical: isCompact ? 2 : 3);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onEdit,
        onSecondaryTapDown: onContextMenu != null ? (d) => onContextMenu!(d) : null,
        child: Container(
          margin: rowMargin,
          padding: rowPadding,
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
          child: isWide
              ? _buildDesktopRow(
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  quickAmt: quickAmt,
                )
              : _buildMobileRow(
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  quickAmt: quickAmt,
                  isCompact: isCompact,
                ),
        ),
      ),
    );
  }

  /// Widescreen Desktop: Clean Columnar Alignment
  Widget _buildDesktopRow({
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required int quickAmt,
  }) {
    return Row(
      children: [
        // 1. Cover Thumbnail
        _buildThumbnail(32, 44, borderColor, isDark),
        const SizedBox(width: 12),

        // 2. Title & Author Column (Flex: 4)
        Expanded(
          flex: 4,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                book.title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (book.author != null && book.author!.isNotEmpty) ...[
                const SizedBox(height: 1),
                Text(
                  book.author!,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.65) : AppColors.inkMuted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 12),

        // 3. Format & Status Column
        SizedBox(
          width: 140,
          child: Wrap(
            spacing: 4,
            runSpacing: 2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              BrutalistBadge(label: book.type),
              if (book.isOngoing == true)
                const BrutalistBadge(
                  label: 'ONGOING',
                  backgroundColor: AppColors.skyBlue,
                  textColor: Colors.white,
                ),
            ],
          ),
        ),
        const SizedBox(width: 12),

        // 4. Rating Column
        Container(
          width: 60,
          alignment: Alignment.centerLeft,
          child: (book.rating != null && book.rating! > 0)
              ? BrutalistBadge(
                  label: '${book.rating!.toStringAsFixed(1)} ★',
                  backgroundColor: const Color(0xFFFFB800),
                  textColor: AppColors.inkBlack,
                )
              : Text(
                  '—',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.35),
                  ),
                ),
        ),
        const SizedBox(width: 14),

        // 5. Progress Column
        SizedBox(
          width: 170,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      formatProgressDisplay(book),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${book.completionPercentage.toInt()}%',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              BrutalistProgressBar(
                progress: book.completionPercentage / 100.0,
                height: 4,
                fillColor: accentColor,
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),

        // 6. Action Controls Column
        SizedBox(
          width: 130,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              // Quick Stepper Chip
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => onQuickIncrement(quickAmt.toDouble()),
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 34, minHeight: 28),
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
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
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 4),

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

              // Direct Log Button
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                icon: Icon(Icons.edit_note_rounded, size: 19, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                tooltip: 'Log Progress',
                onPressed: onLogProgress,
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// Mobile / Narrow Screens: Responsive Stacked Row
  Widget _buildMobileRow({
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required int quickAmt,
    required bool isCompact,
  }) {
    final thumbW = isCompact ? 28.0 : 32.0;
    final thumbH = isCompact ? 38.0 : 44.0;

    return Row(
      children: [
        // Thumbnail
        _buildThumbnail(thumbW, thumbH, borderColor, isDark),
        const SizedBox(width: 8),

        // Details + Progress + Bar
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Line 1: Full-Width Title (Zero badge collision!)
              Text(
                book.title.toUpperCase(),
                style: TextStyle(
                  fontSize: isCompact ? 12.5 : 13.0,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),

              // Line 2: Progress & Author on Left, Badges & % on Right
              Row(
                children: [
                  Expanded(
                    child: Text(
                      (book.author != null && book.author!.isNotEmpty && !isCompact)
                          ? '${book.author} • ${formatProgressDisplay(book)}'
                          : formatProgressDisplay(book),
                      style: TextStyle(
                        fontSize: isCompact ? 10.0 : 10.5,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  BrutalistBadge(label: book.type),
                  if (book.rating != null && book.rating! > 0) ...[
                    const SizedBox(width: 3),
                    BrutalistBadge(
                      label: '${book.rating!.toStringAsFixed(1)} ★',
                      backgroundColor: const Color(0xFFFFB800),
                      textColor: AppColors.inkBlack,
                    ),
                  ],
                  const SizedBox(width: 4),
                  Text(
                    '${book.completionPercentage.toInt()}%',
                    style: TextStyle(
                      fontSize: isCompact ? 10.0 : 10.5,
                      fontWeight: FontWeight.w900,
                      color: accentColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 3),

              // Line 3: Progress Bar
              BrutalistProgressBar(
                progress: book.completionPercentage / 100.0,
                height: isCompact ? 3.0 : 4.0,
                fillColor: accentColor,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),

        // Quick Stepper Chip
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => onQuickIncrement(quickAmt.toDouble()),
            child: Container(
              constraints: BoxConstraints(minWidth: isCompact ? 30 : 34, minHeight: isCompact ? 26 : 30),
              padding: EdgeInsets.symmetric(horizontal: isCompact ? 5 : 7, vertical: isCompact ? 3 : 5),
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
                style: TextStyle(fontSize: isCompact ? 10 : 11, fontWeight: FontWeight.w900),
              ),
            ),
          ),
        ),
        const SizedBox(width: 2),

        // Favorite Button
        if (onToggleFavorite != null)
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
            icon: Icon(
              book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              size: 17,
              color: book.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            ),
            tooltip: book.isFavorite == true ? 'Unmark Favorite' : 'Mark as Favorite',
            onPressed: onToggleFavorite,
          ),

        // Log Button
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 26, minHeight: 26),
          icon: Icon(Icons.edit_note_rounded, size: 19, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
          onPressed: onLogProgress,
        ),
      ],
    );
  }

  Widget _buildThumbnail(double width, double height, Color borderColor, bool isDark) {
    return Container(
      width: width,
      height: height,
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
    );
  }
}
