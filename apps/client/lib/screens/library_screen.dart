import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../widgets/book_card.dart';
import '../widgets/book_cover_card.dart';
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
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;
  final FocusNode _searchFocusNode = FocusNode();
  final TextEditingController _searchController = TextEditingController();

  List<Book> _books = [];
  bool _isLoading = true;
  String _selectedStatus = 'All';
  String _searchQuery = '';
  String _sortBy = 'updated_at'; // 'updated_at', 'title', 'progress', 'rating'
  bool _sortAscending = false;
  String _ratingFilter = 'All'; // 'All', '5', '4', 'unrated'
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
    _loadBooks();
  }

  @override
  void dispose() {
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
    final newProgress = book.progress + amount;
    final total = book.totalUnits;
    final clampedProgress = total != null && newProgress > total ? total : newProgress;

    String newStatus = book.status;
    if (clampedProgress > 0 && book.status == BookStatus.planToRead) {
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
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      bookId: book.id,
      fromProgress: book.progress,
      toProgress: clampedProgress,
      loggedAt: DateTime.now().toIso8601String(),
      syncStatus: 'pending_create',
    );
    await _dbHelper.insertReadingLog(logEntry);

    await _loadBooks();
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
            id: DateTime.now().millisecondsSinceEpoch.toString(),
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

  void _openSortFilterSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : AppColors.paperBg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                  width: AppTheme.borderHeavy,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'SORT & FILTER',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                      IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        icon: const Icon(Icons.close_rounded, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Sort Option Chips
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('SORT BY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
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
                              color: AppColors.primaryRed,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _sortAscending ? 'ASCENDING' : 'DESCENDING',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primaryRed,
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

                  // Rating Filters
                  const Text('RATING FILTER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
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

                  BrutalistButton(
                    isFullWidth: true,
                    onPressed: () {
                      Navigator.pop(ctx);
                      setState(() {});
                    },
                    child: const Text('APPLY FILTERS', style: TextStyle(color: Colors.white, fontSize: 13)),
                  ),
                ],
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
    return GestureDetector(
      onTap: () {
        setSheetState(() => _sortBy = value);
        setState(() => _sortBy = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryRed : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
          border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1.5),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
          ),
        ),
      ),
    );
  }

  Widget _buildRatingFilterChip(String label, String value, StateSetter setSheetState) {
    final isSelected = _ratingFilter == value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: () {
        setSheetState(() => _ratingFilter = value);
        setState(() => _ratingFilter = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryRed : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
          border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1.5),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
          ),
        ),
      ),
    );
  }

  Widget _buildViewModeIcon(IconData icon, LibraryViewMode mode, String tooltip) {
    final isSelected = _viewMode == mode;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: () => setState(() => _viewMode = mode),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          color: isSelected
              ? AppColors.primaryRed
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

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

      return matchesStatus && matchesSearch && matchesRating;
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

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.slash): () => _searchFocusNode.requestFocus(),
        const SingleActivator(LogicalKeyboardKey.keyN, control: true): () => _openEditDialog(),
        const SingleActivator(LogicalKeyboardKey.escape): () {
          _searchFocusNode.unfocus();
          if (_searchQuery.isNotEmpty) {
            _searchController.clear();
            setState(() => _searchQuery = '');
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
          body: Column(
            children: [
              // Search & Filter Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
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
                        child: TextField(
                          controller: _searchController,
                          focusNode: _searchFocusNode,
                          onChanged: (val) => setState(() => _searchQuery = val.trim()),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search books or authors... (Press /)',
                            hintStyle: TextStyle(
                              fontSize: 12,
                              color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.4),
                            ),
                            prefixIcon: Icon(Icons.search_rounded, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Sort & Filter Button
                    GestureDetector(
                      onTap: _openSortFilterSheet,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
                        decoration: BoxDecoration(
                          color: (_sortBy != 'updated_at' || _ratingFilter != 'All')
                              ? AppColors.primaryRed
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
                          children: [
                            Icon(
                              Icons.tune_rounded,
                              size: 18,
                              color: (_sortBy != 'updated_at' || _ratingFilter != 'All')
                                  ? Colors.white
                                  : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'SORT',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: (_sortBy != 'updated_at' || _ratingFilter != 'All')
                                    ? Colors.white
                                    : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // View Mode Switcher
                    Container(
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
              ),

              // Currently Reading Carousel (Active Reads)
              if (_searchQuery.isEmpty && (_selectedStatus == 'All' || _selectedStatus == BookStatus.reading)) ...[
                () {
                  final activeBooks = _books.where((b) => b.status == BookStatus.reading).toList();
                  if (activeBooks.isNotEmpty) {
                    return ReadingCarousel(
                      readingBooks: activeBooks,
                      onLogProgress: _openQuickLog,
                      onEdit: _openEditDialog,
                      onQuickIncrement: _quickIncrement,
                    );
                  }
                  return const SizedBox.shrink();
                }(),
              ],

              // Status Filter Tabs
              SizedBox(
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
                                ? AppColors.primaryRed
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
              ),
              const SizedBox(height: 8),

              // Book List / Adaptive Grid / Table
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const BrutalistBadge(label: 'NO BOOKS FOUND'),
                                const SizedBox(height: 12),
                                Text(
                                  _searchQuery.isNotEmpty ? 'Try a different search term' : 'Tap + to add your first book',
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.inkMuted),
                                ),
                                if (_selectedStatus != 'All' || _ratingFilter != 'All' || _searchQuery.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  TextButton(
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() {
                                        _selectedStatus = 'All';
                                        _ratingFilter = 'All';
                                        _searchQuery = '';
                                      });
                                    },
                                    child: const Text('CLEAR ALL FILTERS', style: TextStyle(fontWeight: FontWeight.w900)),
                                  ),
                                ],
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () async {
                              await _syncManager.syncNow();
                              await _loadBooks();
                            },
                            child: LayoutBuilder(
                              builder: (context, constraints) {
                                final isWideScreen = constraints.maxWidth >= 720;
                                final isExtraWide = constraints.maxWidth >= 1150;

                                // 1. COVER GRID / BOOKSHELF VIEW
                                if (_viewMode == LibraryViewMode.covers) {
                                  return GridView.builder(
                                    padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
                                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: isExtraWide ? 5 : (isWideScreen ? 3 : 2),
                                      childAspectRatio: 0.65,
                                      crossAxisSpacing: 10,
                                      mainAxisSpacing: 10,
                                    ),
                                    itemCount: filtered.length,
                                    itemBuilder: (context, index) {
                                      final book = filtered[index];
                                      return BookCoverCard(
                                        key: ValueKey(book.id),
                                        book: book,
                                        onLogProgress: () => _openQuickLog(book),
                                        onEdit: () => _openEditDialog(book),
                                        onQuickIncrement: (amt) => _quickIncrement(book, amt),
                                      );
                                    },
                                  );
                                }

                                // 2. COMPACT TABLE VIEW
                                if (_viewMode == LibraryViewMode.table) {
                                  return ListView.builder(
                                    padding: const EdgeInsets.only(bottom: 80, top: 4),
                                    itemCount: filtered.length,
                                    itemBuilder: (context, index) {
                                      final book = filtered[index];
                                      return BookTableRow(
                                        key: ValueKey(book.id),
                                        book: book,
                                        onLogProgress: () => _openQuickLog(book),
                                        onEdit: () => _openEditDialog(book),
                                        onQuickIncrement: (amt) => _quickIncrement(book, amt),
                                      );
                                    },
                                  );
                                }

                                // 3. STANDARD CARDS VIEW (Default)
                                if (isWideScreen) {
                                  return GridView.builder(
                                    padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
                                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: isExtraWide ? 3 : 2,
                                      childAspectRatio: isExtraWide ? 1.85 : 1.75,
                                      crossAxisSpacing: 12,
                                      mainAxisSpacing: 12,
                                    ),
                                    itemCount: filtered.length,
                                    itemBuilder: (context, index) {
                                      final book = filtered[index];
                                      return BookCard(
                                        key: ValueKey(book.id),
                                        book: book,
                                        onLogProgress: () => _openQuickLog(book),
                                        onEdit: () => _openEditDialog(book),
                                        onDelete: () async {
                                          await _dbHelper.deleteBook(book.id);
                                          await _loadBooks();
                                        },
                                        onQuickIncrement: (amt) => _quickIncrement(book, amt),
                                      );
                                    },
                                  );
                                }

                                return ListView.builder(
                                  padding: const EdgeInsets.only(bottom: 80, top: 4),
                                  itemCount: filtered.length,
                                  itemBuilder: (context, index) {
                                    final book = filtered[index];
                                    return BookCard(
                                      key: ValueKey(book.id),
                                      book: book,
                                      onLogProgress: () => _openQuickLog(book),
                                      onEdit: () => _openEditDialog(book),
                                      onDelete: () async {
                                        await _dbHelper.deleteBook(book.id);
                                        await _loadBooks();
                                      },
                                      onQuickIncrement: (amt) => _quickIncrement(book, amt),
                                    );
                                  },
                                );
                              },
                            ),
                          ),
              ),
            ],
          ),
          floatingActionButton: FloatingActionButton(
            backgroundColor: AppColors.primaryRed,
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
}
