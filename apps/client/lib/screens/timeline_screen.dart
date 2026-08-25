import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/brutalist_widgets.dart';

class _TimelineSubSession {
  final int logId;
  final double fromProgress;
  final double toProgress;
  final double delta;
  final String loggedAt;
  final String? note;

  _TimelineSubSession({
    required this.logId,
    required this.fromProgress,
    required this.toProgress,
    required this.delta,
    required this.loggedAt,
    this.note,
  });
}

class _DailyBookMilestone {
  final String bookId;
  final String bookTitle;
  final String? bookAuthor;
  final String bookType;
  final String? bookUnitType;
  final String? bookCoverUrl;
  final double? bookTotalUnits;
  final int bookRereadCount;
  final String? bookStatus;
  final List<_TimelineSubSession> sessions;

  _DailyBookMilestone({
    required this.bookId,
    required this.bookTitle,
    this.bookAuthor,
    required this.bookType,
    this.bookUnitType,
    this.bookCoverUrl,
    this.bookTotalUnits,
    this.bookRereadCount = 0,
    this.bookStatus,
    required this.sessions,
  });

  double get totalDelta => sessions.fold(0.0, (sum, s) => sum + s.delta);
  double get earliestFrom => sessions.first.fromProgress;
  double get latestTo => sessions.last.toProgress;
  String get latestLoggedAt => sessions.last.loggedAt;
  bool get isCompleted =>
      bookStatus == 'completed' ||
      (bookTotalUnits != null && bookTotalUnits! > 0 && latestTo >= bookTotalUnits!);
  bool get isReread => bookRereadCount > 0;
}

class _TimelineDayGroup {
  final String dateHeaderKey;
  final String dateFormatted;
  final DateTime date;
  final List<_DailyBookMilestone> bookMilestones;

  _TimelineDayGroup({
    required this.dateHeaderKey,
    required this.dateFormatted,
    required this.date,
    required this.bookMilestones,
  });
}

class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;
  final ScrollController _scrollController = ScrollController();

  static const int _pageSize = 50;
  List<Map<String, dynamic>> _rawLogs = [];
  List<_TimelineDayGroup> _dayGroups = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _syncManager.addListener(_onSyncManagerUpdated);
    _loadInitialLogs();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _syncManager.removeListener(_onSyncManagerUpdated);
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onSyncManagerUpdated() {
    if (mounted && !_syncManager.isSyncing) {
      _loadInitialLogs();
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
        !_isLoading &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMoreLogs();
    }
  }

  Future<void> _loadInitialLogs() async {
    setState(() {
      _isLoading = true;
      _hasMore = true;
    });

    final logs = await _dbHelper.getAllReadingLogsWithBookInfo(limit: _pageSize, offset: 0);

    if (mounted) {
      setState(() {
        _rawLogs = logs;
        _dayGroups = _processLogsIntoDayGroups(logs);
        _isLoading = false;
        _hasMore = logs.length >= _pageSize;
      });
    }
  }

  Future<void> _loadMoreLogs() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final nextLogs = await _dbHelper.getAllReadingLogsWithBookInfo(
      limit: _pageSize,
      offset: _rawLogs.length,
    );

    if (mounted) {
      setState(() {
        _rawLogs.addAll(nextLogs);
        _dayGroups = _processLogsIntoDayGroups(_rawLogs);
        _isLoadingMore = false;
        _hasMore = nextLogs.length >= _pageSize;
      });
    }
  }

  List<_TimelineDayGroup> _processLogsIntoDayGroups(List<Map<String, dynamic>> logs) {
    if (logs.isEmpty) return [];

    // 1. Group logs by calendar date (yyyy-MM-dd)
    final Map<String, List<Map<String, dynamic>>> byDate = {};

    for (final log in logs) {
      final iso = log['logged_at']?.toString();
      final dt = (iso != null ? DateTime.tryParse(iso)?.toLocal() : null) ?? DateTime.now();
      final dateKey = DateFormat('yyyy-MM-dd').format(dt);
      byDate.putIfAbsent(dateKey, () => []).add(log);
    }

    final List<_TimelineDayGroup> groups = [];
    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final yesterdayStr = DateFormat('yyyy-MM-dd').format(now.subtract(const Duration(days: 1)));

    final sortedDateKeys = byDate.keys.toList()..sort((a, b) => b.compareTo(a));

    for (final dateKey in sortedDateKeys) {
      final dateLogs = byDate[dateKey]!;
      final parsedDate = DateTime.tryParse(dateKey) ?? DateTime.now();

      String headerKey;
      if (dateKey == todayStr) {
        headerKey = 'TODAY';
      } else if (dateKey == yesterdayStr) {
        headerKey = 'YESTERDAY';
      } else {
        headerKey = DateFormat('EEEE').format(parsedDate).toUpperCase();
      }
      final dateFormatted = DateFormat('MMMM d, yyyy').format(parsedDate).toUpperCase();

      // 2. Group within the day by book_id (Option A Daily Consolidation)
      final Map<String, List<Map<String, dynamic>>> byBook = {};
      for (final l in dateLogs) {
        final bId = l['book_id']?.toString() ?? 'unknown_${l['log_id']}';
        byBook.putIfAbsent(bId, () => []).add(l);
      }

      final List<_DailyBookMilestone> milestones = [];

      for (final entry in byBook.entries) {
        final bLogs = entry.value;
        // Sort chronologically ascending (earliest log first)
        bLogs.sort((a, b) {
          final tA = a['logged_at']?.toString() ?? '';
          final tB = b['logged_at']?.toString() ?? '';
          return tA.compareTo(tB);
        });

        final first = bLogs.first;
        final subSessions = bLogs.map((item) {
          final fromProg = (item['from_progress'] as num?)?.toDouble() ?? 0.0;
          final toProg = (item['to_progress'] as num?)?.toDouble() ?? 0.0;
          final delta = (toProg - fromProg).clamp(0.0, 99999.0);
          return _TimelineSubSession(
            logId: (item['log_id'] as num?)?.toInt() ?? 0,
            fromProgress: fromProg,
            toProgress: toProg,
            delta: delta,
            loggedAt: item['logged_at']?.toString() ?? '',
            note: item['note']?.toString(),
          );
        }).toList();

        final totalUnits = (first['book_total_units'] as num?)?.toDouble();
        final rereadCount = (first['book_reread_count'] as num?)?.toInt() ?? 0;
        final status = first['book_status']?.toString();

        milestones.add(_DailyBookMilestone(
          bookId: entry.key,
          bookTitle: first['book_title']?.toString() ?? 'Unknown Book',
          bookAuthor: first['book_author']?.toString(),
          bookType: first['book_type']?.toString() ?? 'Novel',
          bookUnitType: first['book_unit_type']?.toString(),
          bookCoverUrl: first['book_cover_url']?.toString(),
          bookTotalUnits: totalUnits,
          bookRereadCount: rereadCount,
          bookStatus: status,
          sessions: subSessions,
        ));
      }

      // Sort book milestones by latest active log DESC (most recently read book on top)
      milestones.sort((a, b) => b.latestLoggedAt.compareTo(a.latestLoggedAt));

      groups.add(_TimelineDayGroup(
        dateHeaderKey: headerKey,
        dateFormatted: dateFormatted,
        date: parsedDate,
        bookMilestones: milestones,
      ));
    }

    return groups;
  }

  String _formatTimeOnly(String isoString) {
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return '';
    return DateFormat('h:mm a').format(dt);
  }

  Widget _buildOverviewCard(
    AppThemeDetails? details,
    bool isDark,
    Color borderColor,
    Color inkColor,
    Color accentColor,
    Color mutedInk, {
    bool isVertical = false,
  }) {
    final cardBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white);
    final cardHigh = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHighest);

    final todayGroup = _dayGroups.where((g) => g.dateHeaderKey == 'TODAY').firstOrNull;
    final todayBooks = todayGroup?.bookMilestones.length ?? 0;
    final todayUnits = todayGroup?.bookMilestones.fold(0.0, (sum, m) => sum + m.totalDelta) ?? 0.0;
    final todayUnitsStr = todayUnits % 1 == 0 ? todayUnits.toInt().toString() : todayUnits.toStringAsFixed(1);

    final now = DateTime.now();
    final sevenDaysAgo = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 6));
    double weekUnits = 0.0;
    for (final g in _dayGroups) {
      final gDay = DateTime(g.date.year, g.date.month, g.date.day);
      if (!gDay.isBefore(sevenDaysAgo)) {
        weekUnits += g.bookMilestones.fold(0.0, (sum, m) => sum + m.totalDelta);
      }
    }
    final weekUnitsStr = weekUnits >= 1000
        ? '${(weekUnits / 1000).toStringAsFixed(1)}k'
        : (weekUnits % 1 == 0 ? weekUnits.toInt().toString() : weekUnits.toStringAsFixed(1));

    if (isVertical) {
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: cardHigh,
                border: Border(
                  bottom: BorderSide(color: borderColor.withValues(alpha: 0.3), width: 1.5),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.auto_stories_rounded, size: 16, color: accentColor),
                  const SizedBox(width: 6),
                  Text(
                    'JOURNAL OVERVIEW',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                      color: inkColor,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$todayBooks',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: inkColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    'BOOKS LOGGED TODAY',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '+$todayUnitsStr',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: accentColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    'UNITS LOGGED TODAY',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '+$weekUnitsStr',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: isDark ? const Color(0xFF69F0AE) : const Color(0xFF00897B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    'UNITS THIS WEEK',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$todayBooks',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: inkColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'BOOKS TODAY',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                ],
              ),
            ),
            Container(height: 32, width: 1, color: borderColor.withValues(alpha: 0.2)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '+$todayUnitsStr',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: accentColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'UNITS TODAY',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                ],
              ),
            ),
            Container(height: 32, width: 1, color: borderColor.withValues(alpha: 0.2)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '+$weekUnitsStr',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: isDark ? const Color(0xFF69F0AE) : const Color(0xFF00897B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'THIS WEEK',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: mutedInk),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCoverThumbnail(String? coverUrl, String title, String type, AppThemeDetails? details, bool isDark, Color borderColor, Color accentColor) {
    return Container(
      width: 42,
      height: 60,
      decoration: BoxDecoration(
        color: details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHighest),
        border: Border.all(color: borderColor, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: const Offset(1.5, 1.5),
            blurRadius: 0,
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: coverUrl != null && coverUrl.isNotEmpty
          ? Image.network(
              coverUrl,
              fit: BoxFit.cover,
              cacheWidth: 160,
              errorBuilder: (_, __, ___) => _buildFallbackCover(title, type, accentColor),
            )
          : _buildFallbackCover(title, type, accentColor),
    );
  }

  Widget _buildFallbackCover(String title, String type, Color accentColor) {
    return Container(
      color: accentColor.withValues(alpha: 0.15),
      padding: const EdgeInsets.all(2),
      child: Center(
        child: Text(
          getFormatShorthand(type),
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: accentColor,
          ),
        ),
      ),
    );
  }

  Widget _buildDailyMilestoneCard(_DailyBookMilestone milestone, AppThemeDetails? details, bool isDark, Color borderColor, Color inkColor, Color accentColor, Color mutedInk) {
    final surfaceHigh = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface);
    final cardBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : Colors.white);
    final unitLabel = getUnitLabel(milestone.bookType, milestone.bookUnitType);
    final deltaStr = milestone.totalDelta % 1 == 0
        ? milestone.totalDelta.toInt().toString()
        : milestone.totalDelta.toStringAsFixed(1);
    final fromStr = milestone.earliestFrom % 1 == 0
        ? milestone.earliestFrom.toInt().toString()
        : milestone.earliestFrom.toStringAsFixed(1);
    final toStr = milestone.latestTo % 1 == 0
        ? milestone.latestTo.toInt().toString()
        : milestone.latestTo.toStringAsFixed(1);

    final isMulti = milestone.sessions.length > 1;
    final latestTimeStr = _formatTimeOnly(milestone.latestLoggedAt);

    // Node icon & color
    final IconData nodeIcon;
    final Color nodeBg;
    if (milestone.isCompleted) {
      nodeIcon = Icons.emoji_events_rounded;
      nodeBg = const Color(0xFFFFB800);
    } else if (milestone.isReread) {
      nodeIcon = Icons.replay_rounded;
      nodeBg = AppColors.electricCobalt;
    } else {
      nodeIcon = Icons.bolt_rounded;
      nodeBg = accentColor;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Tactile Spine Column with Milestone Node
          SizedBox(
            width: 32,
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                // Continuous Spine Track Line
                Positioned(
                  top: 0,
                  bottom: 0,
                  child: Container(
                    width: 2.5,
                    color: borderColor.withValues(alpha: 0.35),
                  ),
                ),
                // Milestone Node Icon Box
                Positioned(
                  top: 14,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: nodeBg,
                      border: Border.all(color: borderColor, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: borderColor,
                          offset: const Offset(1, 1),
                          blurRadius: 0,
                        ),
                      ],
                    ),
                    child: Icon(nodeIcon, size: 12, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // 2. Master Book Milestone Card
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  border: Border.all(color: borderColor, width: AppTheme.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: borderColor,
                      offset: details?.shadowOffset ?? AppTheme.shadowOffsetSm,
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Card Header: Cover, Title, Net Progress, Timestamp
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildCoverThumbnail(
                            milestone.bookCoverUrl,
                            milestone.bookTitle,
                            milestone.bookType,
                            details,
                            isDark,
                            borderColor,
                            accentColor,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        milestone.bookTitle.toUpperCase(),
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13.5,
                                          letterSpacing: -0.2,
                                          color: inkColor,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                      decoration: BoxDecoration(
                                        color: accentColor,
                                        border: Border.all(color: borderColor, width: 1),
                                      ),
                                      child: Text(
                                        '+$deltaStr $unitLabel',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 11,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Text(
                                      '${milestone.bookType.toUpperCase()} • $fromStr ➔ $toStr $unitLabel',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: mutedInk,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    if (isMulti)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: surfaceHigh,
                                          border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1),
                                        ),
                                        child: Text(
                                          '${milestone.sessions.length} SESSIONS TODAY',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 0.3,
                                            color: inkColor,
                                          ),
                                        ),
                                      )
                                    else
                                      const SizedBox.shrink(),
                                    Text(
                                      latestTimeStr,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: mutedInk,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Sub-Session Micro-Timeline (if multiple sessions or session note exists)
                    if (isMulti || (milestone.sessions.isNotEmpty && milestone.sessions.first.note != null && milestone.sessions.first.note!.isNotEmpty)) ...[
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: surfaceHigh,
                          border: Border(
                            top: BorderSide(color: borderColor.withValues(alpha: 0.25), width: 1),
                          ),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: milestone.sessions.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final s = entry.value;
                            final sTime = _formatTimeOnly(s.loggedAt);
                            final sFrom = s.fromProgress % 1 == 0 ? s.fromProgress.toInt() : s.fromProgress.toStringAsFixed(1);
                            final sTo = s.toProgress % 1 == 0 ? s.toProgress.toInt() : s.toProgress.toStringAsFixed(1);
                            final sDelta = s.delta % 1 == 0 ? s.delta.toInt() : s.delta.toStringAsFixed(1);

                            return Padding(
                              padding: EdgeInsets.only(bottom: idx == milestone.sessions.length - 1 ? 0 : 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.schedule_rounded, size: 12, color: accentColor),
                                      const SizedBox(width: 4),
                                      Text(
                                        sTime,
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w900,
                                          color: inkColor,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '$sFrom ➔ $sTo (+$sDelta $unitLabel)',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: mutedInk,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (s.note != null && s.note!.trim().isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      margin: const EdgeInsets.only(left: 16),
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: cardBg,
                                        border: Border.all(
                                          color: borderColor.withValues(alpha: 0.2),
                                          width: 1,
                                        ),
                                      ),
                                      child: Text(
                                        '"${s.note!.trim()}"',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontStyle: FontStyle.italic,
                                          fontWeight: FontWeight.w500,
                                          color: inkColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineFeed(
    AppThemeDetails? details,
    bool isDark,
    Color borderColor,
    Color inkColor,
    Color accentColor,
    Color mutedInk, {
    bool includeHero = false,
  }) {
    return ListView.builder(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.symmetric(horizontal: includeHero ? 20 : 0, vertical: 16),
      itemCount: _dayGroups.length + (includeHero ? 1 : 0) + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (includeHero && index == 0) {
          return _buildOverviewCard(details, isDark, borderColor, inkColor, accentColor, mutedInk, isVertical: false);
        }

        final actualIndex = includeHero ? index - 1 : index;

        if (actualIndex == _dayGroups.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: _isLoadingMore
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const SizedBox.shrink(),
            ),
          );
        }

        final dayGroup = _dayGroups[actualIndex];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date Header Strip
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                    child: Text(
                      dayGroup.dateHeaderKey,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    dayGroup.dateFormatted,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                      color: mutedInk,
                    ),
                  ),
                ],
              ),
            ),

            // Consolidated Book Milestone Cards along the Spine
            ...dayGroup.bookMilestones.map((milestone) {
              return _buildDailyMilestoneCard(
                milestone,
                details,
                isDark,
                borderColor,
                inkColor,
                accentColor,
                mutedInk,
              );
            }),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'READING JOURNEY',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
            fontSize: 18,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _dayGroups.isEmpty
              ? RefreshIndicator(
                  onRefresh: () async {
                    await _syncManager.syncNow();
                    await _loadInitialLogs();
                  },
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const BrutalistBadge(label: 'NO READING LOGS YET'),
                            const SizedBox(height: 12),
                            Text(
                              'Use the +1 chips or LOG button in Library to record progress',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: mutedInk,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              : LayoutBuilder(
                  builder: (context, constraints) {
                    final isWide = constraints.maxWidth >= 840;

                    if (isWide) {
                      return Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 1060),
                          child: RefreshIndicator(
                            onRefresh: () async {
                              await _syncManager.syncNow();
                              await _loadInitialLogs();
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Left Column: Simple Overview Card (240px)
                                  SizedBox(
                                    width: 240,
                                    child: _buildOverviewCard(
                                      details,
                                      isDark,
                                      borderColor,
                                      inkColor,
                                      accentColor,
                                      mutedInk,
                                      isVertical: true,
                                    ),
                                  ),
                                  const SizedBox(width: 24),
                                  // Right Column: Timeline Spine Feed
                                  Expanded(
                                    child: _buildTimelineFeed(
                                      details,
                                      isDark,
                                      borderColor,
                                      inkColor,
                                      accentColor,
                                      mutedInk,
                                      includeHero: false,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async {
                        await _syncManager.syncNow();
                        await _loadInitialLogs();
                      },
                      child: _buildTimelineFeed(
                        details,
                        isDark,
                        borderColor,
                        inkColor,
                        accentColor,
                        mutedInk,
                        includeHero: true,
                      ),
                    );
                  },
                ),
    );
  }
}

