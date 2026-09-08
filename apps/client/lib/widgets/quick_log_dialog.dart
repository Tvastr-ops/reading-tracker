import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class QuickLogDialog extends StatefulWidget {
  final Book book;
  final Function(double newProgress, String? note, {num? parentProgress}) onSave;

  const QuickLogDialog({
    super.key,
    required this.book,
    required this.onSave,
  });

  @override
  State<QuickLogDialog> createState() => _QuickLogDialogState();
}

class _QuickLogDialogState extends State<QuickLogDialog> {
  late double _currentProgress;
  num? _parentProgress;
  late TextEditingController _progressController;
  late TextEditingController _noteController;
  late FocusNode _dialogFocusNode;
  late FocusNode _inputFocusNode;

  @override
  void initState() {
    super.initState();
    _currentProgress = widget.book.progress;
    _parentProgress = widget.book.parentProgress;
    _progressController = TextEditingController(
      text: _currentProgress % 1 == 0
          ? _currentProgress.toInt().toString()
          : _currentProgress.toString(),
    );
    _noteController = TextEditingController();
    _dialogFocusNode = FocusNode();
    _inputFocusNode = FocusNode();
  }

  @override
  void dispose() {
    _progressController.dispose();
    _noteController.dispose();
    _dialogFocusNode.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  void _save() {
    final note = _noteController.text.trim().isEmpty ? null : _noteController.text.trim();
    widget.onSave(_currentProgress, note, parentProgress: _parentProgress);
    Navigator.pop(context);
  }

  void _increment(double amount) {
    setState(() {
      _currentProgress = (_currentProgress + amount).clamp(0.0, widget.book.totalUnits ?? 999999.0);
      _progressController.text = _currentProgress % 1 == 0
          ? _currentProgress.toInt().toString()
          : _currentProgress.toString();
    });
  }

  void _incrementVolume(int delta) {
    setState(() {
      final currentVol = (_parentProgress ?? 1).toInt();
      final newVol = (currentVol + delta).clamp(1, (widget.book.parentTotal ?? 9999).toInt());
      _parentProgress = newVol;
      if (delta > 0 && widget.book.totalUnits == null) {
        _currentProgress = 0;
        _progressController.text = '0';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inputBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final unitLabel = getUnitLabel(widget.book.type, widget.book.unitType);
    final quickChips = getQuickChipOptions(widget.book.type);

    final total = widget.book.totalUnits;
    final pct = total != null && total > 0
        ? ((_currentProgress / total) * 100).clamp(0.0, 100.0)
        : null;

    final isMobile = MediaQuery.of(context).size.width < 600;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    final maxDialogHeight = (screenHeight - keyboardHeight - (isMobile ? 24 : 64)).clamp(280.0, 620.0);

    final hasVolumes = widget.book.progressStructure != null &&
        widget.book.progressStructure != 'single' &&
        widget.book.progressStructure!.isNotEmpty;

    return KeyboardListener(
      focusNode: _dialogFocusNode,
      onKeyEvent: (event) {
        if (event is KeyDownEvent) {
          if (event.logicalKey == LogicalKeyboardKey.escape) {
            Navigator.pop(context);
          } else if (event.logicalKey == LogicalKeyboardKey.keyS &&
              (HardwareKeyboard.instance.isControlPressed || HardwareKeyboard.instance.isMetaPressed)) {
            _save();
          }
        }
      },
      child: Dialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: EdgeInsets.symmetric(
          horizontal: isMobile ? 16 : 32,
          vertical: isMobile ? 12 : 24,
        ),
        child: Container(
          constraints: BoxConstraints(maxWidth: 460, maxHeight: maxDialogHeight),
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: dialogBg,
            border: Border.all(
              color: borderColor,
              width: AppTheme.borderHeavy,
            ),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.black.withValues(alpha: 0.7) : borderColor,
                offset: isDark ? const Offset(3, 3) : (details?.shadowOffset ?? AppTheme.shadowOffset),
                blurRadius: isDark ? 4 : 0,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Pinned Header with Book Thumbnail & Live Progress
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                  border: Border(
                    bottom: BorderSide(
                      color: borderColor.withValues(alpha: 0.25),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Cover Thumbnail
                        Container(
                          width: 36,
                          height: 52,
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.white,
                            border: Border.all(color: borderColor, width: 1.5),
                          ),
                          child: widget.book.coverUrl != null && widget.book.coverUrl!.isNotEmpty
                              ? Image.network(
                                  widget.book.coverUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => TypographicBookCover(
                                    title: widget.book.title,
                                    type: widget.book.type,
                                  ),
                                )
                              : TypographicBookCover(
                                  title: widget.book.title,
                                  type: widget.book.type,
                                ),
                        ),
                        const SizedBox(width: 12),

                        // Title & Subtitle Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: accentColor,
                                      border: Border.all(color: borderColor, width: 1),
                                    ),
                                    child: const Text(
                                      'QUICK LOG',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    widget.book.type.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: mutedInk,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                widget.book.title,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: inkColor,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),

                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: Icon(Icons.close_rounded, size: 20, color: inkColor),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),

                    // Progress Bar
                    if (pct != null) ...[
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${_currentProgress % 1 == 0 ? _currentProgress.toInt() : _currentProgress} / ${total! % 1 == 0 ? total.toInt() : total} $unitLabel',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'monospace',
                              color: inkColor,
                            ),
                          ),
                          Text(
                            '${pct.toStringAsFixed(1)}%',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'monospace',
                              color: accentColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        height: 6,
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white12 : AppColors.paperSurfaceHighest,
                          border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: (pct / 100).clamp(0.0, 1.0),
                          child: Container(color: accentColor),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // 2. Scrollable Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Large Interactive Counter Box
                      Text(
                        'CURRENT PROGRESS ($unitLabel)'.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: inkColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: inputBg,
                          border: Border.all(color: borderColor, width: 2.0),
                          boxShadow: [
                            BoxShadow(
                              color: borderColor,
                              offset: const Offset(2, 2),
                              blurRadius: 0,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // -1 button
                            GestureDetector(
                              onTap: () => _increment(-1),
                              child: Container(
                                height: 34,
                                width: 34,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                                  border: Border.all(color: borderColor, width: 1.5),
                                ),
                                child: Icon(Icons.remove, size: 16, color: inkColor),
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Editable Progress Field
                            Expanded(
                              child: TextField(
                                controller: _progressController,
                                focusNode: _inputFocusNode,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                  color: inkColor,
                                ),
                                onChanged: (val) {
                                  final numVal = double.tryParse(val);
                                  if (numVal != null) {
                                    setState(() => _currentProgress = numVal);
                                  }
                                },
                                onSubmitted: (_) => _save(),
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),

                            // +1 button
                            GestureDetector(
                              onTap: () => _increment(1),
                              child: Container(
                                height: 34,
                                width: 34,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                                  border: Border.all(color: borderColor, width: 1.5),
                                ),
                                child: Icon(Icons.add, size: 16, color: inkColor),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Quick Increment Chips (+1, +5, +10, +25...)
                      Text(
                        'QUICK ADVANCE',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: inkColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: quickChips.map((amt) {
                          return GestureDetector(
                            onTap: () => _increment(amt.toDouble()),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                                border: Border.all(color: borderColor, width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: borderColor,
                                    offset: const Offset(1.5, 1.5),
                                    blurRadius: 0,
                                  ),
                                ],
                              ),
                              child: Text(
                                '+$amt',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                  color: inkColor,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),

                      // Multi-Tier Volume Advance (if applicable)
                      if (hasVolumes || widget.book.parentProgress != null) ...[
                        Text(
                          'VOLUME / PART PROGRESS',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                            color: inkColor,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: inputBg,
                            border: Border.all(color: borderColor, width: 1.5),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              GestureDetector(
                                onTap: () => _incrementVolume(-1),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                                    border: Border.all(color: borderColor, width: 1),
                                  ),
                                  child: Icon(Icons.remove, size: 14, color: inkColor),
                                ),
                              ),
                              Text(
                                'Vol. ${_parentProgress ?? 1}${widget.book.parentTotal != null ? " / ${widget.book.parentTotal}" : ""}',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: inkColor,
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _incrementVolume(1),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: accentColor,
                                    border: Border.all(color: borderColor, width: 1),
                                  ),
                                  child: const Text(
                                    '+1 VOL',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Session Notes Input
                      Text(
                        'SESSION NOTE (OPTIONAL)',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: inkColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        decoration: BoxDecoration(
                          color: inputBg,
                          border: Border.all(color: borderColor, width: 1.5),
                        ),
                        child: TextField(
                          controller: _noteController,
                          maxLines: 2,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: inkColor,
                          ),
                          onSubmitted: (_) => _save(),
                          decoration: InputDecoration(
                            hintText: 'e.g. Completed arc, exciting cliffhanger...',
                            hintStyle: TextStyle(fontSize: 11.5, color: mutedInk),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Sticky Action Bar
              Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: borderColor.withValues(alpha: 0.25),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    BrutalistButton(
                      backgroundColor: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                      textColor: inkColor,
                      borderWidth: 1.5,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        'CANCEL',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: inkColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: BrutalistButton(
                        backgroundColor: accentColor,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        onPressed: _save,
                        child: const Text(
                          'SAVE PROGRESS [ENTER]',
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
