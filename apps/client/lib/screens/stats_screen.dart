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
  Map<String, double> _unitBreakdown = {};
  Map<String, double> _dailyActivity = {};
  Map<String, int> _streakStats = {'currentStreak': 0, 'longestStreak': 0, 'totalDays': 0};
  bool _isLoading = true;
  int _distributionTabIndex = 0; // 0: Formats, 1: Genres, 2: Ratings
  int? _selectedMonthIndex;
  int _selectedYear = DateTime.now().year;
  String _selectedGoalMetric = 'books'; // 'books', 'pages', 'chapters', 'volumes'

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
    final agg = await _dbHelper.getAggregatedReadingStats(year: _selectedYear);
    final unitBreakdown = await _dbHelper.getUnitBreakdownStats(year: _selectedYear);
    final dailyActivity = await _dbHelper.getDailyReadingActivityMap(year: _selectedYear);
    final streakStats = await _dbHelper.getReadingStreakStats();

    if (mounted) {
      setState(() {
        _books = books;
        _totalUnitsLogged = (agg['totalUnits'] as num?)?.toDouble() ?? 0.0;
        _totalLogsCount = (agg['totalLogs'] as num?)?.toInt() ?? 0;
        _unitBreakdown = unitBreakdown;
        _dailyActivity = dailyActivity;
        _streakStats = streakStats;
        _isLoading = false;
      });
    }
  }

  void _openYearPickerDialog() {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final primaryColor = Theme.of(context).colorScheme.primary;
    final currentYear = DateTime.now().year;

    final years = List<int>.generate(currentYear - 1947 + 1, (i) => currentYear - i);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Text(
          'SELECT YEAR ARCHIVE',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: inkColor),
        ),
        content: SizedBox(
          width: 320,
          height: 380,
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 2.2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: years.length,
            itemBuilder: (context, idx) {
              final y = years[idx];
              final isSelected = y == _selectedYear;
              return GestureDetector(
                onTap: () {
                  Navigator.pop(ctx);
                  setState(() {
                    _selectedYear = y;
                    _selectedMonthIndex = null;
                  });
                  _loadStats();
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? primaryColor
                        : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                    border: Border.all(color: borderColor, width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$y',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: isSelected ? Colors.white : inkColor,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('CLOSE', style: TextStyle(color: inkColor, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  void _openSetGoalDialog() {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final inputBg = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : Colors.white);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);
    final currentTarget = _syncManager.getGoalFor(year: _selectedYear, metric: _selectedGoalMetric);
    final controller = TextEditingController(text: currentTarget > 0 ? currentTarget.toString() : '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Text(
          'SET $_selectedYear ${_selectedGoalMetric.toUpperCase()} GOAL',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: inkColor),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Target number of ${_selectedGoalMetric.toLowerCase()} to finish in $_selectedYear:',
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
                  hintText: 'e.g. 25',
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
                await _syncManager.setGoalFor(year: _selectedYear, metric: _selectedGoalMetric, target: val);
                await _loadStats();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('$_selectedYear ${_selectedGoalMetric.toUpperCase()} goal updated to $val!'),
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
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final mutedInk = isDark ? Colors.white60 : AppColors.inkMuted;

    final currentCalendarYear = DateTime.now().year;
    final currentCalendarMonth = DateTime.now().month;
    final isCurrentYearSelected = _selectedYear == currentCalendarYear;

    final reading = _books.where((b) => b.status == BookStatus.reading).length;
    final plan = _books.where((b) => b.status == BookStatus.planToRead).length;

    final monthlyCounts = List<int>.filled(12, 0);
    int completedInSelectedYear = 0;

    for (final b in _books) {
      if (b.status != BookStatus.completed) continue;
      DateTime? dt;
      if (b.dateFinished != null && b.dateFinished!.isNotEmpty) {
        dt = DateTime.tryParse(b.dateFinished!);
      }
      dt ??= DateTime.tryParse(b.updatedAt);
      if (dt != null && dt.year == _selectedYear) {
        completedInSelectedYear++;
        if (dt.month >= 1 && dt.month <= 12) {
          monthlyCounts[dt.month - 1]++;
        }
      }
    }

    final ratedBooks = _books.where((b) => b.rating != null && b.rating! > 0).toList();
    final avgRating = ratedBooks.isEmpty
        ? 0.0
        : ratedBooks.map((b) => b.rating!).reduce((a, b) => a + b) / ratedBooks.length;

    final metricGoalTarget = _syncManager.getGoalFor(year: _selectedYear, metric: _selectedGoalMetric);
    final double metricProgressVal;
    if (_selectedGoalMetric == 'books') {
      metricProgressVal = completedInSelectedYear.toDouble();
    } else {
      metricProgressVal = _unitBreakdown[_selectedGoalMetric] ?? 0.0;
    }

    final goalProgress = metricGoalTarget > 0 ? (metricProgressVal / metricGoalTarget).clamp(0.0, 1.0) : 0.0;
    final isGoalAchieved = metricGoalTarget > 0 && metricProgressVal >= metricGoalTarget;

    final double elapsedMonths = isCurrentYearSelected
        ? currentCalendarMonth.toDouble()
        : (_selectedYear < currentCalendarYear ? 12.0 : 1.0);
    final expectedByNow = metricGoalTarget > 0 ? (metricGoalTarget / 12.0) * elapsedMonths : 0.0;
    final paceDiff = (metricProgressVal - expectedByNow).round();

    final String goalPaceStatus;
    final IconData goalPaceIcon;
    final Color goalPaceColor;

    if (metricGoalTarget == 0) {
      goalPaceStatus = 'NO GOAL SET';
      goalPaceIcon = Icons.flag_outlined;
      goalPaceColor = isDark ? Colors.white60 : AppColors.inkMuted;
    } else if (isGoalAchieved) {
      goalPaceStatus = 'GOAL ACHIEVED!';
      goalPaceIcon = Icons.emoji_events_rounded;
      goalPaceColor = primaryColor;
    } else if (paceDiff >= 0) {
      goalPaceStatus = paceDiff == 0 ? 'ON TRACK' : '+$paceDiff AHEAD';
      goalPaceIcon = paceDiff == 0 ? Icons.check_circle_outline_rounded : Icons.trending_up_rounded;
      goalPaceColor = isDark ? const Color(0xFF69F0AE) : const Color(0xFF00897B);
    } else {
      goalPaceStatus = '${paceDiff.abs()} BEHIND';
      goalPaceIcon = Icons.trending_down_rounded;
      goalPaceColor = isDark ? const Color(0xFFFF8A80) : const Color(0xFFD32F2F);
    }

    final typeCounts = <String, int>{};
    for (final b in _books) {
      typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
    }
    final sortedTypes = typeCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

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

    final starCounts = <int, int>{5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    for (final b in ratedBooks) {
      final r = b.rating!.round().clamp(1, 5);
      starCounts[r] = (starCounts[r] ?? 0) + 1;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'ANALYTICS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 18),
        ),
        actions: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded, size: 22),
                tooltip: 'Previous Year',
                onPressed: _selectedYear > 1947
                    ? () {
                        setState(() {
                          _selectedYear--;
                          _selectedMonthIndex = null;
                        });
                        _loadStats();
                      }
                    : null,
              ),
              GestureDetector(
                onTap: _openYearPickerDialog,
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
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$_selectedYear',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: inkColor,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(Icons.arrow_drop_down_rounded, size: 18, color: inkColor),
                    ],
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded, size: 22),
                tooltip: 'Next Year',
                onPressed: _selectedYear < currentCalendarYear
                    ? () {
                        setState(() {
                          _selectedYear++;
                          _selectedMonthIndex = null;
                        });
                        _loadStats();
                      }
                    : null,
              ),
              const SizedBox(width: 8),
            ],
          ),
        ],
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
                                      '$_selectedYear ANNUAL GOAL',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  GestureDetector(
                                    onTap: _openSetGoalDialog,
                                    child: Icon(Icons.edit_note_rounded, size: 18, color: primaryColor),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (metricGoalTarget > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isGoalAchieved
                                      ? primaryColor
                                      : goalPaceColor.withValues(alpha: isDark ? 0.20 : 0.12),
                                  border: Border.all(
                                    color: isGoalAchieved
                                        ? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack)
                                        : goalPaceColor,
                                    width: 1.2,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(goalPaceIcon, size: 11, color: isGoalAchieved ? Colors.white : goalPaceColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      goalPaceStatus,
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.3,
                                        color: isGoalAchieved ? Colors.white : (isDark ? Colors.white : AppColors.inkBlack),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: ['books', 'pages', 'chapters', 'volumes'].map((metricKey) {
                            final isTabSelected = _selectedGoalMetric == metricKey;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 2),
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedGoalMetric = metricKey),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isTabSelected
                                          ? primaryColor
                                          : (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh),
                                      border: Border.all(
                                        color: isTabSelected ? primaryColor : borderColor.withValues(alpha: 0.3),
                                        width: 1.0,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      metricKey.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: isTabSelected ? FontWeight.w900 : FontWeight.w700,
                                        letterSpacing: 0.3,
                                        color: isTabSelected
                                            ? Colors.white
                                            : (isDark ? Colors.white70 : AppColors.inkBlack),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  metricProgressVal % 1 == 0
                                      ? metricProgressVal.toInt().toString()
                                      : metricProgressVal.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 30,
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
                                  metricGoalTarget > 0 ? '$metricGoalTarget ${_selectedGoalMetric.toUpperCase()}' : 'NO TARGET',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: mutedInk,
                                  ),
                                ),
                              ],
                            ),
                            if (metricGoalTarget > 0)
                              Text(
                                '${(goalProgress * 100).toInt()}%',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: primaryColor,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        BrutalistProgressBar(
                          progress: goalProgress,
                          height: 14,
                          fillColor: primaryColor,
                        ),
                      ],
                    ),
                  );

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
                              'FINISHED ($_selectedYear)',
                              '$completedInSelectedYear',
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
                              'UNITS ($_selectedYear)',
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

                  final streakHeatmapCard = _buildStreakHeatmapCard(isDark, borderColor, primaryColor);

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
                                  '$_selectedYear MONTHLY ACTIVITY',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                ),
                              ],
                            ),
                            if (_selectedMonthIndex != null)
                              BrutalistBadge(
                                label: '${_monthNames[_selectedMonthIndex!]}: ${monthlyCounts[_selectedMonthIndex!]}',
                                backgroundColor: primaryColor,
                                textColor: Colors.white,
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          height: 100,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: List.generate(12, (index) {
                              final count = monthlyCounts[index];
                              final isCurrentMonth = isCurrentYearSelected && (index + 1 == currentCalendarMonth);
                              final isSelected = _selectedMonthIndex == index;
                              final double barHeight = maxMonthly > 0 ? (count / maxMonthly) * 64.0 : 0.0;

                              return Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedMonthIndex = _selectedMonthIndex == index ? null : index;
                                    });
                                  },
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      Text(
                                        count > 0 ? '$count' : '',
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                          color: isSelected
                                              ? primaryColor
                                              : (isDark ? Colors.white60 : AppColors.inkMuted),
                                        ),
                                      ),
                                      const SizedBox(height: 3),
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

                  final velocityCard = BrutalistCard(
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
                                  Icon(Icons.speed_rounded, size: 16, color: primaryColor),
                                  const SizedBox(width: 6),
                                  const Flexible(
                                    child: Text(
                                      'READING VELOCITY',
                                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (completedInSelectedYear > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHighest,
                                  border: Border.all(
                                    color: borderColor,
                                    width: 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: borderColor,
                                      offset: const Offset(1.5, 1.5),
                                      blurRadius: 0,
                                    ),
                                  ],
                                ),
                                child: Text(
                                  '~${((completedInSelectedYear / elapsedMonths) * 12).round()} YR EST.',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.3,
                                    color: inkColor,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                                  border: Border.all(
                                    color: isDark
                                        ? AppColors.darkInkWhite.withValues(alpha: 0.3)
                                        : AppColors.inkBlack.withValues(alpha: 0.2),
                                    width: 1.0,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'MONTHLY RATE',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        color: mutedInk,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      completedInSelectedYear > 0
                                          ? '${(completedInSelectedYear / elapsedMonths).toStringAsFixed(1)} books/mo'
                                          : '0.0 books/mo',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w900,
                                        color: inkColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                                  border: Border.all(
                                    color: isDark
                                        ? AppColors.darkInkWhite.withValues(alpha: 0.3)
                                        : AppColors.inkBlack.withValues(alpha: 0.2),
                                    width: 1.0,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'WEEKLY PACE',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        color: mutedInk,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      completedInSelectedYear > 0
                                          ? '~${((completedInSelectedYear / elapsedMonths) / 4.33).toStringAsFixed(1)} books/wk'
                                          : 'No active pace',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w900,
                                        color: inkColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );

                  final unitEntries = _unitBreakdown.entries.where((e) => e.value > 0).toList();
                  Widget? unitVolumeCard;
                  if (unitEntries.isNotEmpty) {
                    IconData getUnitIcon(String unit) {
                      switch (unit) {
                        case 'pages': return Icons.auto_stories_rounded;
                        case 'chapters': return Icons.format_list_numbered_rounded;
                        case 'volumes': return Icons.inventory_2_outlined;
                        case 'words': return Icons.text_snippet_outlined;
                        default: return Icons.bookmark_added_rounded;
                      }
                    }

                    Color getUnitColor(String unit) {
                      switch (unit) {
                        case 'pages': return AppColors.skyBlue;
                        case 'chapters': return primaryColor;
                        case 'volumes': return AppColors.amberWarning;
                        case 'words': return AppColors.successGreen;
                        default: return primaryColor;
                      }
                    }

                    String formatUnitVal(double val) {
                      if (val >= 1000000) return '${(val / 1000000).toStringAsFixed(1)}M';
                      if (val >= 1000) return '${(val / 1000).toStringAsFixed(1)}k';
                      return val % 1 == 0 ? val.toInt().toString() : val.toStringAsFixed(1);
                    }

                    unitVolumeCard = BrutalistCard(
                      margin: EdgeInsets.zero,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.collections_bookmark_rounded, size: 16, color: primaryColor),
                              const SizedBox(width: 6),
                              Text(
                                'READING VOLUME BY UNIT ($_selectedYear)',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: unitEntries.map((entry) {
                              final unitKey = entry.key;
                              final unitVal = entry.value;
                              final unitIcon = getUnitIcon(unitKey);
                              final unitColor = getUnitColor(unitKey);

                              return Container(
                                constraints: const BoxConstraints(minWidth: 130),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                                  border: Border.all(
                                    color: isDark
                                        ? AppColors.darkInkWhite.withValues(alpha: 0.3)
                                        : AppColors.inkBlack.withValues(alpha: 0.2),
                                    width: 1.0,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(5),
                                      decoration: BoxDecoration(
                                        color: unitColor.withValues(alpha: 0.15),
                                        border: Border.all(color: unitColor, width: 1.0),
                                      ),
                                      child: Icon(unitIcon, size: 15, color: unitColor),
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          formatUnitVal(unitVal),
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w900,
                                            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                          ),
                                        ),
                                        Text(
                                          unitKey.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: mutedInk,
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    );
                  }

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
                            Expanded(
                              flex: 5,
                              child: Column(
                                children: [
                                  yearlyGoalCard,
                                  const SizedBox(height: 16),
                                  metricsGrid,
                                  const SizedBox(height: 16),
                                  streakHeatmapCard,
                                  const SizedBox(height: 16),
                                  monthlyChartCard,
                                  const SizedBox(height: 16),
                                  velocityCard,
                                ],
                              ),
                            ),
                            const SizedBox(width: 20),
                            Expanded(
                              flex: 4,
                              child: Column(
                                children: [
                                  if (unitVolumeCard != null) ...[
                                    unitVolumeCard,
                                    const SizedBox(height: 16),
                                  ],
                                  stackedDistributionCard,
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 40),
                      ],
                    );
                  }

                  return ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    children: [
                      yearlyGoalCard,
                      const SizedBox(height: 16),
                      metricsGrid,
                      const SizedBox(height: 16),
                      streakHeatmapCard,
                      if (unitVolumeCard != null) ...[
                        const SizedBox(height: 16),
                        unitVolumeCard,
                      ],
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

  Widget _buildStreakHeatmapCard(bool isDark, Color borderColor, Color primaryColor) {
    final currentStreak = _streakStats['currentStreak'] ?? 0;
    final longestStreak = _streakStats['longestStreak'] ?? 0;
    final totalDays = _streakStats['totalDays'] ?? 0;
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final mutedInk = isDark ? Colors.white60 : AppColors.inkMuted;

    // Build 53-week calendar matrix for _selectedYear
    final jan1 = DateTime(_selectedYear, 1, 1);
    final isLeapYear = (_selectedYear % 4 == 0 && _selectedYear % 100 != 0) || (_selectedYear % 400 == 0);
    final daysInYear = isLeapYear ? 366 : 365;

    // Weekday of Jan 1 (Monday = 1, Sunday = 7 in Dart DateTime)
    final startWeekdayOffset = jan1.weekday - 1; // 0 = Mon, 6 = Sun

    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & Streak Badges
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.local_fire_department_rounded, size: 16, color: primaryColor),
                  const SizedBox(width: 6),
                  Text(
                    'READING STREAK & HABITS ($_selectedYear)',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                  ),
                ],
              ),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: currentStreak > 0 ? primaryColor.withValues(alpha: 0.15) : (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh),
                      border: Border.all(color: currentStreak > 0 ? primaryColor : borderColor.withValues(alpha: 0.3), width: 1.0),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 10)),
                        const SizedBox(width: 3),
                        Text(
                          '$currentStreak DAYS CURRENT',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.3,
                            color: currentStreak > 0 ? primaryColor : inkColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurfaceHigh,
                      border: Border.all(color: borderColor.withValues(alpha: 0.3), width: 1.0),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🏆', style: TextStyle(fontSize: 10)),
                        const SizedBox(width: 3),
                        Text(
                          '$longestStreak DAYS MAX',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                            color: mutedInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Scrollable Contribution Heatmap Grid
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            reverse: _selectedYear == DateTime.now().year,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Day of week labels (Mon, Wed, Fri)
                Padding(
                  padding: const EdgeInsets.only(right: 6, top: 1),
                  child: Column(
                    children: [
                      _buildWeekdayLabel('M', mutedInk),
                      _buildWeekdayLabel('', mutedInk),
                      _buildWeekdayLabel('W', mutedInk),
                      _buildWeekdayLabel('', mutedInk),
                      _buildWeekdayLabel('F', mutedInk),
                      _buildWeekdayLabel('', mutedInk),
                      _buildWeekdayLabel('S', mutedInk),
                    ],
                  ),
                ),

                // 53 Weeks columns
                ...List.generate(53, (weekIndex) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 3.5),
                    child: Column(
                      children: List.generate(7, (dayIndex) {
                        final dayOfYear = (weekIndex * 7 + dayIndex) - startWeekdayOffset;
                        if (dayOfYear < 0 || dayOfYear >= daysInYear) {
                          return const SizedBox(width: 11, height: 11, child: SizedBox.shrink());
                        }

                        final date = jan1.add(Duration(days: dayOfYear));
                        final dateKey = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                        final units = _dailyActivity[dateKey] ?? 0.0;

                        Color cellColor;
                        if (units <= 0) {
                          cellColor = isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05);
                        } else if (units < 10) {
                          cellColor = primaryColor.withValues(alpha: 0.35);
                        } else if (units < 30) {
                          cellColor = primaryColor.withValues(alpha: 0.60);
                        } else if (units < 70) {
                          cellColor = primaryColor.withValues(alpha: 0.85);
                        } else {
                          cellColor = primaryColor;
                        }

                        final displayUnits = units % 1 == 0 ? units.toInt().toString() : units.toStringAsFixed(1);
                        final tooltipText = units > 0 ? '$dateKey: $displayUnits logged' : '$dateKey: No activity';

                        return Tooltip(
                          message: tooltipText,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 3.5),
                            width: 11,
                            height: 11,
                            decoration: BoxDecoration(
                              color: cellColor,
                              border: Border.all(
                                color: units > 0
                                    ? primaryColor.withValues(alpha: 0.6)
                                    : (isDark ? Colors.white10 : Colors.black12),
                                width: 0.5,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Heatmap Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$totalDays active reading days',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: mutedInk),
              ),
              Row(
                children: [
                  Text('LESS', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: mutedInk)),
                  const SizedBox(width: 4),
                  _buildLegendBox(isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05), isDark),
                  _buildLegendBox(primaryColor.withValues(alpha: 0.35), isDark),
                  _buildLegendBox(primaryColor.withValues(alpha: 0.60), isDark),
                  _buildLegendBox(primaryColor.withValues(alpha: 0.85), isDark),
                  _buildLegendBox(primaryColor, isDark),
                  const SizedBox(width: 4),
                  Text('MORE', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: mutedInk)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdayLabel(String text, Color color) {
    return Container(
      height: 11,
      margin: const EdgeInsets.only(bottom: 3.5),
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: color),
      ),
    );
  }

  Widget _buildLegendBox(Color color, bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 1.5),
      width: 9,
      height: 9,
      decoration: BoxDecoration(
        color: color,
        border: Border.all(color: isDark ? Colors.white10 : Colors.black12, width: 0.5),
      ),
    );
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

