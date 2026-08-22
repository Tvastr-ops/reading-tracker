import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/reading_mutation_service.dart';
import '../services/sync/sync_manager.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
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
  final ReadingMutationService _mutationService = ReadingMutationService.instance;
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
    final defaultModeStr = ThemeService.instance.defaultViewMode;
    if (defaultModeStr == 'covers') {
      _viewMode = LibraryViewMode.covers;
    } else if (defaultModeStr == 'table') {
      _viewMode = LibraryViewMode.table;
    } else {
      _viewMode = LibraryViewMode.cards;
    }
    _searchFocusNode.addListener(_onSearchFocusChanged);
    ThemeService.instance.addListener(_onThemeSettingsChanged);
    _loadBooks();
  }

  void _onThemeSettingsChanged() {
    if (mounted) setState(() {});
  }

  void _onSearchFocusChanged() {
    if (!_searchFocusNode.hasFocus && _searchQuery.isEmpty && _isSearchExpanded) {
      setState(() => _isSearchExpanded = false);
    }
  }

  @override
  void dispose() {
    ThemeService.instance.removeListener(_onThemeSettingsChanged);
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

    final updated = await _mutationService.advanceProgress(book: book, delta: amount);
    if (_selectedBookForDetail?.id == book.id) {
      setState(() => _selectedBookForDetail = updated);
    }
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
    final updated = await _mutationService.advanceMultiTierProgress(
      book: book,
      chaptersDelta: chaptersDelta,
      volumesDelta: volumesDelta,
    );
    setState(() {
      _selectedBookForDetail = updated;
    });
    await _loadBooks();
  }

  Future<void> _toggleFavorite(Book book) async {
    final updated = await _mutationService.toggleFavorite(book: book);
    if (_selectedBookForDetail?.id == book.id) {
      setState(() => _selectedBookForDetail = updated);
    }
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

  void _showBookContextMenu(BuildContext context, TapDownDetails details, Book book, bool isWideScreen) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeDetails = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = themeDetails?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final menuBg = themeDetails?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inkColor = themeDetails?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = themeDetails?.accentColor ?? Theme.of(context).colorScheme.primary;

    final position = RelativeRect.fromRect(
      details.globalPosition & const Size(40, 40),
      Offset.zero & MediaQuery.of(context).size,
    );

    showMenu<String>(
      context: context,
      position: position,
      color: menuBg,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: borderColor, width: AppTheme.borderLight),
        borderRadius: BorderRadius.zero,
      ),
      elevation: 4,
      items: [
        PopupMenuItem<String>(
          value: 'edit',
          child: Row(
            children: [
              Icon(Icons.edit_outlined, size: 16, color: inkColor),
              const SizedBox(width: 10),
              Text('Edit Details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: inkColor)),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'log',
          child: Row(
            children: [
              Icon(Icons.edit_calendar_rounded, size: 16, color: accentColor),
              const SizedBox(width: 10),
              Text('Quick Log Progress', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: inkColor)),
            ],
          ),
        ),
        PopupMenuItem<String>(
          value: 'favorite',
          child: Row(
            children: [
              Icon(
                book.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                size: 16,
                color: AppColors.primaryRed,
              ),
              const SizedBox(width: 10),
              Text(
                book.isFavorite == true ? 'Unmark Favorite' : 'Mark Favorite',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: inkColor),
              ),
            ],
          ),
        ),
        const PopupMenuDivider(height: 1),
        const PopupMenuItem<String>(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline_rounded, size: 16, color: AppColors.primaryRed),
              SizedBox(width: 10),
              Text('Move to Trash', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primaryRed)),
            ],
          ),
        ),
      ],
    ).then((value) {
      if (value == 'edit') {
        _onBookClick(book, isWideScreen);
      } else if (value == 'log') {
        _openQuickLog(book);
      } else if (value == 'favorite') {
        _toggleFavorite(book);
      } else if (value == 'delete') {
        _deleteBook(book);
      }
    });
  }

  void _openQuickLog(Book book) {
    showDialog(
      context: context,
      builder: (ctx) => QuickLogDialog(
        book: book,
        onSave: (newProgress, note) async {
          final updated = await _mutationService.setProgress(
            book: book,
            newProgress: newProgress,
            note: note,
          );
          if (_selectedBookForDetail?.id == book.id) {
            setState(() => _selectedBookForDetail = updated);
          }
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
            // Ensure the newly added book is visible even if user was filtered to a specific status
            if (_selectedStatus != 'All' && _selectedStatus != savedBook.status) {
              setState(() {
                _selectedStatus = 'All';
                _ratingFilter = 'All';
                _typeFilter = 'All';
              });
            }
          } else {
            await _dbHelper.updateBook(savedBook);
            if (_selectedBookForDetail?.id == savedBook.id) {
              setState(() {
                _selectedBookForDetail = savedBook;
              });
            }
          }
          await _loadBooks();
          _syncManager.syncNow();
        },
        onDelete: (id) async {
          await _dbHelper.deleteBook(id);
          if (_selectedBookForDetail?.id == id) {
            setState(() {
              _selectedBookForDetail = null;
            });
          }
          await _loadBooks();
          _syncManager.syncNow();
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
      backgroundColor: Colors.transparent,
      elevation: 0,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;

            return Center(
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: 540,
                  maxHeight: MediaQuery.of(context).size.height * 0.85,
                ),
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: sheetBg,
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

    final isCompact = ThemeService.instance.compactMode;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_viewMode == LibraryViewMode.covers) {
      return SliverPadding(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: isWideScreen ? (isCompact ? 140 : 180) : (isCompact ? 120 : 180),
            childAspectRatio: 0.65,
            crossAxisSpacing: isCompact ? 8 : 10,
            mainAxisSpacing: isCompact ? 8 : 10,
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
                onToggleFavorite: () => _toggleFavorite(book),
                onContextMenu: (d) => _showBookContextMenu(context, d, book, isWideScreen),
              );
            },
            childCount: filtered.length,
          ),
        ),
      );
    }

    if (_viewMode == LibraryViewMode.table) {
      return SliverMainAxisGroup(
        slivers: [
          if (isWideScreen)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 4),
                child: Row(
                  children: [
                    const SizedBox(width: 44),
                    Expanded(
                      flex: 4,
                      child: Text(
                        'TITLE & AUTHOR',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 140,
                      child: Text(
                        'FORMAT / STATUS',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 60,
                      child: Text(
                        'RATING',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    SizedBox(
                      width: 170,
                      child: Text(
                        'PROGRESS',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 130,
                      child: Text(
                        'ACTIONS',
                        textAlign: TextAlign.end,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          SliverPadding(
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
                    onToggleFavorite: () => _toggleFavorite(book),
                    onContextMenu: (d) => _showBookContextMenu(context, d, book, isWideScreen),
                  );
                },
                childCount: filtered.length,
              ),
            ),
          ),
        ],
      );
    }

    // Default Cards View
    if (isWideScreen) {
      return SliverPadding(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 80),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: isCompact ? 360 : 420,
            mainAxisExtent: isCompact ? 218 : 255,
            crossAxisSpacing: isCompact ? 8 : 12,
            mainAxisSpacing: isCompact ? 8 : 12,
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
                onToggleFavorite: () => _toggleFavorite(book),
                onContextMenu: (d) => _showBookContextMenu(context, d, book, isWideScreen),
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
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: isCompact ? 4 : 8),
              child: BookCard(
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
                onToggleFavorite: () => _toggleFavorite(book),
                onContextMenu: (d) => _showBookContextMenu(context, d, book, isWideScreen),
              ),
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
      final q = _searchQuery.toLowerCase();
      bool matchesSearch = false;
      if (_searchQuery.isEmpty) {
        matchesSearch = true;
      } else if (q.startsWith('#') || q.startsWith('tag:')) {
        final tagQuery = (q.startsWith('#') ? q.substring(1) : q.substring(4)).trim();
        matchesSearch = tagQuery.isEmpty ||
            (b.genreTags != null && b.genreTags!.toLowerCase().contains(tagQuery));
      } else {
        matchesSearch = b.title.toLowerCase().contains(q) ||
            (b.author != null && b.author!.toLowerCase().contains(q)) ||
            (b.genreTags != null && b.genreTags!.toLowerCase().contains(q)) ||
            b.type.toLowerCase().contains(q);
      }

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
    final showCarousel = ThemeService.instance.showReadingCarousel &&
        _searchQuery.isEmpty &&
        (_selectedStatus == 'All' || _selectedStatus == BookStatus.reading) &&
        activeReadingBooks.isNotEmpty;
    
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
        const SingleActivator(LogicalKeyboardKey.f11): () => ThemeService.instance.toggleFullscreen(),
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
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWideScreen = constraints.maxWidth >= 720;
            final isExtraWide = constraints.maxWidth >= 1150;
            final isMasterDetailScreen = constraints.maxWidth >= 840;
            final activeReadingCount = _books.where((b) => b.status == BookStatus.reading).length;

            final masterScrollView = CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // Sliver 0: Paper Masthead on Desktop (or Mobile Header)
                if (isWideScreen)
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : Colors.white,
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
                          // Bookmark Ribbon Tag
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: accentColor,
                              border: Border.all(color: borderColor, width: 1.5),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.bookmark_rounded, size: 13, color: Colors.white),
                                SizedBox(width: 4),
                                Text(
                                  'READING LOG',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 10.5,
                                    letterSpacing: 0.5,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '${_books.length} BOOKS TOTAL • $activeReadingCount IN PROGRESS',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.3,
                                color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                              ),
                            ),
                          ),
                          if (_syncManager.offlineMode)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
                                border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1),
                              ),
                              child: Text(
                                'OFFLINE',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w900,
                                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

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

                // Sliver 3: Paper Tabs with Live Status Counts
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

            return Scaffold(
              appBar: !isWideScreen
                  ? AppBar(
                      title: Row(
                        children: [
                          const Text(
                            'PAPERBACK',
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
                              '${_books.length} BOOKS',
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
                    )
                  : null,
              body: RefreshIndicator(
                onRefresh: () async {
                  await _syncManager.syncNow();
                  await _loadBooks();
                },
                child: isMasterDetailScreen && _selectedBookForDetail != null
                    ? Row(
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
                            onToggleFavorite: () => _toggleFavorite(_selectedBookForDetail!),
                            onQuickIncrement: (c, v) => _quickIncrementBoth(_selectedBookForDetail!, c, v),
                            onTagClick: (tag) {
                              _searchController.text = '#$tag';
                              setState(() {
                                _searchQuery = '#$tag';
                                _isSearchExpanded = true;
                              });
                            },
                          ),
                        ],
                      )
                    : masterScrollView,
              ),
              floatingActionButton: !isWideScreen
                  ? FloatingActionButton(
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
                    )
                  : null,
            );
          },
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
          final count = status == 'All'
              ? _books.length
              : _books.where((b) => b.status == status).length;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedStatus = status),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isSelected
                            ? Colors.white
                            : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.25)
                            : (isDark ? Colors.white10 : AppColors.paperSurfaceHighest),
                        border: Border.all(
                          color: isSelected ? Colors.white60 : borderColor.withValues(alpha: 0.3),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                        ),
                      ),
                    ),
                  ],
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
