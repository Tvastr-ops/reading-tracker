import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/book.dart';
import '../models/reading_journey.dart';
import '../services/database_helper.dart';
import '../services/reading_mutation_service.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import 'brutalist_widgets.dart';

class BookDetailPanel extends StatefulWidget {
  final Book book;
  final VoidCallback onClose;
  final ValueChanged<Book> onUpdateBook;
  final VoidCallback onOpenFullEdit;
  final VoidCallback onOpenQuickLog;
  final VoidCallback onDelete;
  final VoidCallback? onToggleFavorite;
  final Future<void> Function(int chaptersDelta, int volumesDelta)? onQuickIncrement;
  final ValueChanged<String>? onTagClick;

  const BookDetailPanel({
    super.key,
    required this.book,
    required this.onClose,
    required this.onUpdateBook,
    required this.onOpenFullEdit,
    required this.onOpenQuickLog,
    required this.onDelete,
    this.onToggleFavorite,
    this.onQuickIncrement,
    this.onTagClick,
  });

  @override
  State<BookDetailPanel> createState() => _BookDetailPanelState();
}

class _BookDetailPanelState extends State<BookDetailPanel> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ReadingMutationService _mutationService = ReadingMutationService.instance;
  List<ReadingLogEntry> _logs = [];
  List<ReadingJourney> _journeys = [];
  bool _showAllJourneys = false;
  bool _isLoadingLogs = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void didUpdateWidget(covariant BookDetailPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.book.id != widget.book.id) {
      _loadData();
    }
  }

  Future<void> _loadData() async {
    setState(() => _isLoadingLogs = true);
    final logs = await _dbHelper.getReadingLogs(widget.book.id);
    final journeys = await _dbHelper.getReadingJourneys(widget.book.id);
    if (mounted) {
      setState(() {
        _logs = logs;
        _journeys = journeys;
        _isLoadingLogs = false;
      });
    }
  }

  Future<void> _changeStatus(String newStatus) async {
    final updated = await _mutationService.changeStatus(book: widget.book, newStatus: newStatus);
    widget.onUpdateBook(updated);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final surfaceColor = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final b = widget.book;

    return Container(
      width: 380,
      decoration: BoxDecoration(
        color: surfaceColor,
        border: Border(
          left: BorderSide(
            color: borderColor,
            width: AppTheme.borderHeavy,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.15),
            offset: const Offset(-4, 0),
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        children: [
          // Header Bar with Close Button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
              border: Border(
                bottom: BorderSide(
                  color: borderColor,
                  width: AppTheme.borderLight,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.auto_stories_rounded,
                      size: 18,
                      color: accentColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'BOOK INSPECTOR',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                    ),
                  ],
                ),
                MouseRegion(
                  cursor: SystemMouseCursors.click,
                  child: GestureDetector(
                    onTap: widget.onClose,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        border: Border.all(color: borderColor, width: 1.5),
                        color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                      ),
                      child: Icon(
                        Icons.close_rounded,
                        size: 16,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Scrollable Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top Meta Card: Cover, Title, Author, Type, Rating
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cover Thumbnail
                    Container(
                      width: 72,
                      height: 104,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                        border: Border.all(color: borderColor, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: borderColor,
                            offset: AppTheme.shadowOffsetSm,
                            blurRadius: 0,
                          ),
                        ],
                      ),
                      child: b.coverUrl != null && b.coverUrl!.isNotEmpty
                          ? Image.network(
                              b.coverUrl!,
                              fit: BoxFit.cover,
                              cacheWidth: 320,
                              errorBuilder: (_, __, ___) => _buildCoverFallback(b, accentColor),
                            )
                          : _buildCoverFallback(b, accentColor),
                    ),
                    const SizedBox(width: 14),

                    // Title, Author, Type, Rating
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            b.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            b.author != null && b.author!.isNotEmpty ? b.author! : 'Unknown Author',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Badges Row
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              BrutalistBadge(
                                label: b.type.toUpperCase(),
                                backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
                                textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
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
                              ...b.shelvesList.map(
                                (shelf) => BrutalistBadge(
                                  label: '🔖 $shelf',
                                  backgroundColor: isDark ? Colors.white12 : AppColors.paperSurfaceHighest,
                                  textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                ),
                              ),
                              if (b.genreTags != null && b.genreTags!.trim().isNotEmpty)
                                ...b.genreTags!
                                    .split(',')
                                    .map((t) => t.trim())
                                    .where((t) => t.isNotEmpty)
                                    .map(
                                      (tag) => MouseRegion(
                                        cursor: widget.onTagClick != null
                                            ? SystemMouseCursors.click
                                            : SystemMouseCursors.basic,
                                        child: GestureDetector(
                                          onTap: widget.onTagClick != null
                                              ? () => widget.onTagClick!(tag)
                                              : null,
                                          child: BrutalistBadge(
                                            label: '#$tag',
                                            backgroundColor: isDark
                                                ? const Color(0xFF2A2A2A)
                                                : const Color(0xFFE5E2D0),
                                            textColor: isDark
                                                ? AppColors.darkInkWhite
                                                : AppColors.inkBlack,
                                          ),
                                        ),
                                      ),
                                    ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Status Selector Pill Row
                _buildSectionLabel('STATUS', isDark),
                const SizedBox(height: 6),
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: isCur ? accentColor : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                            border: Border.all(color: isCur ? accentColor : borderColor, width: 1.5),
                          ),
                          child: Text(
                            st.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: isCur ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                // Reading Progress Box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                    border: Border.all(color: borderColor, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            formatProgressDisplay(b).toUpperCase(),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                          ),
                          Text(
                            '${b.completionPercentage.toInt()}%',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: accentColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Progress Bar
                      ClipRRect(
                        borderRadius: BorderRadius.zero,
                        child: LinearProgressIndicator(
                          value: (b.completionPercentage / 100).clamp(0.0, 1.0),
                          minHeight: 8,
                          backgroundColor: isDark ? Colors.white10 : AppColors.paperSurfaceHighest,
                          valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Quick Increment Buttons
                      Builder(
                        builder: (context) {
                          final unitLabel = getUnitLabel(b.type, b.unitType);
                          final unitAbbr = unitLabel.startsWith('page') ? 'Pg' : unitLabel.startsWith('chapter') ? 'Ch' : unitLabel.startsWith('vol') ? 'Vol' : '';
                          final quickOptions = getQuickChipOptions(b.type);

                          return Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              ...quickOptions.take(2).map((amt) => _buildIncrementButton('+$amt $unitAbbr'.trim(), () => widget.onQuickIncrement?.call(amt, 0), accentColor, borderColor, isDark)),
                              if (b.progressStructure == 'volume_chapter' || b.parentProgress != null)
                                _buildIncrementButton('+1 Vol', () => widget.onQuickIncrement?.call(0, 1), accentColor, borderColor, isDark),
                              _buildActionButton('LOG PROGRESS', Icons.edit_calendar_rounded, widget.onOpenQuickLog, accentColor, borderColor, isDark),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Reading Dates
                if (b.dateStarted != null || b.dateFinished != null) ...[
                  _buildSectionLabel('READING DATES', isDark),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                      border: Border.all(color: borderColor, width: 1.5),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.date_range_rounded, size: 16, color: Color(0xFFFFB800)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (b.dateStarted != null)
                                Text(
                                  'Started: ${DateFormat('MMM d, yyyy').format(DateTime.tryParse(b.dateStarted!) ?? DateTime.now())}',
                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                                ),
                              if (b.dateFinished != null)
                                Text(
                                  'Finished: ${DateFormat('MMM d, yyyy').format(DateTime.tryParse(b.dateFinished!) ?? DateTime.now())}',
                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Personal Notes & Synopsis
                if (b.notes != null && b.notes!.isNotEmpty) ...[
                  _buildSectionLabel('NOTES & THOUGHTS', isDark),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                      border: Border.all(color: borderColor, width: 1.5),
                    ),
                    child: Text(
                      b.notes!,
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Reading Journeys / History
                if (_journeys.isNotEmpty || b.rereadCount > 0 || b.status == BookStatus.completed) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSectionLabel('READING JOURNEYS (${_journeys.isNotEmpty ? _journeys.length : (b.rereadCount + 1)})', isDark),
                      if (b.status == BookStatus.completed)
                        GestureDetector(
                          onTap: () async {
                            final updated = await _mutationService.startReread(book: b);
                            widget.onUpdateBook(updated);
                            _loadData();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.electricCobalt,
                              border: Border.all(color: borderColor, width: 1.0),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.replay_rounded, size: 12, color: Colors.white),
                                SizedBox(width: 3),
                                Text('START RE-READ', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: Colors.white)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_journeys.isNotEmpty) ...[
                    Builder(builder: (context) {
                      final hasMany = _journeys.length > 3;
                      final displayedJourneys = (hasMany && !_showAllJourneys)
                          ? _journeys.take(2).toList()
                          : _journeys;

                      return Column(
                        children: [
                          ...displayedJourneys.map((j) {
                            final isAct = j.status == 'reading';
                            final startStr = formatDisplayDate(j.dateStarted);
                            final finishStr = j.dateFinished != null ? formatDisplayDate(j.dateFinished!) : (isAct ? 'Active' : 'Finished');
                            final durationStr = j.formattedDuration;

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
                                              color: isAct ? AppColors.electricCobalt : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
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
                                        '$startStr → $finishStr${durationStr != null ? " • $durationStr" : ""}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.6),
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
                          if (hasMany)
                            GestureDetector(
                              onTap: () => setState(() => _showAllJourneys = !_showAllJourneys),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                margin: const EdgeInsets.only(top: 2, bottom: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperBg,
                                  border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1.0),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  _showAllJourneys ? '▴ SHOW FEWER READS' : '▾ SHOW ALL (${_journeys.length}) PAST READS',
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: AppColors.electricCobalt,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    }),
                  ],
                  const SizedBox(height: 16),
                ],

                // Reading Session Logs
                _buildSectionLabel('RECENT LOGS', isDark),
                const SizedBox(height: 6),
                if (_isLoadingLogs)
                  const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
                else if (_logs.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                      border: Border.all(color: borderColor, width: 1.0),
                    ),
                    child: Text(
                      'No session logs recorded yet.',
                      style: TextStyle(
                        fontSize: 11,
                        color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                      ),
                    ),
                  )
                else
                  Column(
                    children: _logs.take(5).map((log) {
                      final dateStr = formatDisplayDate(log.loggedAt);
                      final delta = (log.toProgress - (log.fromProgress ?? 0)).abs();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                          border: Border.all(color: borderColor, width: 1.0),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '+${formatNum(delta)} ${getUnitLabel(b.type, b.unitType)} (to ${formatNum(log.toProgress)})',
                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                                ),
                                if (log.note != null && log.note!.isNotEmpty)
                                  Text(
                                    log.note!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.6),
                                    ),
                                  ),
                              ],
                            ),
                            Text(
                              dateStr,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                const SizedBox(height: 20),

                // Bottom Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: widget.onOpenFullEdit,
                        icon: const Icon(Icons.edit_note_rounded, size: 16),
                        label: const Text('EDIT BOOK', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: widget.onToggleFavorite,
                      icon: Icon(
                        b.isFavorite == true ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        color: b.isFavorite == true ? AppColors.primaryRed : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                        size: 20,
                      ),
                      tooltip: b.isFavorite == true ? 'Unmark Favorite' : 'Mark as Favorite',
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      onPressed: widget.onDelete,
                      icon: const Icon(Icons.delete_outline_rounded, color: AppColors.primaryRed, size: 20),
                      tooltip: 'Move to Trash',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCoverFallback(Book b, Color accentColor) {
    return TypographicBookCover(
      title: b.title,
      author: b.author,
      type: b.type,
    );
  }

  Widget _buildSectionLabel(String label, bool isDark) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        letterSpacing: 0.8,
        color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.6),
      ),
    );
  }

  Widget _buildIncrementButton(String label, VoidCallback? onTap, Color accentColor, Color borderColor, bool isDark) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: const Offset(1.5, 1.5),
                blurRadius: 0,
              ),
            ],
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, VoidCallback onTap, Color accentColor, Color borderColor, bool isDark) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: accentColor,
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: const Offset(1.5, 1.5),
                blurRadius: 0,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 13, color: Colors.white),
              const SizedBox(width: 4),
              Text(
                label,
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w900, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
