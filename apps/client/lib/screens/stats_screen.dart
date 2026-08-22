import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../utils/formatters.dart';
import '../widgets/brutalist_widgets.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;
  List<Book> _books = [];
  double _totalUnitsLogged = 0.0;
  int _totalLogsCount = 0;
  bool _isLoading = true;
  int _distributionTabIndex = 0; // 0: Formats, 1: Genres, 2: Ratings
  int? _selectedMonthIndex;

  static const List<String> _monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  static const List<String> _monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  @override
  void initState() {
    super.initState();
    _syncManager.addListener(_onSyncManagerUpdated);
    _loadStats();
  }

  @override
  void dispose() {
    _syncManager.removeListener(_onSyncManagerUpdated);
    super.dispose();
  }

  void _onSyncManagerUpdated() {
    if (mounted && !_syncManager.isSyncing) {
      _loadStats();
    }
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    final books = await _dbHelper.getBooks();
    final agg = await _dbHelper.getAggregatedReadingStats();
    if (mounted) {
      setState(() {
        _books = books;
        _totalUnitsLogged = (agg['totalUnits'] as num?)?.toDouble() ?? 0.0;
        _totalLogsCount = (agg['totalLogs'] as num?)?.toInt() ?? 0;
        _isLoading = false;
      });
    }
  }

  void _openSetGoalDialog() {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inputBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);
    final controller = TextEditingController(text: _syncManager.yearlyGoal.toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Text(
          'SET ANNUAL READING GOAL',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: inkColor),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Target number of books to finish this year:',
              style: TextStyle(fontSize: 12, color: mutedInk),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: inputBg,
                border: Border.all(
                  color: borderColor,
                  width: 1.5,
                ),
              ),
              child: TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                autofocus: true,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: inkColor,
                ),
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: InputBorder.none,
                  hintText: 'e.g. 30',
                  hintStyle: TextStyle(color: mutedInk),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('CANCEL', style: TextStyle(color: inkColor, fontWeight: FontWeight.w800)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            onPressed: () async {
              final val = int.tryParse(controller.text.trim());
              if (val != null && val >= 0) {
                Navigator.pop(ctx);
                await _syncManager.updateYearlyGoal(val);
                await _loadStats();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Yearly goal updated to $val books!'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                }
              }
            },
            child: const Text('SAVE GOAL'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = Theme.of(context).colorScheme.primary;
    final currentYear = DateTime.now().year;
    final currentMonth = DateTime.now().month;

    final completed = _books.where((b) => b.status == BookStatus.completed).length;
    final reading = _books.where((b) => b.status == BookStatus.reading).length;
    final plan = _books.where((b) => b.status == BookStatus.planToRead).length;

    // Monthly completions for current year
    final monthlyCounts = List<int>.filled(12, 0);
    int completedThisYear = 0;

    for (final b in _books) {
      if (b.status != BookStatus.completed) continue;
      DateTime? dt;
      if (b.dateFinished != null && b.dateFinished!.isNotEmpty) {
        dt = DateTime.tryParse(b.dateFinished!);
      }
      dt ??= DateTime.tryParse(b.updatedAt);
      if (dt != null && dt.year == currentYear) {
        completedThisYear++;
        if (dt.month >= 1 && dt.month <= 12) {
          monthlyCounts[dt.month - 1]++;
        }
      }
    }

    final ratedBooks = _books.where((b) => b.rating != null && b.rating! > 0).toList();
    final avgRating = ratedBooks.isEmpty
        ? 0.0
        : ratedBooks.map((b) => b.rating!).reduce((a, b) => a + b) / ratedBooks.length;

    final yearlyGoal = _syncManager.yearlyGoal;
    final goalProgress = yearlyGoal > 0 ? (completedThisYear / yearlyGoal).clamp(0.0, 1.0) : 0.0;

    // Goal pace health
    final expectedByNow = yearlyGoal > 0 ? (yearlyGoal / 12.0) * currentMonth : 0.0;
    final paceDiff = completedThisYear - expectedByNow.round();
    final String goalPaceStatus;
    final Color goalPaceColor;
    if (yearlyGoal == 0) {
      goalPaceStatus = 'NO GOAL SET';
      goalPaceColor = isDark ? Colors.white60 : AppColors.inkMuted;
    } else if (completedThisYear >= yearlyGoal) {
      goalPaceStatus = 'GOAL ACHIEVED! 🏆';
      goalPaceColor = AppColors.successGreen;
    } else if (paceDiff >= 0) {
      goalPaceStatus = paceDiff == 0 ? 'ON TRACK' : '+$paceDiff AHEAD';
      goalPaceColor = AppColors.successGreen;
    } else {
      goalPaceStatus = '${paceDiff.abs()} BEHIND';
      goalPaceColor = AppColors.amberWarning;
    }

    // Formats distribution
    final typeCounts = <String, int>{};
    for (final b in _books) {
      typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
    }
    final sortedTypes = typeCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    // Genres distribution (parsed from comma-separated genre_tags with synonym normalization)
    final genreCounts = <String, int>{};
    for (final b in _books) {
      if (b.genreTags != null && b.genreTags!.isNotEmpty) {
        final tags = b.genreTags!.split(',').map((t) => normalizeGenreTag(t)).where((t) => t.isNotEmpty);
        for (final tag in tags) {
          genreCounts[tag] = (genreCounts[tag] ?? 0) + 1;
        }
      }
    }
    final sortedGenres = genreCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    // Star rating distribution (5, 4, 3, 2, 1)
    final starCounts = <int, int>{5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    for (final b in ratedBooks) {
      final r = b.rating!.round().clamp(1, 5);
      starCounts[r] = (starCounts[r] ?? 0) + 1;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'ANALYTICS & STATS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 18),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await _syncManager.syncNow();
                await _loadStats();
              },
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth >= 840;

                  // Yearly Goal Card
                  final yearlyGoalCard = BrutalistCard(
                    margin: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Flexible(
                                    child: Text(
                                      '$currentYear READING GOAL',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  GestureDetector(
                                    onTap: _openSetGoalDialog,
                                    child: Icon(
                                      Icons.edit_note_rounded,
                                      size: 18,
                                      color: primaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (yearlyGoal > 0) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: goalPaceColor.withValues(alpha: 0.15),
                                      border: Border.all(color: goalPaceColor, width: 1),
                                    ),
                                    child: Text(
                                      goalPaceStatus,
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                        color: goalPaceColor,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                ],
                                BrutalistBadge(
                                  label: '${(goalProgress * 100).toInt()}% COMPLETED',
                                  backgroundColor: primaryColor,
                                  textColor: Colors.white,
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Text(
                              '$completedThisYear',
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                color: primaryColor,
                              ),
                            ),
                            const Text(
                              ' / ',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.inkMuted,
                              ),
                            ),
                            Text(
                              '$yearlyGoal BOOKS',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        BrutalistProgressBar(
                          progress: goalProgress,
                          height: 16,
                          fillColor: primaryColor,
                        ),
                      ],
                    ),
                  );

                  // 4 Primary Metric Tiles
                  final formattedUnits = _totalUnitsLogged >= 1000
                      ? '${(_totalUnitsLogged / 1000).toStringAsFixed(1)}k'
                      : _totalUnitsLogged.toInt().toString();

                  final metricsGrid = Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricTile(
                              'IN PROGRESS',
                              '$reading',
                              Icons.auto_stories_rounded,
                              AppColors.skyBlue,
                              'active reads',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricTile(
                              'COMPLETED',
                              '$completed',
                              Icons.done_all_rounded,
                              AppColors.successGreen,
                              'finished works',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricTile(
                              'UNITS LOGGED',
                              _totalUnitsLogged > 0 ? formattedUnits : '$plan',
                              _totalUnitsLogged > 0 ? Icons.electric_bolt_rounded : Icons.bookmark_border_rounded,
                              _totalUnitsLogged > 0 ? primaryColor : AppColors.amberWarning,
                              _totalUnitsLogged > 0 ? '$_totalLogsCount logs' : 'plan to read',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricTile(
                              'AVG RATING',
                              avgRating > 0 ? '${avgRating.toStringAsFixed(1)} ★' : 'N/A',
                              Icons.star_rounded,
                              Colors.amber,
                              '${ratedBooks.length} rated',
                            ),
                          ),
                        ],
                      ),
                    ],
                  );

                  // 12-Month Activity Bar Chart
                  final maxMonthly = monthlyCounts.reduce((a, b) => a > b ? a : b);
                  final monthlyChartCard = BrutalistCard(
                    margin: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.bar_chart_rounded, size: 16, color: primaryColor),
                                const SizedBox(width: 6),
                                Text(
                                  '$currentYear MONTHLY COMPLETIONS',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                ),
                              ],
                            ),
                            Text(
                              '$completedThisYear Total',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Interactive Month Detail Banner
                        if (_selectedMonthIndex != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: primaryColor.withValues(alpha: 0.1),
                              border: Border.all(color: primaryColor, width: 1.5),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${_monthNames[_selectedMonthIndex!]} $currentYear',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
                                ),
                                Text(
                                  '${monthlyCounts[_selectedMonthIndex!]} books finished',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        // 12 Pillars Layout
                        SizedBox(
                          height: 110,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: List.generate(12, (index) {
                              final count = monthlyCounts[index];
                              final isCurrentMonth = index == (currentMonth - 1);
                              final isSelected = _selectedMonthIndex == index;
                              final normalizedHeight = maxMonthly > 0 ? (count / maxMonthly).clamp(0.0, 1.0) : 0.0;
                              final barHeight = (normalizedHeight * 64.0).clamp(4.0, 64.0);

                              return Expanded(
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onTap: () {
                                    setState(() {
                                      _selectedMonthIndex = _selectedMonthIndex == index ? null : index;
                                    });
                                  },
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      // Top Count Label
                                      Text(
                                        count > 0 ? '$count' : '',
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w900,
                                          color: isSelected ? primaryColor : (isDark ? Colors.white70 : AppColors.inkBlack),
                                        ),
                                      ),
                                      const SizedBox(height: 3),

                                      // The Bar Pillar
                                      AnimatedContainer(
                                        duration: const Duration(milliseconds: 250),
                                        height: count > 0 ? barHeight : 4.0,
                                        width: 14,
                                        decoration: BoxDecoration(
                                          color: count == 0
                                              ? (isDark ? Colors.white10 : Colors.black12)
                                              : (isSelected
                                                  ? primaryColor
                                                  : (isCurrentMonth
                                                      ? primaryColor.withValues(alpha: 0.85)
                                                      : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack))),
                                          border: Border.all(
                                            color: isSelected
                                                ? primaryColor
                                                : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                                            width: isSelected ? 2.0 : 1.0,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 6),

                                      // Month Initial Label
                                      Text(
                                        _monthLabels[index],
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: isCurrentMonth || isSelected ? FontWeight.w900 : FontWeight.w700,
                                          color: isSelected
                                              ? primaryColor
                                              : (isCurrentMonth
                                                  ? primaryColor
                                                  : (isDark ? Colors.white60 : AppColors.inkMuted)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                  );

                  // Velocity & Forecast Card
                  final velocityCard = BrutalistCard(
                    margin: EdgeInsets.zero,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.speed_rounded, size: 16, color: primaryColor),
                                const SizedBox(width: 6),
                                const Text(
                                  'READING VELOCITY',
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              completedThisYear > 0
                                  ? '~${(completedThisYear / currentMonth).toStringAsFixed(1)} books/month pace'
                                  : 'Start logging reads to establish pace',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                              ),
                            ),
                          ],
                        ),
                        if (completedThisYear > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.paperSurfaceHighest,
                              border: Border.all(
                                color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                width: 1.5,
                              ),
                            ),
                            child: Text(
                              '~${((completedThisYear / currentMonth) * 12).round()} YR EST.',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: AppColors.inkBlack,
                              ),
                            ),
                          ),
                      ],
                    ),
                  );

                  // Stacked Metric Bars (Formats / Genres / Ratings)
                  final stackedDistributionCard = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          const Text(
                            'LIBRARY DISTRIBUTION',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                          ),

                          // Segmented Switcher Tabs
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildSegmentPill('FORMATS', 0, isDark, primaryColor),
                              const SizedBox(width: 4),
                              _buildSegmentPill('GENRES', 1, isDark, primaryColor),
                              const SizedBox(width: 4),
                              _buildSegmentPill('RATINGS', 2, isDark, primaryColor),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      BrutalistCard(
                        margin: EdgeInsets.zero,
                        child: _buildDistributionContent(
                          sortedTypes: sortedTypes,
                          sortedGenres: sortedGenres,
                          starCounts: starCounts,
                          totalRated: ratedBooks.length,
                          isDark: isDark,
                          primaryColor: primaryColor,
                        ),
                      ),
                    ],
                  );

                  if (isWide) {
                    return ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Left Column: Goal, Velocity & Metrics
                            Expanded(
                              flex: 5,
                              child: Column(
                                children: [
                                  yearlyGoalCard,
                                  const SizedBox(height: 16),
                                  metricsGrid,
                                  const SizedBox(height: 16),
                                  monthlyChartCard,
                                  const SizedBox(height: 16),
                                  velocityCard,
                                ],
                              ),
                            ),
                            const SizedBox(width: 20),

                            // Right Column: Stacked Distribution Analytics
                            Expanded(
                              flex: 4,
                              child: stackedDistributionCard,
                            ),
                          ],
                        ),
                        const SizedBox(height: 40),
                      ],
                    );
                  }

                  // Mobile Single-Column Layout
                  return ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    children: [
                      yearlyGoalCard,
                      const SizedBox(height: 16),
                      metricsGrid,
                      const SizedBox(height: 16),
                      monthlyChartCard,
                      const SizedBox(height: 16),
                      velocityCard,
                      const SizedBox(height: 20),
                      stackedDistributionCard,
                      const SizedBox(height: 40),
                    ],
                  );
                },
              ),
            ),
    );
  }

  Widget _buildSegmentPill(String label, int index, bool isDark, Color primaryColor) {
    final isSelected = _distributionTabIndex == index;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () => setState(() => _distributionTabIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: isSelected ? primaryColor : Colors.transparent,
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
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              letterSpacing: 0.3,
              color: isSelected
                  ? Colors.white
                  : (isDark ? AppColors.darkInkWhite.withValues(alpha: 0.6) : AppColors.inkMuted),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDistributionContent({
    required List<MapEntry<String, int>> sortedTypes,
    required List<MapEntry<String, int>> sortedGenres,
    required Map<int, int> starCounts,
    required int totalRated,
    required bool isDark,
    required Color primaryColor,
  }) {
    if (_books.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(
          child: Text(
            'No books in your library yet.',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.inkMuted),
          ),
        ),
      );
    }

    if (_distributionTabIndex == 0) {
      // Formats Breakdown
      return Column(
        children: sortedTypes.map((entry) {
          final pct = entry.value / _books.length;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      entry.key.toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                    Text(
                      '${entry.value} (${(pct * 100).toInt()}%)',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                BrutalistProgressBar(
                  progress: pct,
                  height: 8,
                  fillColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                ),
              ],
            ),
          );
        }).toList(),
      );
    } else if (_distributionTabIndex == 1) {
      // Genres Breakdown
      if (sortedGenres.isEmpty) {
        return const Padding(
          padding: EdgeInsets.symmetric(vertical: 20, horizontal: 12),
          child: Center(
            child: Text(
              'No genre tags found on your books.\nAdd tags while editing books to view genre analytics!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.inkMuted),
            ),
          ),
        );
      }

      final topGenres = sortedGenres.take(8).toList();
      final totalGenreInstances = sortedGenres.map((e) => e.value).reduce((a, b) => a + b);

      return Column(
        children: topGenres.map((entry) {
          final pct = totalGenreInstances > 0 ? entry.value / totalGenreInstances : 0.0;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      entry.key.toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                    Text(
                      '${entry.value} (${(pct * 100).toInt()}%)',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                BrutalistProgressBar(
                  progress: pct,
                  height: 8,
                  fillColor: primaryColor,
                ),
              ],
            ),
          );
        }).toList(),
      );
    } else {
      // Ratings Spectrum Breakdown
      if (totalRated == 0) {
        return const Padding(
          padding: EdgeInsets.symmetric(vertical: 20, horizontal: 12),
          child: Center(
            child: Text(
              'No rated books yet.\nAdd star ratings to view your rating distribution!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.inkMuted),
            ),
          ),
        );
      }

      return Column(
        children: [5, 4, 3, 2, 1].map((star) {
          final count = starCounts[star] ?? 0;
          final pct = totalRated > 0 ? count / totalRated : 0.0;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          '$star',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.star_rounded, size: 14, color: Colors.amber),
                      ],
                    ),
                    Text(
                      '$count (${(pct * 100).toInt()}%)',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                BrutalistProgressBar(
                  progress: pct,
                  height: 8,
                  fillColor: Colors.amber,
                ),
              ],
            ),
          );
        }).toList(),
      );
    }
  }

  Widget _buildMetricTile(String title, String value, IconData icon, Color accentColor, String subtext) {
    return BrutalistCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
              ),
              Icon(icon, size: 16, color: accentColor),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.inkMuted),
          ),
        ],
      ),
    );
  }
}

