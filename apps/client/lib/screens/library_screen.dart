import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/book_card.dart';
import '../widgets/book_cover_card.dart';
import '../widgets/book_detail_panel.dart';
import '../widgets/book_edit_dialog.dart';
import '../widgets/book_table_row.dart';
import '../widgets/brutalist_widgets.dart';
import '../widgets/quick_log_dialog.dart';
import '../widgets/reading_carousel.dart';

enum LibraryViewMode { cards, covers, table }

class LibraryScreen extends StatefulWidget {
  final VoidCallback onNavigateToSync;

  const LibraryScreen({super.key, required this.onNavigateToSync});

  @override
  State<LibraryScreen> createState() => LibraryScreenState();
}

class LibraryScreenState extends State<LibraryScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;
  final FocusNode _searchFocusNode = FocusNode();
  final TextEditingController _searchController = TextEditingController();

  void openAddBookDialog() => _openEditDialog();

  List<Book> _books = [];
  Book? _selectedBookForDetail;
  bool _isLoading = true;
  String _selectedStatus = 'All';
  String _searchQuery = '';
  bool _isSearchExpanded = false;
  String _sortBy = 'updated_at'; // 'updated_at', 'title', 'progress', 'rating'
  bool _sortAscending = false;
  String _ratingFilter = 'All'; // 'All', '5', '4', 'unrated'
  String _typeFilter = 'All'; // 'All', 'Web Novel', 'Light Novel', 'Novel', etc.
  LibraryViewMode _viewMode = LibraryViewMode.cards;

  final List<String> _statusFilters = [
    'All',
    BookStatus.reading,
    BookStatus.planToRead,
    BookStatus.completed,
    BookStatus.onHold,
    BookStatus.dropped,
  ];

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_onSearchFocusChanged);
    _loadBooks();
  }

  void _onSearchFocusChanged() {
    if (!_searchFocusNode.hasFocus && _searchQuery.isEmpty && _isSearchExpanded) {
      setState(() => _isSearchExpanded = false);
    }
  }

  @override
  void dispose() {
    _searchFocusNode.removeListener(_onSearchFocusChanged);
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadBooks() async {
    setState(() => _isLoading = true);
    final books = await _dbHelper.getBooks();
    setState(() {
      _books = books;
      _isLoading = false;
    });
  }

  Future<void> _quickIncrement(Book book, double amount) async {
    final total = book.totalUnits;
    if (book.status == BookStatus.completed && total != null && book.progress >= total) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${book.title}" is already completed!'),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    final newProgress = book.progress + amount;
    final clampedProgress = total != null && newProgress > total ? total : newProgress;

    String newStatus = book.status;
    if (clampedProgress > 0 && book.status == BookStatus.planToRead) {
      newStatus = BookStatus.reading;
    } else if (book.status == BookStatus.completed && clampedProgress > book.progress) {
      // Reopening ongoing book with new chapters
      newStatus = BookStatus.reading;
    }

    if (total != null && clampedProgress >= total) {
      newStatus = BookStatus.completed;
    }

    final updated = book.copyWith(
      progress: clampedProgress,
      status: newStatus,
      updatedAt: DateTime.now().toIso8601String(),
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updated);

    final logEntry = ReadingLogEntry(
      id: generateUuidV4(),
      bookId: book.id,
      fromProgress: book.progress,
      toProgress: clampedProgress,
      loggedAt: DateTime.now().toIso8601String(),
      syncStatus: 'pending_create',
    );
    await _dbHelper.insertReadingLog(logEntry);

    await _loadBooks();
  }

  void _onBookClick(Book book, bool isWideScreen) {
    if (isWideScreen) {
      setState(() {
        if (_selectedBookForDetail?.id == book.id) {
          _selectedBookForDetail = null; // Toggle closed
        } else {
          _selectedBookForDetail = book;
        }
      });
    } else {
      _openEditDialog(book);
    }
  }

  Future<void> _quickIncrementBoth(Book book, int chaptersDelta, int volumesDelta) async {
    double newProgress = book.progress + chaptersDelta;
    if (book.totalUnits != null && newProgress > book.totalUnits!) {
      newProgress = book.totalUnits!;
    }
    num? newParentProgress = book.parentProgress;
    if (volumesDelta > 0) {
      newParentProgress = (newParentProgress ?? 0) + volumesDelta;
      if (book.parentTotal != null && newParentProgress > book.parentTotal!) {
        newParentProgress = book.parentTotal!;
      }
    }

    String newStatus = book.status;
    if (newProgress > 0 && book.status == BookStatus.planToRead) {
      newStatus = BookStatus.reading;
    }
    if (book.totalUnits != null && newProgress >= book.totalUnits!) {
      newStatus = BookStatus.completed;
    }

    final updated = book.copyWith(
      progress: newProgress,
      parentProgress: newParentProgress,
      status: newStatus,
      updatedAt: DateTime.now().toIso8601String(),
      syncStatus: 'pending_update',
    );

    await _dbHelper.updateBook(updated);

    final logEntry = ReadingLogEntry(
      id: generateUuidV4(),
      bookId: book.id,
      fromProgress: book.progress,
      toProgress: newProgress,
      loggedAt: DateTime.now().toIso8601String(),
      syncStatus: 'pending_create',
    );
    await _dbHelper.insertReadingLog(logEntry);

    setState(() {
      _selectedBookForDetail = updated;
    });
    await _loadBooks();
  }

  Future<void> _deleteBook(Book book) async {
    await _dbHelper.deleteBook(book.id);
    setState(() {
      _selectedBookForDetail = null;
    });
    await _loadBooks();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Moved "${book.title}" to trash'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _openQuickLog(Book book) {
    showDialog(
      context: context,
      builder: (ctx) => QuickLogDialog(
        book: book,
        onSave: (newProgress, note) async {
          String newStatus = book.status;
          if (newProgress > 0 && book.status == BookStatus.planToRead) {
            newStatus = BookStatus.reading;
          } else if (book.status == BookStatus.completed && newProgress > book.progress) {
            newStatus = BookStatus.reading;
          }

          if (book.totalUnits != null && newProgress >= book.totalUnits!) {
            newStatus = BookStatus.completed;
          }

          final updated = book.copyWith(
            progress: newProgress,
            status: newStatus,
            updatedAt: DateTime.now().toIso8601String(),
            syncStatus: 'pending_update',
          );
          await _dbHelper.updateBook(updated);

          final logEntry = ReadingLogEntry(
            id: generateUuidV4(),
            bookId: book.id,
            fromProgress: book.progress,
            toProgress: newProgress,
            note: note,
            loggedAt: DateTime.now().toIso8601String(),
            syncStatus: 'pending_create',
          );
          await _dbHelper.insertReadingLog(logEntry);

          await _loadBooks();
        },
      ),
    );
  }

  void _openEditDialog([Book? book]) {
    showDialog(
      context: context,
      builder: (ctx) => BookEditDialog(
        book: book,
        onSave: (savedBook) async {
          if (book == null) {
            await _dbHelper.insertBook(savedBook);
          } else {
            await _dbHelper.updateBook(savedBook);
          }
          await _loadBooks();
        },
        onDelete: (id) async {
          await _dbHelper.deleteBook(id);
          await _loadBooks();
        },
      ),
    );
  }

  String _getSortShortLabel() {
    switch (_sortBy) {
      case 'title':
        return 'A-Z';
      case 'progress':
        return 'PROGRESS';
      case 'rating':
        return 'RATING';
      case 'updated_at':
      default:
        return 'RECENT';
    }
  }

  void _openSortFilterSheet() {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final sheetBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    bool showAllFormats = ['Novella', 'Novelette', 'Short Story', 'Anthology', 'Essay', 'Other'].contains(_typeFilter);

    const primaryFormats = [
      'Novel',
      'Web Novel',
      'Light Novel',
      'Collection',
      'Fanfiction',
    ];
    const moreFormats = [
      'Novella',
      'Novelette',
      'Short Story',
      'Anthology',
      'Essay',
      'Other',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;

            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: sheetBg,
                  border: Border.all(
                    color: borderColor,
                    width: AppTheme.borderHeavy,
                  ),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'SORT & FILTER',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: inkColor),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: Icon(Icons.close_rounded, size: 20, color: inkColor),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Sort Option Chips
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('SORT BY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: inkColor)),
                        GestureDetector(
                          onTap: () {
                            setSheetState(() => _sortAscending = !_sortAscending);
                            setState(() => _sortAscending = !_sortAscending);
                          },
                          child: Row(
                            children: [
                              Icon(
                                _sortAscending ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                                size: 14,
                                color: accentColor,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _sortAscending ? 'ASCENDING' : 'DESCENDING',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  color: accentColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildSortChip('Last Updated', 'updated_at', setSheetState),
                        _buildSortChip('Title (A-Z)', 'title', setSheetState),
                        _buildSortChip('Progress (%)', 'progress', setSheetState),
                        _buildSortChip('Rating (High)', 'rating', setSheetState),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Format / Type Filters
                    Text('FORMAT / TYPE FILTER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: inkColor)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildTypeFilterChip('All Formats', 'All', setSheetState),
                        ...primaryFormats.map((type) => _buildTypeFilterChip(type, type, setSheetState)),
                        if (showAllFormats)
                          ...moreFormats.map((type) => _buildTypeFilterChip(type, type, setSheetState)),
                        GestureDetector(
                          onTap: () {
                            setSheetState(() => showAllFormats = !showAllFormats);
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                              border: Border.all(color: borderColor, width: 1.5),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  showAllFormats ? Icons.remove_rounded : Icons.add_rounded,
                                  size: 13,
                                  color: accentColor,
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  showAllFormats ? 'LESS' : 'MORE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: accentColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Rating Filters
                    Text('RATING FILTER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5, color: inkColor)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildRatingFilterChip('All', 'All', setSheetState),
                        _buildRatingFilterChip('5 ★ Only', '5', setSheetState),
                        _buildRatingFilterChip('4 ★ & Above', '4', setSheetState),
                        _buildRatingFilterChip('Unrated', 'unrated', setSheetState),
                      ],
                    ),
                    const SizedBox(height: 20),

                    Row(
                      children: [
                        Expanded(
                          child: BrutalistButton(
                            backgroundColor: details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                            textColor: inkColor,
                            onPressed: () {
                              setSheetState(() {
                                _sortBy = 'updated_at';
                                _sortAscending = false;
                                _ratingFilter = 'All';
                                _typeFilter = 'All';
                              });
                              setState(() {
                                _sortBy = 'updated_at';
                                _sortAscending = false;
                                _ratingFilter = 'All';
                                _typeFilter = 'All';
                              });
                            },
                            child: const Text('RESET', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: BrutalistButton(
                            backgroundColor: accentColor,
                            textColor: Colors.white,
                            onPressed: () {
                              Navigator.pop(ctx);
                              setState(() {});
                            },
                            child: const Text('APPLY FILTERS', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}

  Widget _buildSortChip(String label, String value, StateSetter setSheetState) {
    final isSelected = _sortBy == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inactiveBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return GestureDetector(
      onTap: () {
        setSheetState(() => _sortBy = value);
        setState(() => _sortBy = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : inactiveBg,
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : inkColor,
          ),
        ),
      ),
    );
  }

  Widget _buildTypeFilterChip(String label, String value, StateSetter setSheetState) {
    final isSelected = _typeFilter == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inactiveBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return GestureDetector(
      onTap: () {
        setSheetState(() => _typeFilter = value);
        setState(() => _typeFilter = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : inactiveBg,
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : inkColor,
          ),
        ),
      ),
    );
  }

  Widget _buildRatingFilterChip(String label, String value, StateSetter setSheetState) {
    final isSelected = _ratingFilter == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inactiveBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return GestureDetector(
      onTap: () {
        setSheetState(() => _ratingFilter = value);
        setState(() => _ratingFilter = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : inactiveBg,
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : inkColor,
          ),
        ),
      ),
    );
  }

  Widget _buildViewModeIcon(IconData icon, LibraryViewMode mode, String tooltip) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final isSelected = _viewMode == mode;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: () => setState(() => _viewMode = mode),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          color: isSelected
              ? accentColor
              : Colors.transparent,
          child: Icon(
            icon,
            size: 18,
            color: isSelected
                ? Colors.white
                : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
          ),
        ),
      ),
    );
  }

  Widget _buildBookContentSliver({
    required List<Book> filtered,
    required bool isWideScreen,
    required bool isExtraWide,
    required AppThemeDetails? details,
  }) {
    if (_isLoading) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (filtered.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const BrutalistBadge(label: 'NO BOOKS FOUND'),
              const SizedBox(height: 12),
              Text(
                _searchQuery.isNotEmpty ? 'Try a different search term' : 'Tap + to add your first book',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.inkMuted),
              ),
              if (_selectedStatus != 'All' || _ratingFilter != 'All' || _typeFilter != 'All' || _searchQuery.isNotEmpty) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _selectedStatus = 'All';
                      _ratingFilter = 'All';
                      _typeFilter = 'All';
                      _searchQuery = '';
                    });
                  },
                  child: const Text('CLEAR ALL FILTERS', style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ],
            ],
          ),
        ),
      );
    }

    if (_viewMode == LibraryViewMode.covers) {
      return SliverPadding(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isExtraWide ? 5 : (isWideScreen ? 3 : 2),
            childAspectRatio: 0.65,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final book = filtered[index];
              return BookCoverCard(
                key: ValueKey(book.id),
                book: book,
                isSelected: _selectedBookForDetail?.id == book.id,
                onLogProgress: () => _openQuickLog(book),
                onEdit: () => _onBookClick(book, isWideScreen),
                onQuickIncrement: (amt) => _quickIncrement(book, amt),
              );
            },
            childCount: filtered.length,
          ),
        ),
      );
    }

    if (_viewMode == LibraryViewMode.table) {
      return SliverPadding(
        padding: const EdgeInsets.only(bottom: 80, top: 4),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final book = filtered[index];
              return BookTableRow(
                key: ValueKey(book.id),
                book: book,
                isSelected: _selectedBookForDetail?.id == book.id,
                onLogProgress: () => _openQuickLog(book),
                onEdit: () => _onBookClick(book, isWideScreen),
                onQuickIncrement: (amt) => _quickIncrement(book, amt),
              );
            },
            childCount: filtered.length,
          ),
        ),
      );
    }

    // Default Cards View
    if (isWideScreen) {
      return SliverPadding(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isExtraWide ? 3 : 2,
            childAspectRatio: isExtraWide ? 1.85 : 1.75,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final book = filtered[index];
              return BookCard(
                key: ValueKey(book.id),
                book: book,
                isSelected: _selectedBookForDetail?.id == book.id,
                onLogProgress: () => _openQuickLog(book),
                onEdit: () => _onBookClick(book, isWideScreen),
                onDelete: () async {
                  await _dbHelper.deleteBook(book.id);
                  await _loadBooks();
                },
                onQuickIncrement: (amt) => _quickIncrement(book, amt),
              );
            },
            childCount: filtered.length,
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.only(bottom: 80, top: 4),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final book = filtered[index];
            return BookCard(
              key: ValueKey(book.id),
              book: book,
              isSelected: _selectedBookForDetail?.id == book.id,
              onLogProgress: () => _openQuickLog(book),
              onEdit: () => _onBookClick(book, isWideScreen),
              onDelete: () async {
                await _dbHelper.deleteBook(book.id);
                await _loadBooks();
              },
              onQuickIncrement: (amt) => _quickIncrement(book, amt),
            );
          },
          childCount: filtered.length,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;

    // Filter books
    var filtered = _books.where((b) {
      final matchesStatus = _selectedStatus == 'All' || b.status == _selectedStatus;
      final matchesSearch = _searchQuery.isEmpty ||
          b.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (b.author != null && b.author!.toLowerCase().contains(_searchQuery.toLowerCase()));

      bool matchesRating = true;
      if (_ratingFilter == '5') {
        matchesRating = b.rating != null && b.rating! >= 5.0;
      } else if (_ratingFilter == '4') {
        matchesRating = b.rating != null && b.rating! >= 4.0;
      } else if (_ratingFilter == 'unrated') {
        matchesRating = b.rating == null || b.rating == 0;
      }

      bool matchesType = true;
      if (_typeFilter != 'All') {
        matchesType = b.type.toLowerCase() == _typeFilter.toLowerCase();
      }

      return matchesStatus && matchesSearch && matchesRating && matchesType;
    }).toList();

    // Sort books
    filtered.sort((a, b) {
      if (_sortBy == 'title') {
        return a.title.toLowerCase().compareTo(b.title.toLowerCase());
      } else if (_sortBy == 'progress') {
        return b.completionPercentage.compareTo(a.completionPercentage);
      } else if (_sortBy == 'rating') {
        final rA = a.rating ?? 0.0;
        final rB = b.rating ?? 0.0;
        return rB.compareTo(rA);
      } else {
        // default updated_at
        final dtA = DateTime.tryParse(a.updatedAt) ?? DateTime.fromMillisecondsSinceEpoch(0);
        final dtB = DateTime.tryParse(b.updatedAt) ?? DateTime.fromMillisecondsSinceEpoch(0);
        return dtB.compareTo(dtA);
      }
    });

    if (_sortAscending) {
      filtered = filtered.reversed.toList();
    }

    final isCustomFilterActive = _sortBy != 'updated_at' || _ratingFilter != 'All' || _typeFilter != 'All' || _sortAscending;
    final activeReadingBooks = _books.where((b) => b.status == BookStatus.reading).toList();
    final showCarousel = _searchQuery.isEmpty && (_selectedStatus == 'All' || _selectedStatus == BookStatus.reading) && activeReadingBooks.isNotEmpty;

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.slash): () {
          setState(() => _isSearchExpanded = true);
          _searchFocusNode.requestFocus();
        },
        const SingleActivator(LogicalKeyboardKey.keyF, control: true): () {
          setState(() => _isSearchExpanded = true);
          _searchFocusNode.requestFocus();
        },
        const SingleActivator(LogicalKeyboardKey.keyN, control: true): () => _openEditDialog(),
        const SingleActivator(LogicalKeyboardKey.keyS, control: true): () async {
          await _syncManager.syncNow();
          await _loadBooks();
        },
        const SingleActivator(LogicalKeyboardKey.digit1, control: true): () => setState(() => _viewMode = LibraryViewMode.cards),
        const SingleActivator(LogicalKeyboardKey.digit2, control: true): () => setState(() => _viewMode = LibraryViewMode.covers),
        const SingleActivator(LogicalKeyboardKey.digit3, control: true): () => setState(() => _viewMode = LibraryViewMode.table),
        const SingleActivator(LogicalKeyboardKey.escape): () {
          if (_selectedBookForDetail != null) {
            setState(() => _selectedBookForDetail = null);
          } else {
            _searchFocusNode.unfocus();
            _searchController.clear();
            setState(() {
              _searchQuery = '';
              _isSearchExpanded = false;
            });
          }
        },
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          appBar: AppBar(
            title: Row(
              children: [
                const Text(
                  'PAPERBACK READER',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                    border: Border.all(color: isDark ? Colors.white24 : AppColors.inkBlack, width: 1),
                  ),
                  child: Text(
                    'LEDGER',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                      color: isDark ? Colors.white70 : AppColors.inkBlack,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.settings_outlined),
                tooltip: 'Settings',
                onPressed: widget.onNavigateToSync,
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              await _syncManager.syncNow();
              await _loadBooks();
            },
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWideScreen = constraints.maxWidth >= 720;
                final isExtraWide = constraints.maxWidth >= 1150;
                final isMasterDetailScreen = constraints.maxWidth >= 840;

                final masterScrollView = CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    // Sliver 1: Animated Paper Scroll Search & Filter Toolbar
                    SliverToBoxAdapter(
                      child: _buildSearchAndToolbar(
                        isDark: isDark,
                        borderColor: borderColor,
                        accentColor: accentColor,
                        isCustomFilterActive: isCustomFilterActive,
                      ),
                    ),

                    // Sliver 2: Currently Reading Carousel (Smoothly scrolls away with page!)
                    if (showCarousel)
                      SliverToBoxAdapter(
                        child: ReadingCarousel(
                          readingBooks: activeReadingBooks,
                          onLogProgress: _openQuickLog,
                          onEdit: (b) => _onBookClick(b, isWideScreen),
                          onQuickIncrement: _quickIncrement,
                        ),
                      ),

                    // Sliver 3: Status Filter Horizontal Tabs (Fluid or Sticky Pinned based on Setting)
                    ThemeService.instance.stickyStatusFilter
                        ? SliverPersistentHeader(
                            pinned: true,
                            delegate: _StickyStatusFilterDelegate(
                              backgroundColor: details?.canvasColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg),
                              child: _buildStatusFilterTabs(accentColor, borderColor, isDark),
                            ),
                          )
                        : SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: _buildStatusFilterTabs(accentColor, borderColor, isDark),
                            ),
                          ),
                    const SliverToBoxAdapter(child: SizedBox(height: 6)),

                    // Sliver 4: Unified Book Content Grid/List/Table
                    _buildBookContentSliver(
                      filtered: filtered,
                      isWideScreen: isWideScreen,
                      isExtraWide: isExtraWide,
                      details: details,
                    ),
                  ],
                );

                if (isMasterDetailScreen && _selectedBookForDetail != null) {
                  return Row(
                    children: [
                      Expanded(child: masterScrollView),
                      BookDetailPanel(
                        book: _selectedBookForDetail!,
                        onClose: () => setState(() => _selectedBookForDetail = null),
                        onUpdateBook: (b) async {
                          await _loadBooks();
                          setState(() => _selectedBookForDetail = b);
                        },
                        onOpenFullEdit: () => _openEditDialog(_selectedBookForDetail),
                        onOpenQuickLog: () => _openQuickLog(_selectedBookForDetail!),
                        onDelete: () => _deleteBook(_selectedBookForDetail!),
                        onQuickIncrement: (c, v) => _quickIncrementBoth(_selectedBookForDetail!, c, v),
                      ),
                    ],
                  );
                }

                return masterScrollView;
              },
            ),
          ),
          floatingActionButton: FloatingActionButton(
            backgroundColor: accentColor,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              side: BorderSide(
                color: borderColor,
                width: AppTheme.borderHeavy,
              ),
              borderRadius: BorderRadius.zero,
            ),
            elevation: 0,
            onPressed: () => _openEditDialog(),
            child: const Icon(Icons.add, size: 28),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchAndToolbar({
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required bool isCustomFilterActive,
  }) {
    final hasText = _searchQuery.isNotEmpty;
    final isFocusOrText = _isSearchExpanded || hasText;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // 1. Dynamic Unfolding Chinese Paper Scroll Search Bar
          Expanded(
            flex: isFocusOrText ? 10 : 4,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              height: 42,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                border: Border.all(
                  color: isFocusOrText ? accentColor : borderColor,
                  width: isFocusOrText ? 2.0 : 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: borderColor,
                    offset: AppTheme.shadowOffsetSm,
                    blurRadius: 0,
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  Icon(
                    Icons.search_rounded,
                    size: 18,
                    color: isFocusOrText ? accentColor : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      onTap: () {
                        if (!_isSearchExpanded) {
                          setState(() => _isSearchExpanded = true);
                        }
                      },
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val.trim();
                          if (val.isNotEmpty) _isSearchExpanded = true;
                        });
                      },
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                      decoration: InputDecoration(
                        hintText: isFocusOrText ? 'Search title, author...' : 'SEARCH',
                        hintStyle: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  if (hasText) ...[
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                          _isSearchExpanded = false;
                        });
                        _searchFocusNode.unfocus();
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(
                          Icons.close_rounded,
                          size: 16,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                    ),
                  ] else if (!isFocusOrText) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        '/',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.4),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 2. Sort & Filter Pill (Animated smoothly)
          AnimatedSize(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            child: GestureDetector(
              onTap: _openSortFilterSheet,
              child: Container(
                height: 42,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: isCustomFilterActive
                      ? accentColor
                      : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                  border: Border.all(color: borderColor, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: borderColor,
                      offset: AppTheme.shadowOffsetSm,
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.tune_rounded,
                      size: 16,
                      color: isCustomFilterActive
                          ? Colors.white
                          : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                    ),
                    if (!isFocusOrText) ...[
                      const SizedBox(width: 4),
                      Text(
                        _getSortShortLabel(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isCustomFilterActive
                              ? Colors.white
                              : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),

          // 3. Direction Flip Button (▲ / ▼)
          GestureDetector(
            onTap: () => setState(() => _sortAscending = !_sortAscending),
            child: Container(
              height: 42,
              width: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                border: Border.all(color: borderColor, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: borderColor,
                    offset: AppTheme.shadowOffsetSm,
                    blurRadius: 0,
                  ),
                ],
              ),
              child: Icon(
                _sortAscending ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                size: 16,
                color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
              ),
            ),
          ),
          const SizedBox(width: 6),

          // 4. View Mode Switcher
          Container(
            height: 42,
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
              border: Border.all(color: borderColor, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: borderColor,
                  offset: AppTheme.shadowOffsetSm,
                  blurRadius: 0,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildViewModeIcon(Icons.view_agenda_rounded, LibraryViewMode.cards, 'Cards'),
                _buildViewModeIcon(Icons.grid_view_rounded, LibraryViewMode.covers, 'Covers'),
                _buildViewModeIcon(Icons.table_rows_rounded, LibraryViewMode.table, 'Table'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilterTabs(Color accentColor, Color borderColor, bool isDark) {
    return SizedBox(
      height: 38,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _statusFilters.length,
        itemBuilder: (context, idx) {
          final status = _statusFilters[idx];
          final isSelected = _selectedStatus == status;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedStatus = status),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected
                      ? accentColor
                      : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                  border: Border.all(
                    color: borderColor,
                    width: 1.5,
                  ),
                ),
                alignment: Alignment.center,
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isSelected
                        ? Colors.white
                        : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StickyStatusFilterDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final Color backgroundColor;

  _StickyStatusFilterDelegate({
    required this.child,
    required this.backgroundColor,
  });

  @override
  double get minExtent => 46.0;
  @override
  double get maxExtent => 46.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: backgroundColor,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: child,
    );
  }

  @override
  bool shouldRebuild(covariant _StickyStatusFilterDelegate oldDelegate) {
    return oldDelegate.child != child || oldDelegate.backgroundColor != backgroundColor;
  }
}
