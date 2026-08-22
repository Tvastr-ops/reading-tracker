import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class BrutalistCard extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;
  final Color? borderColor;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final GestureTapDownCallback? onSecondaryTapDown;
  final double borderWidth;
  final Offset? shadowOffset;

  const BrutalistCard({
    super.key,
    required this.child,
    this.backgroundColor,
    this.borderColor,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    this.onTap,
    this.onSecondaryTapDown,
    this.borderWidth = AppTheme.borderLight,
    this.shadowOffset,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = backgroundColor ?? details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white);
    final border = borderColor ?? details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final offset = shadowOffset ?? details?.shadowOffset ?? AppTheme.shadowOffset;

    Widget content = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border, width: borderWidth),
        boxShadow: [
          BoxShadow(
            color: border,
            offset: offset,
            blurRadius: 0,
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );

    if (onTap != null || onSecondaryTapDown != null) {
      return MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          onSecondaryTapDown: onSecondaryTapDown,
          child: content,
        ),
      );
    }
    return content;
  }
}

class BrutalistButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? textColor;
  final double borderWidth;
  final EdgeInsetsGeometry padding;
  final bool isFullWidth;

  const BrutalistButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.backgroundColor,
    this.textColor,
    this.borderWidth = AppTheme.borderLight,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.isFullWidth = false,
  });

  @override
  State<BrutalistButton> createState() => _BrutalistButtonState();
}

class _BrutalistButtonState extends State<BrutalistButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = widget.backgroundColor ?? details?.accentColor ?? AppColors.primaryRed;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final offset = details?.shadowOffsetSm ?? AppTheme.shadowOffsetSm;

    Widget btn = GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onPressed,
      child: Transform.translate(
        offset: _isPressed ? const Offset(2, 2) : Offset.zero,
        child: Container(
          width: widget.isFullWidth ? double.infinity : null,
          padding: widget.padding,
          decoration: BoxDecoration(
            color: bg,
            border: Border.all(color: borderColor, width: widget.borderWidth),
            boxShadow: _isPressed
                ? []
                : [
                    BoxShadow(
                      color: borderColor,
                      offset: offset,
                      blurRadius: 0,
                    ),
                  ],
          ),
          alignment: widget.isFullWidth ? Alignment.center : null,
          child: DefaultTextStyle(
            style: TextStyle(
              color: widget.textColor ?? Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 13,
              letterSpacing: 0.5,
            ),
            child: widget.child,
          ),
        ),
      ),
    );

    return btn;
  }
}

class BrutalistBadge extends StatelessWidget {
  final String label;
  final Color? backgroundColor;
  final Color? textColor;
  final Color? borderColor;

  const BrutalistBadge({
    super.key,
    required this.label,
    this.backgroundColor,
    this.textColor,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = backgroundColor ?? details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final border = borderColor ?? details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final text = textColor ?? details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border, width: 1.5),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: text,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class BrutalistProgressBar extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double height;
  final Color? fillColor;

  const BrutalistProgressBar({
    super.key,
    required this.progress,
    this.height = 14,
    this.fillColor,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final fill = fillColor ?? details?.accentColor ?? AppColors.primaryRed;
    final clamped = progress.clamp(0.0, 1.0);

    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        color: details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white),
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: clamped,
        child: Container(
          color: fill,
        ),
      ),
    );
  }
}

class BrutalistSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final Color? activeColor;
  final Color? inactiveColor;
  final double width;
  final double height;

  const BrutalistSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.activeColor,
    this.inactiveColor,
    this.width = 44.0,
    this.height = 24.0,
  });

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final activeBg = activeColor ?? details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final inactiveBg = inactiveColor ?? (details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white));
    final thumbSize = height - 6.0;

    return MouseRegion(
      cursor: onChanged != null ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: onChanged != null ? () => onChanged!(!value) : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: width,
          height: height,
          padding: const EdgeInsets.all(1.5),
          decoration: BoxDecoration(
            color: value ? activeBg : inactiveBg,
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: const Offset(1.5, 1.5),
                blurRadius: 0,
              ),
            ],
          ),
          child: AnimatedAlign(
            duration: const Duration(milliseconds: 150),
            curve: Curves.easeOutCubic,
            alignment: value ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              width: thumbSize,
              height: thumbSize,
              decoration: BoxDecoration(
                color: value ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                border: Border.all(color: borderColor, width: 1.0),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
