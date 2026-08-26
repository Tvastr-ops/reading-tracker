import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class QuickLogDialog extends StatefulWidget {
  final Book book;
  final Function(double newProgress, String? note) onSave;

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
  late TextEditingController _progressController;
  late TextEditingController _noteController;
  late FocusNode _dialogFocusNode;

  @override
  void initState() {
    super.initState();
    _currentProgress = widget.book.progress;
    _progressController = TextEditingController(
      text: _currentProgress % 1 == 0 ? _currentProgress.toInt().toString() : _currentProgress.toString(),
    );
    _noteController = TextEditingController();
    _dialogFocusNode = FocusNode();
  }

  @override
  void dispose() {
    _progressController.dispose();
    _noteController.dispose();
    _dialogFocusNode.dispose();
    super.dispose();
  }

  void _save() {
    final note = _noteController.text.trim().isEmpty ? null : _noteController.text.trim();
    widget.onSave(_currentProgress, note);
    Navigator.pop(context);
  }

  void _increment(double amount) {
    setState(() {
      _currentProgress += amount;
      if (widget.book.totalUnits != null && _currentProgress > widget.book.totalUnits!) {
        _currentProgress = widget.book.totalUnits!;
      }
      _progressController.text = _currentProgress % 1 == 0
          ? _currentProgress.toInt().toString()
          : _currentProgress.toString();
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
    final unitLabel = getUnitLabel(widget.book.type, widget.book.unitType);
    final quickChips = getQuickChipOptions(widget.book.type);

    final isMobile = MediaQuery.of(context).size.width < 600;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    final maxDialogHeight = (screenHeight - keyboardHeight - (isMobile ? 32 : 80)).clamp(300.0, 580.0);

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
          vertical: isMobile ? 16 : 24,
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 440),
          height: maxDialogHeight,
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
              // 1. Pinned Clean Header
              Container(
                padding: const EdgeInsets.fromLTRB(18, 14, 12, 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: borderColor.withValues(alpha: 0.20),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LOG PROGRESS',
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              letterSpacing: -0.2,
                              color: inkColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.book.title,
                            style: TextStyle(
                              fontSize: 12,
                              color: mutedInk,
                              fontWeight: FontWeight.w700,
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
              ),

              // 2. Scrollable Input Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Quick Increment Chips
                      Text(
                        'QUICK INCREMENT',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: inkColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: quickChips.map((amt) {
                          return GestureDetector(
                            onTap: () => _increment(amt.toDouble()),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: inputBg,
                                border: Border.all(
                                  color: borderColor,
                                  width: 1.5,
                                ),
                              ),
                              child: Text(
                                '+$amt $unitLabel',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: inkColor,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),

                      // Exact Progress Input
                      Text(
                        'CURRENT PROGRESS ($unitLabel)'.toUpperCase(),
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
                          border: Border.all(
                            color: borderColor,
                            width: 1.5,
                          ),
                        ),
                        child: TextField(
                          controller: _progressController,
                          autofocus: true,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: inkColor,
                          ),
                          onChanged: (val) {
                            final numVal = double.tryParse(val);
                            if (numVal != null) _currentProgress = numVal;
                          },
                          onSubmitted: (_) => _save(),
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                            border: InputBorder.none,
                            hintStyle: TextStyle(color: mutedInk),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

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
                          border: Border.all(
                            color: borderColor,
                            width: 1.5,
                          ),
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
                            hintText: 'e.g. Read during commute...',
                            hintStyle: TextStyle(fontSize: 11.5, color: mutedInk),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Sticky Pinned Action Bar
              Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: borderColor.withValues(alpha: 0.20),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    BrutalistButton(
                      backgroundColor: Colors.transparent,
                      textColor: inkColor,
                      borderWidth: 1.5,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        'CANCEL',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: inkColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: BrutalistButton(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        onPressed: _save,
                        child: const Text('SAVE PROGRESS', style: TextStyle(color: Colors.white, fontSize: 12)),
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
