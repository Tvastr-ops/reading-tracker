import 'package:flutter/material.dart';
import '../models/book.dart';
import '../services/database_helper.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({super.key});

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  List<Book> _books = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoading = true);
    final books = await _dbHelper.getBooks();
    setState(() {
      _books = books;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final completed = _books.where((b) => b.status == BookStatus.completed).length;
    final reading = _books.where((b) => b.status == BookStatus.reading).length;
    final plan = _books.where((b) => b.status == BookStatus.planToRead).length;

    final ratedBooks = _books.where((b) => b.rating != null && b.rating! > 0).toList();
    final avgRating = ratedBooks.isEmpty
        ? 0.0
        : ratedBooks.map((b) => b.rating!).reduce((a, b) => a + b) / ratedBooks.length;

    const yearlyGoal = 25;
    final goalProgress = (completed / yearlyGoal).clamp(0.0, 1.0);

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
              onRefresh: _loadStats,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  // Yearly Reading Goal Card
                  BrutalistCard(
                    margin: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              '2026 READING GOAL',
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                            ),
                            BrutalistBadge(
                              label: '${(goalProgress * 100).toInt()}% COMPLETED',
                              backgroundColor: AppColors.primaryRed,
                              textColor: Colors.white,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Text(
                              '$completed',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primaryRed,
                              ),
                            ),
                            const Text(
                              ' / 25 BOOKS',
                              style: TextStyle(
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
                          fillColor: AppColors.primaryRed,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2x2 Metric Grid
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
                          AppColors.primaryRed,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Format Breakdown
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
                                fillColor: AppColors.inkBlack,
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
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
