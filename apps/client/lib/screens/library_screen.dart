import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../widgets/book_card.dart';
import '../widgets/book_edit_dialog.dart';
import '../widgets/brutalist_widgets.dart';
import '../widgets/quick_log_dialog.dart';

class LibraryScreen extends StatefulWidget {
  final VoidCallback onNavigateToSync;

  const LibraryScreen({super.key, required this.onNavigateToSync});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;

  List<Book> _books = [];
  bool _isLoading = true;
  String _selectedStatus = 'All';
  String _searchQuery = '';

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

    // Record reading log
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    final filtered = _books.where((b) {
      final matchesStatus = _selectedStatus == 'All' || b.status == _selectedStatus;
      final matchesSearch = _searchQuery.isEmpty ||
          b.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (b.author != null && b.author!.toLowerCase().contains(_searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    }).toList();

    return Scaffold(
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
          // Search Box
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                onChanged: (val) => setState(() => _searchQuery = val.trim()),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                ),
                decoration: InputDecoration(
                  hintText: 'Search your books or authors...',
                  hintStyle: TextStyle(
                    fontSize: 12,
                    color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.4),
                  ),
                  prefixIcon: Icon(Icons.search_rounded, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
            ),
          ),

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

          // Book List
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
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () async {
                          await _syncManager.syncNow();
                          await _loadBooks();
                        },
                        child: ListView.builder(
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
    );
  }
}
