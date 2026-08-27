import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/open_library_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
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
  late TextEditingController _seriesNameController;
  late TextEditingController _seriesOrderController;
  late TextEditingController _shelfInputController;
  late TextEditingController _progressController;
  late TextEditingController _totalUnitsController;
  late TextEditingController _parentProgressController;
  late TextEditingController _parentTotalController;
  late TextEditingController _latestUnitsController;
  late TextEditingController _coverUrlController;
  late TextEditingController _genreTagsController;
  late TextEditingController _sourceLinkController;
  late TextEditingController _notesController;
  late FocusNode _dialogFocusNode;

  late String _type;
  late String _status;
  late String _progressStructure;
  late bool _isOngoing;
  double? _rating;
  String? _dateStarted;
  String? _dateFinished;
  bool _isSearchingCover = false;
  bool _showAllGenres = false;
  bool _showAllShelves = false;
  List<String> _availableGenres = defaultGenreSeeds;
  List<String> _shelves = [];
  List<String> _availableShelves = [];
  int _rereadCount = 0;

  @override
  void initState() {
    super.initState();
    final b = widget.book;
    _titleController = TextEditingController(text: b?.title ?? '');
    _authorController = TextEditingController(text: b?.author ?? '');
    _seriesNameController = TextEditingController(text: b?.seriesName ?? '');
    _seriesOrderController = TextEditingController(text: b?.seriesOrder != null ? formatNum(b!.seriesOrder!) : '');
    _shelfInputController = TextEditingController();
    _progressController = TextEditingController(text: b != null ? (b.progress % 1 == 0 ? b.progress.toInt().toString() : b.progress.toString()) : '0');
    _totalUnitsController = TextEditingController(text: b?.totalUnits != null ? (b!.totalUnits! % 1 == 0 ? b.totalUnits!.toInt().toString() : b.totalUnits.toString()) : '');
    _parentProgressController = TextEditingController(text: b?.parentProgress?.toString() ?? '');
    _parentTotalController = TextEditingController(text: b?.parentTotal?.toString() ?? '');
    _latestUnitsController = TextEditingController(text: b?.latestUnits?.toString() ?? '');
    _coverUrlController = TextEditingController(text: b?.coverUrl ?? '');
    _genreTagsController = TextEditingController(text: b?.genreTags ?? '');
    _sourceLinkController = TextEditingController(text: b?.sourceLink ?? '');
    _notesController = TextEditingController(text: b?.notes ?? '');
    _dialogFocusNode = FocusNode();

    _type = b?.type ?? 'Novel';
    _status = b?.status ?? BookStatus.planToRead;
    _progressStructure = b?.progressStructure ?? 'single';
    _isOngoing = b?.isOngoing ?? false;
    _rating = b?.rating;
    _dateStarted = b?.dateStarted;
    _dateFinished = b?.dateFinished;
    _shelves = List.from(b?.shelvesList ?? []);
    _rereadCount = b?.rereadCount ?? 0;

    _loadGenreTags();
    _loadShelves();
  }

  Future<void> _loadGenreTags() async {
    final dbTags = await DatabaseHelper.instance.getDistinctGenreTags();
    if (mounted) {
      setState(() {
        if (dbTags.isNotEmpty) {
          _availableGenres = dbTags;
        } else {
          _availableGenres = defaultGenreSeeds;
        }
      });
    }
  }

  Future<void> _loadShelves() async {
    final allBooks = await DatabaseHelper.instance.getBooks();
    final distinct = allBooks.expand((b) => b.shelvesList).toSet().toList()..sort();
    if (mounted) {
      setState(() => _availableShelves = distinct);
    }
  }

  void _addShelf(String raw) {
    final clean = raw.trim();
    if (clean.isEmpty) return;
    if (!_shelves.any((s) => s.toLowerCase() == clean.toLowerCase())) {
      setState(() {
        _shelves.add(clean);
        _shelfInputController.clear();
      });
    } else {
      _shelfInputController.clear();
    }
  }

  void _removeShelf(String name) {
    setState(() {
      _shelves.removeWhere((s) => s.toLowerCase() == name.toLowerCase());
    });
  }

  void _toggleShelf(String name) {
    if (_shelves.any((s) => s.toLowerCase() == name.toLowerCase())) {
      _removeShelf(name);
    } else {
      _addShelf(name);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _authorController.dispose();
    _seriesNameController.dispose();
    _seriesOrderController.dispose();
    _shelfInputController.dispose();
    _progressController.dispose();
    _totalUnitsController.dispose();
    _parentProgressController.dispose();
    _parentTotalController.dispose();
    _latestUnitsController.dispose();
    _coverUrlController.dispose();
    _genreTagsController.dispose();
    _sourceLinkController.dispose();
    _notesController.dispose();
    _dialogFocusNode.dispose();
    super.dispose();
  }

  void _toggleGenreTag(String tag) {
    final normalizedTag = normalizeGenreTag(tag);
    final current = _genreTagsController.text
        .split(',')
        .map((t) => normalizeGenreTag(t))
        .where((t) => t.isNotEmpty)
        .toList();
    if (current.any((t) => t.toLowerCase() == normalizedTag.toLowerCase())) {
      current.removeWhere((t) => t.toLowerCase() == normalizedTag.toLowerCase());
    } else {
      current.add(normalizedTag);
    }
    setState(() {
      _genreTagsController.text = current.join(', ');
    });
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

  Future<void> _pickDate({required bool isStarted}) async {
    final initialStr = isStarted ? _dateStarted : _dateFinished;
    DateTime initial = DateTime.now();
    if (initialStr != null) {
      final parsed = DateTime.tryParse(initialStr);
      if (parsed != null) initial = parsed;
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1970),
      lastDate: DateTime(2100),
    );

    if (picked != null) {
      final formatted = DateFormat('yyyy-MM-dd').format(picked);
      setState(() {
        if (isStarted) {
          _dateStarted = formatted;
        } else {
          _dateFinished = formatted;
        }
      });
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final now = DateTime.now().toUtc().toIso8601String();
    final progressVal = double.tryParse(_progressController.text) ?? 0.0;
    final totalUnitsVal = double.tryParse(_totalUnitsController.text);
    final parentProgVal = num.tryParse(_parentProgressController.text);
    final parentTotalVal = num.tryParse(_parentTotalController.text);
    final latestVal = num.tryParse(_latestUnitsController.text);
    final seriesOrderVal = double.tryParse(_seriesOrderController.text);
    final shelfNamesJson = _shelves.isEmpty ? null : jsonEncode(_shelves);

    final updatedBook = Book(
      id: widget.book?.id ?? generateUuidV4(),
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
      dateStarted: _dateStarted,
      dateFinished: _dateFinished,
      coverUrl: _coverUrlController.text.trim().isEmpty ? null : _coverUrlController.text.trim(),
      genreTags: _genreTagsController.text.trim().isEmpty ? null : _genreTagsController.text.trim(),
      sourceLink: _sourceLinkController.text.trim().isEmpty ? null : sanitizeSourceLink(_sourceLinkController.text),
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      seriesName: _seriesNameController.text.trim().isEmpty ? null : _seriesNameController.text.trim(),
      seriesOrder: seriesOrderVal,
      shelfNames: shelfNamesJson,
      rereadCount: _rereadCount,
      createdAt: widget.book?.createdAt ?? now,
      updatedAt: now,
      syncStatus: widget.book == null ? 'pending_create' : 'pending_update',
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
    final screenHeight = MediaQuery.of(context).size.height;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final dialogHeight = (screenHeight - bottomInset - 48).clamp(380.0, screenHeight * 0.88);

    return KeyboardListener(
      focusNode: _dialogFocusNode,
      autofocus: true,
      onKeyEvent: (event) {
        if (event is KeyDownEvent) {
          if (event.logicalKey == LogicalKeyboardKey.escape) {
            Navigator.pop(context);
          } else if (event.logicalKey == LogicalKeyboardKey.keyS &&
              (HardwareKeyboard.instance.isControlPressed || HardwareKeyboard.instance.isMetaPressed)) {
            _submit();
          }
        }
      },
      child: Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 580),
          height: dialogHeight,
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
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Fixed Header (Prevents scrollbar overlapping the close button)
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 16, 16, 14),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: borderColor.withValues(alpha: 0.25),
                        width: 1.5,
                      ),
                    ),
                  ),
                  child: Row(
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
                ),

                // 2. Scrollable Form Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFormSectionHeader('1. BASIC INFORMATION', details, inkColor, borderColor),
                        const SizedBox(height: 8),

                        // Title Input (Autofocused if adding new)
                        _buildFieldLabel('TITLE *', inkColor),
                        _buildTextInput(
                          _titleController,
                          'e.g. Dune',
                          isRequired: true,
                          autofocus: !isEditing,
                          details: details,
                          borderColor: borderColor,
                          inkColor: inkColor,
                        ),
                        const SizedBox(height: 12),

                        // Author Input
                        _buildFieldLabel('AUTHOR', inkColor),
                        _buildTextInput(
                          _authorController,
                          'e.g. Frank Herbert',
                          details: details,
                          borderColor: borderColor,
                          inkColor: inkColor,
                        ),
                        const SizedBox(height: 12),

                        // Series & Sagas Row
                        Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildFieldLabel('SERIES NAME (OPTIONAL)', inkColor),
                                  _buildTextInput(
                                    _seriesNameController,
                                    'e.g. Dune Saga',
                                    details: details,
                                    borderColor: borderColor,
                                    inkColor: inkColor,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildFieldLabel('SERIES ORDER', inkColor),
                                  _buildTextInput(
                                    _seriesOrderController,
                                    'e.g. 1 or 2.5',
                                    isNumber: true,
                                    details: details,
                                    borderColor: borderColor,
                                    inkColor: inkColor,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Custom Shelves (Inline Tag Editor)
                        _buildFieldLabel('CUSTOM SHELVES', inkColor),
                        if (_shelves.isNotEmpty) ...[
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: _shelves.map((s) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: details?.accentColor ?? Theme.of(context).colorScheme.primary,
                                  border: Border.all(color: borderColor, width: 1.5),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '🔖 $s',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    GestureDetector(
                                      onTap: () => _removeShelf(s),
                                      child: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 8),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: _buildTextInput(
                                _shelfInputController,
                                'Type shelf name and press Enter...',
                                onFieldSubmitted: _addShelf,
                                details: details,
                                borderColor: borderColor,
                                inkColor: inkColor,
                              ),
                            ),
                            const SizedBox(width: 8),
                            BrutalistButton(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              backgroundColor: borderColor,
                              textColor: isDark ? Colors.black : Colors.white,
                              onPressed: () => _addShelf(_shelfInputController.text),
                              child: const Text('ADD', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                            ),
                          ],
                        ),
                        if (_availableShelves.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            'QUICK ADD FROM LIBRARY:',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Builder(
                            builder: (context) {
                              const maxShelves = 6;
                              final hasShelfOverflow = _availableShelves.length > maxShelves;
                              final visibleShelves = _showAllShelves || !hasShelfOverflow
                                  ? _availableShelves
                                  : _availableShelves.take(maxShelves).toList();

                              return Wrap(
                                spacing: 6,
                                runSpacing: 4,
                                children: [
                                  ...visibleShelves.map((sh) {
                                    final isAdded = _shelves.any((s) => s.toLowerCase() == sh.toLowerCase());
                                    return GestureDetector(
                                      onTap: () => _toggleShelf(sh),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isAdded
                                              ? (details?.accentColor ?? Theme.of(context).colorScheme.primary)
                                              : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                                          border: Border.all(
                                            color: isAdded ? borderColor : borderColor.withValues(alpha: 0.35),
                                            width: 1,
                                          ),
                                        ),
                                        child: Text(
                                          isAdded ? '✓ $sh' : '+ $sh',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: isAdded ? FontWeight.w900 : FontWeight.w700,
                                            color: isAdded
                                                ? Colors.white
                                                : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                                  if (hasShelfOverflow)
                                    BrutalistExpandToggleChip(
                                      isExpanded: _showAllShelves,
                                      hiddenCount: _availableShelves.length - maxShelves,
                                      onTap: () => setState(() => _showAllShelves = !_showAllShelves),
                                      size: BrutalistToggleSize.small,
                                    ),
                                ],
                              );
                            },
                          ),
                        ],
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

                        // Re-reading info (only if previously completed or actively in a re-read)
                        if (_rereadCount > 0 || _status == BookStatus.completed) ...[
                          Container(
                            padding: const EdgeInsets.all(10),
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: AppColors.electricCobalt.withValues(alpha: 0.1),
                              border: Border.all(color: borderColor, width: 1.5),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        _status == BookStatus.reading && _rereadCount > 0
                                            ? 'ACTIVE RE-READ #$_rereadCount'
                                            : 'RE-READING TRACKING',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: inkColor),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _rereadCount > 0
                                            ? 'Read and finished $_rereadCount time${_rereadCount == 1 ? "" : "s"} previously'
                                            : 'Marked as completed — ready for a fresh re-read',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (_status == BookStatus.completed) ...[
                                  const SizedBox(width: 8),
                                  BrutalistButton(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    backgroundColor: AppColors.electricCobalt,
                                    textColor: Colors.white,
                                    onPressed: () {
                                      setState(() {
                                        _progressController.text = '0';
                                        _status = BookStatus.reading;
                                        _rereadCount += 1;
                                        _dateStarted = DateFormat('yyyy-MM-dd').format(DateTime.now());
                                        _dateFinished = null;
                                      });
                                    },
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.replay_rounded, size: 14, color: Colors.white),
                                        SizedBox(width: 4),
                                        Text('START RE-READ', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900)),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],

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

                _buildFormSectionHeader('3. RATING & COVER', details, inkColor, borderColor),
                const SizedBox(height: 8),

                // Rating Interactive Star Selector & Slider
                _buildFieldLabel('RATING (${_rating != null ? "${_rating!.toStringAsFixed(1)} ★" : "UNRATED"})', inkColor),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                    border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: List.generate(5, (index) {
                              final starVal = (index + 1).toDouble();
                              final isFilled = _rating != null && _rating! >= starVal;
                              final isHalf = _rating != null && _rating! >= starVal - 0.5 && _rating! < starVal;

                              return GestureDetector(
                                onTap: () => setState(() => _rating = starVal),
                                child: Padding(
                                  padding: const EdgeInsets.only(right: 6),
                                  child: Icon(
                                    isFilled
                                        ? Icons.star_rounded
                                        : (isHalf ? Icons.star_half_rounded : Icons.star_outline_rounded),
                                    color: const Color(0xFFFFB800),
                                    size: 26,
                                  ),
                                ),
                              );
                            }),
                          ),
                          if (_rating != null)
                            GestureDetector(
                              onTap: () => setState(() => _rating = null),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  border: Border.all(color: borderColor, width: 1),
                                ),
                                child: Text(
                                  'CLEAR',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    color: inkColor,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      Slider(
                        value: _rating ?? 0.0,
                        min: 0.0,
                        max: 5.0,
                        divisions: 10,
                        activeColor: const Color(0xFFFFB800),
                        inactiveColor: isDark ? Colors.white24 : AppColors.inkMuted.withValues(alpha: 0.3),
                        onChanged: (val) => setState(() => _rating = val == 0 ? null : val),
                      ),
                    ],
                  ),
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
                const SizedBox(height: 18),

                // Section 4: Reading Dates
                _buildFormSectionHeader('4. READING DATES', details, inkColor, borderColor),
                const SizedBox(height: 8),

                Row(
                  children: [
                    // Started Date Tile
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('STARTED DATE', inkColor),
                          _buildDateTile(
                            dateStr: _dateStarted,
                            isDark: isDark,
                            borderColor: borderColor,
                            inkColor: inkColor,
                            details: details,
                            onPick: () => _pickDate(isStarted: true),
                            onToday: () => setState(() => _dateStarted = DateFormat('yyyy-MM-dd').format(DateTime.now())),
                            onClear: () => setState(() => _dateStarted = null),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Finished Date Tile
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('FINISHED DATE', inkColor),
                          _buildDateTile(
                            dateStr: _dateFinished,
                            isDark: isDark,
                            borderColor: borderColor,
                            inkColor: inkColor,
                            details: details,
                            onPick: () => _pickDate(isStarted: false),
                            onToday: () => setState(() => _dateFinished = DateFormat('yyyy-MM-dd').format(DateTime.now())),
                            onClear: () => setState(() => _dateFinished = null),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Section 5: Genres & Tags
                _buildFormSectionHeader('5. GENRES & TAGS', details, inkColor, borderColor),
                const SizedBox(height: 8),
                _buildFieldLabel('GENRES (COMMA-SEPARATED)', inkColor),
                _buildTextInput(
                  _genreTagsController,
                  'e.g. Fantasy, Sci-Fi, Cultivation',
                  details: details,
                  borderColor: borderColor,
                  inkColor: inkColor,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),

                // Quick Genre Suggestion Chips
                Text(
                  _availableGenres == defaultGenreSeeds
                      ? 'POPULAR SUGGESTIONS:'
                      : 'YOUR LIBRARY TAGS:',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted),
                  ),
                ),
                const SizedBox(height: 6),
                Builder(
                  builder: (context) {
                    final currentTags = _genreTagsController.text
                        .split(',')
                        .map((t) => t.trim().toLowerCase())
                        .where((t) => t.isNotEmpty)
                        .toSet();

                    const maxVisible = 6;
                    final hasOverflow = _availableGenres.length > maxVisible;
                    final visibleGenres = _showAllGenres || !hasOverflow
                        ? _availableGenres
                        : _availableGenres.take(maxVisible).toList();

                    return Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        ...visibleGenres.map((genre) {
                          final isSelected = currentTags.contains(genre.toLowerCase());
                          return MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: GestureDetector(
                              onTap: () => _toggleGenreTag(genre),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 120),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? (details?.accentColor ?? Theme.of(context).colorScheme.primary)
                                      : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                                  border: Border.all(
                                    color: isSelected ? borderColor : borderColor.withValues(alpha: 0.35),
                                    width: isSelected ? 1.5 : 1.0,
                                  ),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: borderColor,
                                            offset: const Offset(1.5, 1.5),
                                            blurRadius: 0,
                                          ),
                                        ]
                                      : [],
                                ),
                                child: Text(
                                  isSelected ? '✓ $genre' : '+ $genre',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                                    color: isSelected
                                        ? Colors.white
                                        : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                        if (hasOverflow)
                          BrutalistExpandToggleChip(
                            isExpanded: _showAllGenres,
                            hiddenCount: _availableGenres.length - maxVisible,
                            onTap: () => setState(() => _showAllGenres = !_showAllGenres),
                            size: BrutalistToggleSize.medium,
                          ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 18),

                // Section 6: Notes & Metadata
                _buildFormSectionHeader('6. NOTES & SOURCE LINK', details, inkColor, borderColor),
                const SizedBox(height: 8),

                _buildFieldLabel('SOURCE / WEB LINK (OPTIONAL)', inkColor),
                _buildTextInput(
                  _sourceLinkController,
                  'e.g. royalroad.com or reading web link',
                  details: details,
                  borderColor: borderColor,
                  inkColor: inkColor,
                ),
                const SizedBox(height: 12),

                _buildFieldLabel('NOTES / REVIEW', inkColor),
                _buildTextInput(_notesController, 'Reading thoughts...', maxLines: 2, details: details, borderColor: borderColor, inkColor: inkColor),
                const SizedBox(height: 20),

                    ],
                  ),
                ),
              ),

              // 3. Fixed Footer Actions (Seamless canvas with delicate border)
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                decoration: BoxDecoration(
                  color: dialogBg,
                  border: Border(
                    top: BorderSide(
                      color: borderColor.withValues(alpha: 0.20),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    if (isEditing && widget.onDelete != null) ...[
                      BrutalistButton(
                        backgroundColor: Colors.transparent,
                        textColor: AppColors.primaryRed,
                        borderWidth: 1.5,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        onPressed: () {
                          widget.onDelete!(widget.book!.id);
                          Navigator.pop(context);
                        },
                        child: const Text(
                          'TRASH',
                          style: TextStyle(color: AppColors.primaryRed, fontSize: 11, fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],
                    const Spacer(),
                    BrutalistButton(
                      backgroundColor: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                      textColor: inkColor,
                      borderWidth: 1.5,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      onPressed: () => Navigator.pop(context),
                      child: Text(
                        'CANCEL',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: inkColor),
                      ),
                    ),
                    const SizedBox(width: 8),
                    BrutalistButton(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      onPressed: _submit,
                      child: Text(
                        isEditing ? 'SAVE CHANGES' : 'CREATE BOOK',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
              ),
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
    bool autofocus = false,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
    ValueChanged<String>? onFieldSubmitted,
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
        autofocus: autofocus,
        maxLines: maxLines,
        onChanged: onChanged,
        onFieldSubmitted: onFieldSubmitted,
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

  Widget _buildDateTile({
    required String? dateStr,
    required bool isDark,
    required Color borderColor,
    required Color inkColor,
    required AppThemeDetails? details,
    required VoidCallback onPick,
    required VoidCallback onToday,
    required VoidCallback onClear,
  }) {
    final tileBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    String displayDate = 'NOT SET';
    if (dateStr != null) {
      final parsed = DateTime.tryParse(dateStr);
      if (parsed != null) {
        displayDate = DateFormat('MMM d, yyyy').format(parsed);
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: tileBg,
        border: Border.all(color: borderColor, width: 1.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onPick,
            child: Row(
              children: [
                Icon(Icons.calendar_today_rounded, size: 14, color: inkColor),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    displayDate,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: dateStr != null ? inkColor : inkColor.withValues(alpha: 0.4),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: onToday,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    border: Border.all(color: borderColor, width: 1),
                  ),
                  child: const Text(
                    'TODAY',
                    style: TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              if (dateStr != null)
                GestureDetector(
                  onTap: onClear,
                  child: Padding(
                    padding: const EdgeInsets.all(2),
                    child: Icon(Icons.close_rounded, size: 14, color: inkColor),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
