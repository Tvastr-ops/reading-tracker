import 'package:flutter/material.dart';
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

  @override
  void initState() {
    super.initState();
    _currentProgress = widget.book.progress;
    _progressController = TextEditingController(
      text: _currentProgress % 1 == 0 ? _currentProgress.toInt().toString() : _currentProgress.toString(),
    );
    _noteController = TextEditingController();
  }

  @override
  void dispose() {
    _progressController.dispose();
    _noteController.dispose();
    super.dispose();
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

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      backgroundColor: dialogBg,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 440),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: dialogBg,
          border: Border.all(
            color: borderColor,
            width: AppTheme.borderHeavy,
          ),
          boxShadow: [
            BoxShadow(
              color: borderColor,
              offset: details?.shadowOffset ?? AppTheme.shadowOffset,
              blurRadius: 0,
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'LOG PROGRESS'.toUpperCase(),
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: inkColor,
                      ),
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
              const SizedBox(height: 4),
              Text(
                widget.book.title,
                style: TextStyle(
                  fontSize: 13,
                  color: mutedInk,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 16),

              // Quick increment chips
              Text(
                'QUICK INCREMENT',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
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
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
              const SizedBox(height: 16),

              // Exact Progress Input
              Text(
                'CURRENT PROGRESS ($unitLabel)'.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
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
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
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
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: inkColor,
                  ),
                  decoration: InputDecoration(
                    hintText: 'e.g. Read during commute...',
                    hintStyle: TextStyle(fontSize: 12, color: mutedInk),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Save Action Button
              BrutalistButton(
                isFullWidth: true,
                onPressed: () {
                  final note = _noteController.text.trim().isEmpty ? null : _noteController.text.trim();
                  widget.onSave(_currentProgress, note);
                  Navigator.pop(context);
                },
                child: const Text('SAVE PROGRESS', style: TextStyle(color: Colors.white, fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
