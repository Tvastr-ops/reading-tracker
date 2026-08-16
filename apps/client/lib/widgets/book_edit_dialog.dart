import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/open_library_service.dart';
import '../theme/app_theme.dart';
import 'brutalist_widgets.dart';

class BookEditDialog extends StatefulWidget {
  final Book? book;
  final Function(Book) onSave;
  final Function(String)? onDelete;

  const BookEditDialog({
    super.key,
    this.book,
    required this.onSave,
    this.onDelete,
  });

  @override
  State<BookEditDialog> createState() => _BookEditDialogState();
}

class _BookEditDialogState extends State<BookEditDialog> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _titleController;
  late TextEditingController _authorController;
  late TextEditingController _progressController;
  late TextEditingController _totalUnitsController;
  late TextEditingController _parentProgressController;
  late TextEditingController _parentTotalController;
  late TextEditingController _latestUnitsController;
  late TextEditingController _coverUrlController;
  late TextEditingController _genreTagsController;
  late TextEditingController _notesController;

  late String _type;
  late String _status;
  late String _progressStructure;
  late bool _isOngoing;
  double? _rating;
  bool _isSearchingCover = false;

  @override
  void initState() {
    super.initState();
    final b = widget.book;
    _titleController = TextEditingController(text: b?.title ?? '');
    _authorController = TextEditingController(text: b?.author ?? '');
    _progressController = TextEditingController(text: b != null ? (b.progress % 1 == 0 ? b.progress.toInt().toString() : b.progress.toString()) : '0');
    _totalUnitsController = TextEditingController(text: b?.totalUnits != null ? (b!.totalUnits! % 1 == 0 ? b.totalUnits!.toInt().toString() : b.totalUnits.toString()) : '');
    _parentProgressController = TextEditingController(text: b?.parentProgress?.toString() ?? '');
    _parentTotalController = TextEditingController(text: b?.parentTotal?.toString() ?? '');
    _latestUnitsController = TextEditingController(text: b?.latestUnits?.toString() ?? '');
    _coverUrlController = TextEditingController(text: b?.coverUrl ?? '');
    _genreTagsController = TextEditingController(text: b?.genreTags ?? '');
    _notesController = TextEditingController(text: b?.notes ?? '');

    _type = b?.type ?? 'Novel';
    _status = b?.status ?? BookStatus.planToRead;
    _progressStructure = b?.progressStructure ?? 'single';
    _isOngoing = b?.isOngoing ?? false;
    _rating = b?.rating;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _authorController.dispose();
    _progressController.dispose();
    _totalUnitsController.dispose();
    _parentProgressController.dispose();
    _parentTotalController.dispose();
    _latestUnitsController.dispose();
    _coverUrlController.dispose();
    _genreTagsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _searchCover() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _isSearchingCover = true);
    final cover = await OpenLibraryService.searchCover(title, _authorController.text.trim());
    setState(() => _isSearchingCover = false);

    if (cover != null && mounted) {
      _coverUrlController.text = cover;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cover found and applied!')),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No cover found on Open Library')),
      );
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final now = DateTime.now().toIso8601String();
    final progressVal = double.tryParse(_progressController.text) ?? 0.0;
    final totalUnitsVal = double.tryParse(_totalUnitsController.text);
    final parentProgVal = num.tryParse(_parentProgressController.text);
    final parentTotalVal = num.tryParse(_parentTotalController.text);
    final latestVal = num.tryParse(_latestUnitsController.text);

    final updatedBook = Book(
      id: widget.book?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      title: _titleController.text.trim(),
      author: _authorController.text.trim().isEmpty ? null : _authorController.text.trim(),
      type: _type,
      status: _status,
      progressStructure: _progressStructure,
      parentProgress: parentProgVal,
      parentTotal: parentTotalVal,
      latestUnits: latestVal,
      isOngoing: _isOngoing,
      progress: progressVal,
      totalUnits: totalUnitsVal,
      rating: _rating,
      coverUrl: _coverUrlController.text.trim().isEmpty ? null : _coverUrlController.text.trim(),
      genreTags: _genreTagsController.text.trim().isEmpty ? null : _genreTagsController.text.trim(),
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      createdAt: widget.book?.createdAt ?? now,
      updatedAt: now,
      syncStatus: 'pending_update',
    );

    widget.onSave(updatedBook);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final isEditing = widget.book != null;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      backgroundColor: dialogBg,
      child: Container(
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
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEditing ? 'EDIT BOOK' : 'ADD NEW BOOK',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        letterSpacing: -0.2,
                        color: inkColor,
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
                const SizedBox(height: 16),

                _buildFormSectionHeader('1. BASIC INFORMATION', details, inkColor, borderColor),
                const SizedBox(height: 8),

                // Title Input
                _buildFieldLabel('TITLE *', inkColor),
                _buildTextInput(_titleController, 'e.g. Dune', isRequired: true, details: details, borderColor: borderColor, inkColor: inkColor),
                const SizedBox(height: 12),

                // Author Input
                _buildFieldLabel('AUTHOR', inkColor),
                _buildTextInput(_authorController, 'e.g. Frank Herbert', details: details, borderColor: borderColor, inkColor: inkColor),
                const SizedBox(height: 12),

                // Type & Status Row
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('PUBLICATION TYPE', inkColor),
                          _buildDropdown(
                            value: _type,
                            items: PublicationTypes.all,
                            details: details,
                            borderColor: borderColor,
                            inkColor: inkColor,
                            onChanged: (val) => setState(() => _type = val!),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('STATUS', inkColor),
                          _buildDropdown(
                            value: _status,
                            items: BookStatus.all,
                            details: details,
                            borderColor: borderColor,
                            inkColor: inkColor,
                            onChanged: (val) => setState(() => _status = val!),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                _buildFormSectionHeader('2. PROGRESSION & STRUCTURE', details, inkColor, borderColor),
                const SizedBox(height: 8),

                // Multi-Tier Progress Structure
                _buildFieldLabel('PROGRESS STRUCTURE', inkColor),
                _buildDropdown(
                  value: _progressStructure,
                  items: const ['single', 'volume_chapter', 'part_chapter'],
                  itemLabels: const {
                    'single': 'Single Tier (Chapters / Pages)',
                    'volume_chapter': 'Multi-Tier (Volumes + Chapters)',
                    'part_chapter': 'Multi-Tier (Parts + Chapters)',
                  },
                  details: details,
                  borderColor: borderColor,
                  inkColor: inkColor,
                  onChanged: (val) => setState(() => _progressStructure = val!),
                ),
                const SizedBox(height: 12),

                if (_progressStructure != 'single') ...[
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildFieldLabel(_progressStructure == 'volume_chapter' ? 'CURRENT VOLUME' : 'CURRENT PART', inkColor),
                            _buildTextInput(_parentProgressController, 'e.g. 14', isNumber: true, details: details, borderColor: borderColor, inkColor: inkColor),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildFieldLabel(_progressStructure == 'volume_chapter' ? 'TOTAL VOLUMES' : 'TOTAL PARTS', inkColor),
                            _buildTextInput(_parentTotalController, 'e.g. 16', isNumber: true, details: details, borderColor: borderColor, inkColor: inkColor),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],

                // Current & Total Progress Units
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('CURRENT UNITS', inkColor),
                          _buildTextInput(_progressController, '0', isNumber: true, details: details, borderColor: borderColor, inkColor: inkColor),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('TOTAL UNITS', inkColor),
                          _buildTextInput(_totalUnitsController, 'e.g. 388', isNumber: true, details: details, borderColor: borderColor, inkColor: inkColor),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Serialization Ongoing Toggle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Ongoing Serialization', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: inkColor)),
                    Switch(
                      value: _isOngoing,
                      activeThumbColor: Theme.of(context).colorScheme.primary,
                      onChanged: (val) => setState(() => _isOngoing = val),
                    ),
                  ],
                ),
                if (_isOngoing) ...[
                  const SizedBox(height: 6),
                  _buildFieldLabel('LATEST RELEASED CHAPTER', inkColor),
                  _buildTextInput(_latestUnitsController, 'e.g. 1450', isNumber: true, details: details, borderColor: borderColor, inkColor: inkColor),
                ],
                const SizedBox(height: 18),

                _buildFormSectionHeader('3. RATING, COVER & NOTES', details, inkColor, borderColor),
                const SizedBox(height: 8),

                // Rating Slider / Selector
                _buildFieldLabel('RATING (${_rating != null ? "${_rating!.toStringAsFixed(1)} ★" : "UNRATED"})', inkColor),
                Slider(
                  value: _rating ?? 0.0,
                  min: 0.0,
                  max: 5.0,
                  divisions: 10,
                  activeColor: Theme.of(context).colorScheme.primary,
                  onChanged: (val) => setState(() => _rating = val == 0 ? null : val),
                ),
                const SizedBox(height: 12),

                // Cover URL & Search Button
                _buildFieldLabel('COVER IMAGE URL', inkColor),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextInput(_coverUrlController, 'https://...', details: details, borderColor: borderColor, inkColor: inkColor),
                    ),
                    const SizedBox(width: 8),
                    BrutalistButton(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      backgroundColor: borderColor,
                      textColor: isDark ? Colors.black : Colors.white,
                      onPressed: _isSearchingCover ? null : _searchCover,
                      child: _isSearchingCover
                          ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: isDark ? Colors.black : Colors.white))
                          : Icon(Icons.image_search_rounded, size: 18, color: isDark ? Colors.black : Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Notes Input
                _buildFieldLabel('NOTES / REVIEW', inkColor),
                _buildTextInput(_notesController, 'Reading thoughts...', maxLines: 2, details: details, borderColor: borderColor, inkColor: inkColor),
                const SizedBox(height: 20),

                // Actions
                BrutalistButton(
                  isFullWidth: true,
                  onPressed: _submit,
                  child: Text(isEditing ? 'SAVE CHANGES' : 'CREATE BOOK', style: const TextStyle(color: Colors.white, fontSize: 14)),
                ),

                if (isEditing && widget.onDelete != null) ...[
                  const SizedBox(height: 10),
                  BrutalistButton(
                    isFullWidth: true,
                    backgroundColor: Colors.transparent,
                    textColor: AppColors.primaryRed,
                    borderWidth: 1.5,
                    onPressed: () {
                      widget.onDelete!(widget.book!.id);
                      Navigator.pop(context);
                    },
                    child: const Text('MOVE TO TRASH', style: TextStyle(color: AppColors.primaryRed, fontSize: 12)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormSectionHeader(String title, AppThemeDetails? details, Color inkColor, Color borderColor) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(
          color: borderColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.5,
          color: inkColor,
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label, Color inkColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: inkColor,
        ),
      ),
    );
  }

  Widget _buildTextInput(
    TextEditingController controller,
    String hint, {
    bool isNumber = false,
    bool isRequired = false,
    int maxLines = 1,
    required AppThemeDetails? details,
    required Color borderColor,
    required Color inkColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final inputBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return Container(
      decoration: BoxDecoration(
        color: inputBg,
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: TextFormField(
        controller: controller,
        maxLines: maxLines,
        keyboardType: isNumber ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
        validator: isRequired ? (val) => val == null || val.trim().isEmpty ? 'Required' : null : null,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: inkColor,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            fontSize: 12,
            color: inkColor.withValues(alpha: 0.45),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildDropdown({
    required String value,
    required List<String> items,
    Map<String, String>? itemLabels,
    required ValueChanged<String?> onChanged,
    required AppThemeDetails? details,
    required Color borderColor,
    required Color inkColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dropdownBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: dropdownBg,
        border: Border.all(color: borderColor, width: 1.5),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          dropdownColor: dropdownBg,
          isExpanded: true,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: inkColor,
          ),
          iconEnabledColor: inkColor,
          items: items.map((item) {
            return DropdownMenuItem(
              value: item,
              child: Text(
                itemLabels?[item] ?? item,
                style: TextStyle(color: inkColor, fontWeight: FontWeight.w600),
              ),
            );
          }).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
