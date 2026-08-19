import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';

class TrashScreen extends StatefulWidget {
  final VoidCallback onDataChanged;

  const TrashScreen({super.key, required this.onDataChanged});

  @override
  State<TrashScreen> createState() => _TrashScreenState();
}

class _TrashScreenState extends State<TrashScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  List<Book> _trashBooks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTrash();
  }

  Future<void> _loadTrash() async {
    setState(() => _isLoading = true);
    final books = await _dbHelper.getTrashBooks();
    setState(() {
      _trashBooks = books;
      _isLoading = false;
    });
  }

  Future<void> _restoreBook(Book book) async {
    await _dbHelper.restoreBook(book.id);
    widget.onDataChanged();
    await _loadTrash();
    SyncManager.instance.syncNow();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Restored "${book.title}" to Library')),
      );
    }
  }

  Future<void> _permanentDelete(Book book) async {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Text('PERMANENTLY DELETE', style: TextStyle(fontWeight: FontWeight.w900, color: inkColor)),
        content: Text(
          'Are you sure you want to permanently delete "${book.title}"? This cannot be undone.',
          style: TextStyle(color: mutedInk),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('CANCEL', style: TextStyle(color: inkColor, fontWeight: FontWeight.w800)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryRed,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: borderColor, width: 1),
                borderRadius: BorderRadius.zero,
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('DELETE FOREVER', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _dbHelper.permanentDeleteBook(book.id);
      widget.onDataChanged();
      await _loadTrash();
      SyncManager.instance.syncNow();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Permanently removed "${book.title}"')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'TRASH / ARCHIVE',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 18),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _trashBooks.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      BrutalistBadge(label: 'TRASH IS EMPTY'),
                      SizedBox(height: 12),
                      Text(
                        'No deleted books found',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.inkMuted),
                      ),
                    ],
                  ),
                )
              : LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 840;

                  if (isWide) {
                    return GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 2.4,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 14,
                      ),
                      itemCount: _trashBooks.length,
                      itemBuilder: (context, index) {
                        final book = _trashBooks[index];
                        return BrutalistCard(
                          key: ValueKey(book.id),
                          margin: EdgeInsets.zero,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      book.title.toUpperCase(),
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const BrutalistBadge(
                                    label: 'DELETED',
                                    backgroundColor: AppColors.primaryRed,
                                    textColor: Colors.white,
                                  ),
                                ],
                              ),
                              if (book.author != null) ...[
                                const SizedBox(height: 2),
                                Text(
                                  book.author!,
                                  style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                                ),
                              ],
                              const Spacer(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  BrutalistButton(
                                    backgroundColor: Colors.white,
                                    textColor: AppColors.inkBlack,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onPressed: () => _restoreBook(book),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.restore_rounded, size: 16, color: AppColors.inkBlack),
                                        SizedBox(width: 4),
                                        Text('RESTORE'),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  BrutalistButton(
                                    backgroundColor: AppColors.primaryRed,
                                    textColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    onPressed: () => _permanentDelete(book),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.delete_forever_rounded, size: 16, color: Colors.white),
                                        SizedBox(width: 4),
                                        Text('PURGE'),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: _trashBooks.length,
                    itemBuilder: (context, index) {
                      final book = _trashBooks[index];
                      return BrutalistCard(
                        key: ValueKey(book.id),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    book.title.toUpperCase(),
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const BrutalistBadge(
                                  label: 'DELETED',
                                  backgroundColor: AppColors.primaryRed,
                                  textColor: Colors.white,
                                ),
                              ],
                            ),
                            if (book.author != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                book.author!,
                                style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                              ),
                            ],
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                BrutalistButton(
                                  backgroundColor: Colors.white,
                                  textColor: AppColors.inkBlack,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  onPressed: () => _restoreBook(book),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.restore_rounded, size: 16, color: AppColors.inkBlack),
                                      SizedBox(width: 4),
                                      Text('RESTORE'),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                BrutalistButton(
                                  backgroundColor: AppColors.primaryRed,
                                  textColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  onPressed: () => _permanentDelete(book),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.delete_forever_rounded, size: 16, color: Colors.white),
                                      SizedBox(width: 4),
                                      Text('PURGE'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
    );
  }
}
