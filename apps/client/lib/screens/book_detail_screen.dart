import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/book.dart';
import '../models/reading_journey.dart';
import '../services/database_helper.dart';
import '../services/reading_mutation_service.dart';
import '../services/sync/sync_manager.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/book_edit_dialog.dart';
import '../widgets/brutalist_widgets.dart';
import '../widgets/external_links_row.dart';
import '../widgets/quick_log_dialog.dart';

class BookDetailScreen extends StatefulWidget {
  final Book initialBook;
  final ValueChanged<Book>? onBookUpdated;
  final VoidCallback? onBookDeleted;

  const BookDetailScreen({
    super.key,
    required this.initialBook,
    this.onBookUpdated,
    this.onBookDeleted,
  });

  @override
  State<BookDetailScreen> createState() => _BookDetailScreenState();
}

class _BookDetailScreenState extends State<BookDetailScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ReadingMutationService _mutationService = ReadingMutationService.instance;
  final ThemeService _themeService = ThemeService.instance;

  late Book _book;
  List<ReadingLogEntry> _logs = [];
  List<ReadingJourney> _journeys = [];
  List<Book> _seriesSiblings = [];
  bool _isLoadingLogs = true;
  bool _isEditingNotes = false;
  late TextEditingController _notesEditController;

  @override
  void initState() {
    super.initState();
    _book = widget.initialBook;
    _notesEditController = TextEditingController(text: _book.notes ?? '');
    _loadAllDetails();
  }

  @override
  void dispose() {
    _notesEditController.dispose();
    super.dispose();
  }

  Future<void> _loadAllDetails() async {
    setState(() => _isLoadingLogs = true);
    final freshBook = await _dbHelper.getBook(_book.id) ?? _book;
    final logs = await _dbHelper.getReadingLogs(_book.id);
    final journeys = await _dbHelper.getReadingJourneys(_book.id);

    List<Book> seriesBooks = [];
    if (freshBook.seriesName != null && freshBook.seriesName!.trim().isNotEmpty) {
      final allBooks = await _dbHelper.getBooks();
      seriesBooks = allBooks
          .where((b) =>
              b.seriesName?.toLowerCase().trim() == freshBook.seriesName!.toLowerCase().trim())
          .toList()
        ..sort((a, b) => (a.seriesOrder ?? 0).compareTo(b.seriesOrder ?? 0));
    }

    if (mounted) {
      setState(() {
        _book = freshBook;
        _notesEditController.text = freshBook.notes ?? '';
        _logs = logs;
        _journeys = journeys;
        _seriesSiblings = seriesBooks;
        _isLoadingLogs = false;
      });
      widget.onBookUpdated?.call(freshBook);
    }
  }

  void _updateBook(Book updated) {
    setState(() {
      _book = updated;
      _notesEditController.text = updated.notes ?? '';
    });
    widget.onBookUpdated?.call(updated);
    _loadAllDetails();
  }

  Future<void> _quickIncrement(double amount) async {
    final total = _book.totalUnits;
    if (_book.status == BookStatus.completed && total != null && _book.progress >= total) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"${_book.title}" is already completed!'),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    _themeService.triggerHapticImpact();
    final updated = await _mutationService.advanceProgress(book: _book, delta: amount);
    _updateBook(updated);
  }

  Future<void> _quickIncrementBoth(int chaptersDelta, int volumesDelta) async {
    _themeService.triggerHapticImpact();
    final updated = await _mutationService.advanceMultiTierProgress(
      book: _book,
      chaptersDelta: chaptersDelta,
      volumesDelta: volumesDelta,
    );
    _updateBook(updated);
  }

  Future<void> _changeStatus(String newStatus) async {
    _themeService.triggerHapticClick();
    final updated = await _mutationService.changeStatus(book: _book, newStatus: newStatus);
    _updateBook(updated);
  }

  Future<void> _toggleFavorite() async {
    _themeService.triggerHapticClick();
    final updated = await _mutationService.toggleFavorite(book: _book);
    _updateBook(updated);
  }

  Future<void> _savePersonalNotes() async {
    final noteText = _notesEditController.text.trim();
    final updated = _book.copyWith(
      notes: noteText.isEmpty ? null : noteText,
      updatedAt: DateTime.now().toUtc().toIso8601String(),
      syncStatus: 'pending_update',
    );
    await _dbHelper.updateBook(updated);
    SyncManager.instance.scheduleSyncSoon();
    setState(() {
      _isEditingNotes = false;
    });
    _updateBook(updated);
  }

  void _openQuickLog() {
    showDialog(
      context: context,
      builder: (ctx) => QuickLogDialog(
        book: _book,
        onSave: (newProgress, note, {parentProgress}) async {
          final updated = await _mutationService.setProgress(
            book: _book,
            newProgress: newProgress,
            parentProgress: parentProgress,
            note: note,
          );
          _updateBook(updated);
        },
      ),
    );
  }

  void _openEditDialog() {
    showDialog(
      context: context,
      builder: (ctx) => BookEditDialog(
        book: _book,
        onSave: (savedBook, {simulatedLogs = const []}) async {
          await _dbHelper.updateBook(savedBook);
          if (simulatedLogs.isNotEmpty) {
            for (final log in simulatedLogs) {
              await _dbHelper.insertReadingLog(log);
            }
          }
          SyncManager.instance.scheduleSyncSoon();
          _updateBook(savedBook);
        },
        onDelete: (id) async {
          await _deleteBook();
        },
      ),
    );
  }

  Future<void> _deleteBook() async {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Text(
          'TRASH BOOK',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: inkColor),
        ),
        content: Text(
          'Are you sure you want to move "${_book.title}" to trash? You can restore it later from Trash.',
          style: TextStyle(fontSize: 13, color: inkColor.withValues(alpha: 0.8)),
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
                side: BorderSide(color: borderColor, width: 1.5),
                borderRadius: BorderRadius.zero,
              ),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('MOVE TO TRASH', style: TextStyle(fontWeight: FontWeight.w900)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _dbHelper.deleteBook(_book.id);
      SyncManager.instance.scheduleSyncSoon();
      widget.onBookDeleted?.call();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Moved "${_book.title}" to trash')),
        );
      }
    }
  }

  Future<void> _confirmDeleteLog(ReadingLogEntry log) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        title: const Text('DELETE READING LOG', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
        content: Text(
          'Delete session log for ${formatDisplayDate(log.loggedAt)} (+${formatNum((log.toProgress - (log.fromProgress ?? 0)).abs())})?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryRed, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('DELETE'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _dbHelper.deleteReadingLog(log.id);
      SyncManager.instance.scheduleSyncSoon();
      _loadAllDetails();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final scaffoldBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        shape: Border(
          bottom: BorderSide(
            color: borderColor,
            width: AppTheme.borderLight,
          ),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: inkColor),
          tooltip: 'Back',
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _book.title.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
            color: inkColor,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _book.isFavorite == true ? Icons.star_rounded : Icons.star_outline_rounded,
              color: _book.isFavorite == true ? const Color(0xFFFFB800) : inkColor,
            ),
            tooltip: _book.isFavorite == true ? 'Unfavorite' : 'Favorite',
            onPressed: _toggleFavorite,
          ),
          IconButton(
            icon: Icon(Icons.edit_note_rounded, color: inkColor),
            tooltip: 'Log Progress',
            onPressed: _openQuickLog,
          ),
          IconButton(
            icon: Icon(Icons.edit_outlined, color: inkColor),
            tooltip: 'Edit Details',
            onPressed: _openEditDialog,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.primaryRed),
            tooltip: 'Trash Book',
            onPressed: _deleteBook,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAllDetails,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 860),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHeroCard(context, isDark, details, borderColor, accentColor, inkColor),
                  const SizedBox(height: 16),
                  _buildReadingCockpit(context, isDark, details, borderColor, accentColor, inkColor),
                  const SizedBox(height: 16),
                  _buildSynopsisCard(context, isDark, details, borderColor, accentColor, inkColor),
                  const SizedBox(height: 16),
                  _buildPersonalNotesCard(context, isDark, details, borderColor, accentColor, inkColor),
                  const SizedBox(height: 16),
                  _buildShelvesAndTagsCard(context, isDark, details, borderColor, accentColor, inkColor),
                  if (_seriesSiblings.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildSeriesContinuityCard(context, isDark, details, borderColor, accentColor, inkColor),
                  ],
                  const SizedBox(height: 16),
                  _buildJourneysAndLogsCard(context, isDark, details, borderColor, accentColor, inkColor),
                  const SizedBox(height: 48),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final b = _book;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 3D Styled Cover Artwork
          Container(
            width: 108,
            height: 156,
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
              border: Border.all(color: borderColor, width: 2),
              boxShadow: [
                BoxShadow(
                  color: borderColor,
                  offset: const Offset(3, 3),
                  blurRadius: 0,
                ),
              ],
            ),
            child: b.coverUrl != null && b.coverUrl!.isNotEmpty
                ? Image.network(
                    b.coverUrl!,
                    fit: BoxFit.cover,
                    cacheWidth: 400,
                    errorBuilder: (_, __, ___) => _buildCoverFallback(b, accentColor),
                  )
                : _buildCoverFallback(b, accentColor),
          ),
          const SizedBox(width: 16),

          // Metadata Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  b.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                    color: inkColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  b.author != null && b.author!.isNotEmpty ? b.author! : 'Unknown Author',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: inkColor.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 10),

                // Badges Row
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    BrutalistBadge(
                      label: b.type.toUpperCase(),
                      backgroundColor: isDark ? Colors.white12 : AppColors.paperSurfaceHighest,
                      textColor: inkColor,
                    ),
                    if (b.seriesName != null && b.seriesName!.isNotEmpty)
                      BrutalistBadge(
                        label: '[${b.seriesName!.toUpperCase()}${b.seriesOrder != null ? " #${formatNum(b.seriesOrder!)}" : ""}]',
                        backgroundColor: accentColor.withValues(alpha: 0.15),
                        textColor: accentColor,
                      ),
                    if (b.rereadCount > 0)
                      const BrutalistBadge(
                        label: 'RE-READ',
                        backgroundColor: AppColors.electricCobalt,
                        textColor: Colors.white,
                      ),
                    if (b.rating != null && b.rating! > 0)
                      BrutalistBadge(
                        label: '${formatNum(b.rating!)} ★',
                        backgroundColor: const Color(0xFFFFB800),
                        textColor: AppColors.inkBlack,
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                // External Links Row
                if (b.sourceLink != null && b.sourceLink!.trim().isNotEmpty)
                  ExternalLinksRow(sourceLink: b.sourceLink),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCoverFallback(Book b, Color accentColor) {
    return Container(
      color: accentColor.withValues(alpha: 0.12),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.auto_stories_rounded, size: 28, color: accentColor),
          const SizedBox(height: 4),
          Text(
            b.title.isNotEmpty ? b.title.substring(0, 1).toUpperCase() : '?',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: accentColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReadingCockpit(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final b = _book;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'READING STATUS & COCKPIT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: inkColor,
                ),
              ),
              Text(
                '${b.completionPercentage.toInt()}%',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: accentColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Status Selector Chips
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              BookStatus.reading,
              BookStatus.planToRead,
              BookStatus.completed,
              BookStatus.onHold,
              BookStatus.dropped,
            ].map((st) {
              final isCur = b.status == st;
              return MouseRegion(
                cursor: SystemMouseCursors.click,
                child: GestureDetector(
                  onTap: () => _changeStatus(st),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isCur ? accentColor : (isDark ? AppColors.darkSurface : AppColors.paperSurface),
                      border: Border.all(color: isCur ? accentColor : borderColor, width: 1.5),
                      boxShadow: isCur
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
                      st.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        color: isCur ? Colors.white : inkColor,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),

          // Progress Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatProgressDisplay(b).toUpperCase(),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: inkColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.zero,
            child: LinearProgressIndicator(
              value: (b.completionPercentage / 100).clamp(0.0, 1.0),
              minHeight: 10,
              backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
              valueColor: AlwaysStoppedAnimation<Color>(accentColor),
            ),
          ),
          const SizedBox(height: 14),

          // Quick Increment Steppers
          Builder(
            builder: (context) {
              final unitLabel = getUnitLabel(b.type, b.unitType);
              final unitAbbr = unitLabel.startsWith('page')
                  ? 'Pg'
                  : unitLabel.startsWith('chapter')
                      ? 'Ch'
                      : unitLabel.startsWith('vol')
                          ? 'Vol'
                          : '';
              final quickOptions = getQuickChipOptions(b.type);

              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ...quickOptions.take(3).map(
                        (amt) => BrutalistButton(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          backgroundColor: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                          textColor: inkColor,
                          borderWidth: 1.5,
                          onPressed: () => _quickIncrement(amt.toDouble()),
                          child: Text(
                            '+$amt $unitAbbr'.trim(),
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: inkColor),
                          ),
                        ),
                      ),
                  if (b.progressStructure == 'volume_chapter' || b.parentProgress != null)
                    BrutalistButton(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      backgroundColor: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                      textColor: inkColor,
                      borderWidth: 1.5,
                      onPressed: () => _quickIncrementBoth(0, 1),
                      child: Text(
                        '+1 Vol',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: inkColor),
                      ),
                    ),
                  BrutalistButton(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    backgroundColor: accentColor,
                    textColor: Colors.white,
                    borderWidth: 1.5,
                    onPressed: _openQuickLog,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_calendar_rounded, size: 14, color: Colors.white),
                        SizedBox(width: 6),
                        Text(
                          'LOG PROGRESS',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),

          // Velocity & Forecast Callout
          _buildVelocityForecastWidget(b, borderColor, accentColor, isDark, inkColor),
        ],
      ),
    );
  }

  Widget _buildVelocityForecastWidget(
    Book b,
    Color borderColor,
    Color accentColor,
    bool isDark,
    Color inkColor,
  ) {
    if (b.status == BookStatus.completed) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: accentColor.withValues(alpha: 0.10),
          border: Border.all(color: accentColor.withValues(alpha: 0.4), width: 1.5),
        ),
        child: Row(
          children: [
            Icon(Icons.check_circle_rounded, size: 16, color: accentColor),
            const SizedBox(width: 8),
            Text(
              'COMPLETED BOOK',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: accentColor),
            ),
          ],
        ),
      );
    }

    if (b.status != BookStatus.reading || b.totalUnits == null || b.progress >= b.totalUnits!) {
      return const SizedBox.shrink();
    }

    final remaining = (b.totalUnits! - b.progress).clamp(0, double.infinity);
    double dailyPace = 0;

    if (b.readingPace != null && b.readingPace! > 0) {
      dailyPace = b.readingPace! / 7.0;
    } else if (b.dateStarted != null) {
      final start = DateTime.tryParse(b.dateStarted!);
      if (start != null) {
        final days = DateTime.now().difference(start).inDays.clamp(1, 99999);
        dailyPace = b.progress / days;
      }
    }

    if (dailyPace <= 0) return const SizedBox.shrink();

    final daysRemaining = (remaining / dailyPace).ceil();
    final finishDate = DateTime.now().add(Duration(days: daysRemaining));
    final formattedFinish = DateFormat('MMM d, yyyy').format(finishDate);
    final unit = b.unitType ?? 'pages';

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
        border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1.5),
      ),
      child: Row(
        children: [
          Icon(Icons.speed_rounded, size: 16, color: accentColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Est. finish by $formattedFinish (~${dailyPace.toStringAsFixed(1)} $unit/day)',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: inkColor.withValues(alpha: 0.85),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSynopsisCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final synopsis = _book.description?.trim();

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.menu_book_rounded, size: 16, color: accentColor),
              const SizedBox(width: 8),
              Text(
                'EDITORIAL SYNOPSIS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: inkColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (synopsis != null && synopsis.isNotEmpty)
            Text(
              synopsis,
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: inkColor.withValues(alpha: 0.9),
              ),
            )
          else
            Text(
              'No official synopsis provided. Tap edit to add book blurb or summary.',
              style: TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: inkColor.withValues(alpha: 0.5),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPersonalNotesCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.rate_review_rounded, size: 16, color: accentColor),
                  const SizedBox(width: 8),
                  Text(
                    'READER\'S PERSONAL NOTES & REVIEW',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: inkColor,
                    ),
                  ),
                ],
              ),
              if (!_isEditingNotes)
                GestureDetector(
                  onTap: () => setState(() => _isEditingNotes = true),
                  child: Text(
                    'EDIT',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: accentColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_isEditingNotes) ...[
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: TextField(
                controller: _notesEditController,
                maxLines: 4,
                autofocus: true,
                style: TextStyle(fontSize: 13, color: inkColor),
                decoration: InputDecoration(
                  hintText: 'Add personal thoughts, review, quotes...',
                  hintStyle: TextStyle(color: inkColor.withValues(alpha: 0.4)),
                  contentPadding: const EdgeInsets.all(10),
                  border: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                BrutalistButton(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  backgroundColor: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                  textColor: inkColor,
                  borderWidth: 1.5,
                  onPressed: () {
                    setState(() {
                      _isEditingNotes = false;
                      _notesEditController.text = _book.notes ?? '';
                    });
                  },
                  child: Text(
                    'CANCEL',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: inkColor),
                  ),
                ),
                const SizedBox(width: 8),
                BrutalistButton(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  backgroundColor: accentColor,
                  textColor: Colors.white,
                  borderWidth: 1.5,
                  onPressed: _savePersonalNotes,
                  child: const Text(
                    'SAVE NOTES',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                ),
              ],
            ),
          ] else ...[
            if (_book.notes != null && _book.notes!.trim().isNotEmpty)
              Text(
                _book.notes!,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: inkColor.withValues(alpha: 0.9),
                ),
              )
            else
              Text(
                'No personal notes recorded yet. Tap EDIT to add private thoughts and review.',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: inkColor.withValues(alpha: 0.5),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildShelvesAndTagsCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final shelves = _book.shelvesList;
    final tags = _book.tagsList;

    if (shelves.isEmpty && tags.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (shelves.isNotEmpty) ...[
            Row(
              children: [
                Icon(Icons.bookmark_added_rounded, size: 16, color: accentColor),
                const SizedBox(width: 8),
                Text(
                  'ASSIGNED SHELVES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: inkColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: shelves.map((s) {
                return BrutalistBadge(
                  label: '🔖 $s',
                  backgroundColor: isDark ? Colors.white12 : AppColors.paperSurfaceHighest,
                  textColor: inkColor,
                );
              }).toList(),
            ),
            if (tags.isNotEmpty) const SizedBox(height: 14),
          ],
          if (tags.isNotEmpty) ...[
            Row(
              children: [
                Icon(Icons.tag_rounded, size: 16, color: accentColor),
                const SizedBox(width: 8),
                Text(
                  'GENRES & SUBJECTS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: inkColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: tags.map((t) {
                return BrutalistBadge(
                  label: '#$t',
                  backgroundColor: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E2D0),
                  textColor: inkColor,
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSeriesContinuityCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.collections_bookmark_rounded, size: 16, color: accentColor),
              const SizedBox(width: 8),
              Text(
                'SERIES CONTINUITY & FRANCHISE (${_seriesSiblings.length} VOLUMES)',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: inkColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 140,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _seriesSiblings.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (ctx, idx) {
                final sibling = _seriesSiblings[idx];
                final isCurrent = sibling.id == _book.id;

                return GestureDetector(
                  onTap: isCurrent
                      ? null
                      : () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(
                              builder: (_) => BookDetailScreen(initialBook: sibling),
                            ),
                          );
                        },
                  child: Container(
                    width: 96,
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? accentColor.withValues(alpha: 0.15)
                          : (isDark ? AppColors.darkSurface : AppColors.paperSurface),
                      border: Border.all(
                        color: isCurrent ? accentColor : borderColor,
                        width: isCurrent ? 2 : 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'VOL #${sibling.seriesOrder != null ? formatNum(sibling.seriesOrder!) : (idx + 1)}',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w900,
                            color: isCurrent ? accentColor : inkColor.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Expanded(
                          child: Text(
                            sibling.title,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              height: 1.15,
                              color: inkColor,
                            ),
                          ),
                        ),
                        Text(
                          '${sibling.completionPercentage.toInt()}%',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: isCurrent ? accentColor : inkColor.withValues(alpha: 0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJourneysAndLogsCard(
    BuildContext context,
    bool isDark,
    AppThemeDetails? details,
    Color borderColor,
    Color accentColor,
    Color inkColor,
  ) {
    final cardBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: borderColor, width: AppTheme.borderHeavy),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: details?.shadowOffset ?? AppTheme.shadowOffset,
            blurRadius: 0,
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Journeys Section
          if (_journeys.isNotEmpty) ...[
            Row(
              children: [
                Icon(Icons.auto_stories_rounded, size: 16, color: accentColor),
                const SizedBox(width: 8),
                Text(
                  'READING JOURNEYS (${_journeys.length})',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: inkColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._journeys.map((j) {
              final isAct = j.status == 'reading';
              final startStr = formatDisplayDate(j.dateStarted);
              final finishStr = j.dateFinished != null ? formatDisplayDate(j.dateFinished!) : (isAct ? 'Active' : 'Finished');
              final durationStr = j.formattedDuration;
              final paceStr = j.formattedPace(_book.totalUnits, unitType: _book.unitType ?? 'pages');

              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: isAct ? AppColors.electricCobalt.withValues(alpha: 0.08) : (isDark ? AppColors.darkSurface : AppColors.paperSurface),
                  border: Border.all(color: isAct ? AppColors.electricCobalt : borderColor, width: isAct ? 1.5 : 1.0),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              j.journeyIndex == 1 ? 'Read #1 (Original)' : 'Read #${j.journeyIndex} (Re-read)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: isAct ? AppColors.electricCobalt : inkColor,
                              ),
                            ),
                            if (isAct) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.electricCobalt,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: const Text('CURRENT', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w900, color: Colors.white)),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$startStr → $finishStr${durationStr != null ? " • $durationStr" : ""}${paceStr != null ? " • $paceStr" : ""}',
                          style: TextStyle(
                            fontSize: 10,
                            color: inkColor.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                    if (j.rating != null && j.rating! > 0)
                      BrutalistBadge(
                        label: '${formatNum(j.rating!)} ★',
                        backgroundColor: const Color(0xFFFFB800),
                        textColor: AppColors.inkBlack,
                      ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 14),
          ],

          // Reading Logs Section
          Row(
            children: [
              Icon(Icons.history_edu_rounded, size: 16, color: accentColor),
              const SizedBox(width: 8),
              Text(
                'READING SESSION LOGS (${_logs.length})',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: inkColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_isLoadingLogs)
            const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
          else if (_logs.isEmpty)
            Text(
              'No reading session logs recorded yet.',
              style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: inkColor.withValues(alpha: 0.5)),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _logs.length,
              separatorBuilder: (_, __) => Divider(color: borderColor.withValues(alpha: 0.25), height: 12),
              itemBuilder: (ctx, idx) {
                final log = _logs[idx];
                final delta = (log.toProgress - (log.fromProgress ?? 0)).abs();
                final unitStr = _book.unitType ?? 'units';

                return Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                formatDisplayDate(log.loggedAt),
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: inkColor),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: accentColor.withValues(alpha: 0.15),
                                  border: Border.all(color: accentColor.withValues(alpha: 0.4), width: 1),
                                ),
                                child: Text(
                                  '+${formatNum(delta)} $unitStr',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: accentColor),
                                ),
                              ),
                            ],
                          ),
                          if (log.note != null && log.note!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              log.note!,
                              style: TextStyle(fontSize: 11, color: inkColor.withValues(alpha: 0.7)),
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded, size: 14, color: inkColor.withValues(alpha: 0.5)),
                      tooltip: 'Delete log',
                      onPressed: () => _confirmDeleteLog(log),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}
