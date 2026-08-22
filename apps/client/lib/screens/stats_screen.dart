import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
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
  bool _isLoading = true;

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
    setState(() {
      _books = books;
      _isLoading = false;
    });
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
    final currentYear = DateTime.now().year;

    final completed = _books.where((b) => b.status == BookStatus.completed).length;
    final reading = _books.where((b) => b.status == BookStatus.reading).length;
    final plan = _books.where((b) => b.status == BookStatus.planToRead).length;

    final completedThisYear = _books.where((b) {
      if (b.status != BookStatus.completed) return false;
      if (b.dateFinished != null && b.dateFinished!.isNotEmpty) {
        final dt = DateTime.tryParse(b.dateFinished!);
        if (dt != null) return dt.year == currentYear;
      }
      final dt = DateTime.tryParse(b.updatedAt);
      return dt != null && dt.year == currentYear;
    }).length;

    final ratedBooks = _books.where((b) => b.rating != null && b.rating! > 0).toList();
    final avgRating = ratedBooks.isEmpty
        ? 0.0
        : ratedBooks.map((b) => b.rating!).reduce((a, b) => a + b) / ratedBooks.length;

    final yearlyGoal = _syncManager.yearlyGoal;
    final goalProgress = yearlyGoal > 0 ? (completedThisYear / yearlyGoal).clamp(0.0, 1.0) : 0.0;

    // Group by publication type
    final typeCounts = <String, int>{};
    for (final b in _books) {
      typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
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

                  final yearlyGoalCard = BrutalistCard(
                    margin: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Text(
                                  '$currentYear READING GOAL',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                ),
                                const SizedBox(width: 6),
                                GestureDetector(
                                  onTap: _openSetGoalDialog,
                                  child: Icon(
                                    Icons.edit_note_rounded,
                                    size: 18,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                              ],
                            ),
                            BrutalistBadge(
                              label: '${(goalProgress * 100).toInt()}% COMPLETED',
                              backgroundColor: Theme.of(context).colorScheme.primary,
                              textColor: Colors.white,
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
                                color: Theme.of(context).colorScheme.primary,
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
                          fillColor: Theme.of(context).colorScheme.primary,
                        ),
                      ],
                    ),
                  );

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
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricTile(
                              'COMPLETED',
                              '$completed',
                              Icons.done_all_rounded,
                              AppColors.successGreen,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricTile(
                              'PLAN TO READ',
                              '$plan',
                              Icons.bookmark_border_rounded,
                              AppColors.amberWarning,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricTile(
                              'AVG RATING',
                              avgRating > 0 ? '${avgRating.toStringAsFixed(1)} ★' : 'N/A',
                              Icons.star_rounded,
                              Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  );

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
                                Icon(Icons.speed_rounded, size: 16, color: Theme.of(context).colorScheme.primary),
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
                                  ? '~${(completedThisYear / (DateTime.now().month)).toStringAsFixed(1)} books/month pace'
                                  : 'Start reading to establish pace',
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
                              '~${((completedThisYear / DateTime.now().month) * 12).round()} YEAR-END EST.',
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

                  final formatDistributionCard = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'FORMAT DISTRIBUTION',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 8),
                      BrutalistCard(
                        margin: EdgeInsets.zero,
                        child: Column(
                          children: typeCounts.entries.map((entry) {
                            final pct = _books.isEmpty ? 0.0 : entry.value / _books.length;
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
                                  velocityCard,
                                ],
                              ),
                            ),
                            const SizedBox(width: 20),

                            // Right Column: Format Distribution
                            Expanded(
                              flex: 4,
                              child: formatDistributionCard,
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
                      velocityCard,
                      const SizedBox(height: 20),
                      formatDistributionCard,
                      const SizedBox(height: 40),
                    ],
                  );
                },
              ),
            ),
    );
  }

  Widget _buildMetricTile(String title, String value, IconData icon, Color accentColor) {
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
        ],
      ),
    );
  }
}
