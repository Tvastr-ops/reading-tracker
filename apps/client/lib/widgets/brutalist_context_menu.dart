import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';

enum ContextMenuAction {
  edit,
  quickLog,
  toggleFavorite,
  markCompleted,
  startReread,
  delete,
}

class ContextMenuItemData {
  final ContextMenuAction action;
  final String label;
  final IconData icon;
  final Color? color;
  final bool isDestructive;

  const ContextMenuItemData({
    required this.action,
    required this.label,
    required this.icon,
    this.color,
    this.isDestructive = false,
  });
}

class BrutalistContextMenu {
  static List<ContextMenuItemData> getActionsForBook(Book book) {
    final isFav = book.isFavorite == true;
    final isDone = book.status == BookStatus.completed;

    return [
      const ContextMenuItemData(
        action: ContextMenuAction.edit,
        label: 'EDIT DETAILS',
        icon: Icons.edit_note_rounded,
      ),
      const ContextMenuItemData(
        action: ContextMenuAction.quickLog,
        label: 'QUICK LOG PROGRESS',
        icon: Icons.add_circle_outline_rounded,
      ),
      ContextMenuItemData(
        action: ContextMenuAction.toggleFavorite,
        label: isFav ? 'UNMARK FAVORITE' : 'MARK FAVORITE',
        icon: isFav ? Icons.star_rounded : Icons.star_border_rounded,
        color: isFav ? AppColors.warningAmber : null,
      ),
      if (!isDone)
        const ContextMenuItemData(
          action: ContextMenuAction.markCompleted,
          label: 'MARK COMPLETED',
          icon: Icons.check_circle_outline_rounded,
          color: AppColors.successGreen,
        ),
      if (isDone)
        const ContextMenuItemData(
          action: ContextMenuAction.startReread,
          label: 'START RE-READ',
          icon: Icons.replay_rounded,
          color: AppColors.electricCobalt,
        ),
      const ContextMenuItemData(
        action: ContextMenuAction.delete,
        label: 'MOVE TO TRASH',
        icon: Icons.delete_outline_rounded,
        isDestructive: true,
      ),
    ];
  }

  static Future<ContextMenuAction?> show({
    required BuildContext context,
    required Offset tapPosition,
    required Book book,
    AppThemeDetails? details,
  }) async {
    final media = MediaQuery.of(context);
    final isMobile = media.size.width < 600;

    ThemeService.instance.triggerHapticClick();

    if (isMobile) {
      return showModalBottomSheet<ContextMenuAction>(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        builder: (ctx) => _BrutalistBottomSheetContent(book: book, details: details),
      );
    } else {
      return showDialog<ContextMenuAction>(
        context: context,
        barrierColor: Colors.transparent,
        builder: (ctx) => _BrutalistDesktopMenuContent(
          book: book,
          tapPosition: tapPosition,
          screenSize: media.size,
          details: details,
        ),
      );
    }
  }
}

class _BrutalistDesktopMenuContent extends StatefulWidget {
  final Book book;
  final Offset tapPosition;
  final Size screenSize;
  final AppThemeDetails? details;

  const _BrutalistDesktopMenuContent({
    required this.book,
    required this.tapPosition,
    required this.screenSize,
    this.details,
  });

  @override
  State<_BrutalistDesktopMenuContent> createState() => _BrutalistDesktopMenuContentState();
}

class _BrutalistDesktopMenuContentState extends State<_BrutalistDesktopMenuContent> {
  int _focusedIndex = 0;
  late final List<ContextMenuItemData> _actions;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _actions = BrutalistContextMenu.getActionsForBook(widget.book);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  void _handleKey(KeyEvent event) {
    if (event is! KeyDownEvent) return;

    if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
      setState(() {
        _focusedIndex = (_focusedIndex + 1) % _actions.length;
      });
      ThemeService.instance.triggerHapticClick();
    } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
      setState(() {
        _focusedIndex = (_focusedIndex - 1 + _actions.length) % _actions.length;
      });
      ThemeService.instance.triggerHapticClick();
    } else if (event.logicalKey == LogicalKeyboardKey.enter || event.logicalKey == LogicalKeyboardKey.space) {
      Navigator.of(context).pop(_actions[_focusedIndex].action);
    } else if (event.logicalKey == LogicalKeyboardKey.escape) {
      Navigator.of(context).pop(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = widget.details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final cardBg = widget.details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white);
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final accentColor = widget.details?.accentColor ?? Theme.of(context).colorScheme.primary;

    const menuWidth = 260.0;
    final menuHeight = 90.0 + (_actions.length * 40.0);

    final left = widget.tapPosition.dx.clamp(12.0, widget.screenSize.width - menuWidth - 12.0);
    final top = widget.tapPosition.dy.clamp(12.0, widget.screenSize.height - menuHeight - 12.0);

    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () => Navigator.of(context).pop(null),
          ),
        ),
        Positioned(
          left: left,
          top: top,
          child: KeyboardListener(
            focusNode: _focusNode,
            onKeyEvent: _handleKey,
            child: Material(
              color: Colors.transparent,
              child: Container(
                width: menuWidth,
                decoration: BoxDecoration(
                  color: cardBg,
                  border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
                  boxShadow: [
                    BoxShadow(
                      color: borderColor,
                      offset: widget.details?.shadowOffset ?? AppTheme.shadowOffset,
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: accentColor.withValues(alpha: 0.1),
                        border: Border(bottom: BorderSide(color: borderColor, width: AppTheme.borderLight)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.book.title.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: inkColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: accentColor,
                                  border: Border.all(color: borderColor, width: 1),
                                ),
                                child: Text(
                                  getFormatShorthand(widget.book.type),
                                  style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              if (widget.book.seriesName != null && widget.book.seriesName!.isNotEmpty) ...[
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '[${widget.book.seriesName!.toUpperCase()}${widget.book.seriesOrder != null ? " #${formatNum(widget.book.seriesOrder!)}" : ""}]',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      color: accentColor,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    ...List.generate(_actions.length, (idx) {
                      final item = _actions[idx];
                      final isFocused = idx == _focusedIndex;
                      final itemColor = item.isDestructive
                          ? Colors.red
                          : (item.color ?? inkColor);

                      return InkWell(
                        onTap: () {
                          ThemeService.instance.triggerHapticClick();
                          Navigator.of(context).pop(item.action);
                        },
                        onHover: (hovered) {
                          if (hovered && _focusedIndex != idx) {
                            setState(() => _focusedIndex = idx);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                          decoration: BoxDecoration(
                            color: isFocused ? accentColor.withValues(alpha: 0.18) : Colors.transparent,
                            border: Border(
                              bottom: idx < _actions.length - 1
                                  ? BorderSide(color: borderColor.withValues(alpha: 0.25), width: 1)
                                  : BorderSide.none,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(item.icon, size: 15, color: itemColor),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  item.label,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: isFocused ? FontWeight.w900 : FontWeight.w700,
                                    letterSpacing: 0.3,
                                    color: itemColor,
                                  ),
                                ),
                              ),
                              if (isFocused)
                                Icon(Icons.keyboard_return_rounded, size: 12, color: accentColor),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BrutalistBottomSheetContent extends StatelessWidget {
  final Book book;
  final AppThemeDetails? details;

  const _BrutalistBottomSheetContent({
    required this.book,
    this.details,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final cardBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white);
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final actions = BrutalistContextMenu.getActionsForBook(book);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Container(
          decoration: BoxDecoration(
            color: cardBg,
            border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: details?.shadowOffset ?? AppTheme.shadowOffset,
                blurRadius: 0,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 4),
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: borderColor.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: accentColor,
                        border: Border.all(color: borderColor, width: 1.5),
                      ),
                      child: Text(
                        getFormatShorthand(book.type),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            book.title.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: inkColor,
                            ),
                          ),
                          if (book.author != null && book.author!.isNotEmpty)
                            Text(
                              book.author!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                color: inkColor.withValues(alpha: 0.7),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, thickness: 1.5, color: borderColor),
              ...actions.map((item) {
                final itemColor = item.isDestructive
                    ? Colors.red
                    : (item.color ?? inkColor);

                return InkWell(
                  onTap: () {
                    ThemeService.instance.triggerHapticClick();
                    Navigator.of(context).pop(item.action);
                  },
                  child: Container(
                    height: 50,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: borderColor.withValues(alpha: 0.2), width: 1),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(item.icon, size: 20, color: itemColor),
                        const SizedBox(width: 14),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: itemColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 4),
            ],
          ),
        ),
      ),
    );
  }
}
