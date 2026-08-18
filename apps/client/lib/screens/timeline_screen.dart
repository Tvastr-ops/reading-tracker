import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/database_helper.dart';
import '../services/sync/sync_manager.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';

class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key});

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final SyncManager _syncManager = SyncManager.instance;
  final ScrollController _scrollController = ScrollController();

  static const int _pageSize = 30;
  List<Map<String, dynamic>> _logs = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _loadInitialLogs();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
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
    setState(() {
      _logs = logs;
      _isLoading = false;
      _hasMore = logs.length >= _pageSize;
    });
  }

  Future<void> _loadMoreLogs() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final nextLogs = await _dbHelper.getAllReadingLogsWithBookInfo(
      limit: _pageSize,
      offset: _logs.length,
    );

    setState(() {
      _logs.addAll(nextLogs);
      _isLoadingMore = false;
      _hasMore = nextLogs.length >= _pageSize;
    });
  }

  String _formatDateHeader(String isoString) {
    final dt = DateTime.tryParse(isoString)?.toLocal();
    if (dt == null) return 'RECENT';

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final logDate = DateTime(dt.year, dt.month, dt.day);

    if (logDate == today) {
      return 'TODAY';
    } else if (logDate == today.subtract(const Duration(days: 1))) {
      return 'YESTERDAY';
    } else if (now.year == dt.year) {
      return DateFormat('MMMM d, yyyy').format(dt).toUpperCase();
    } else {
      return DateFormat('MMMM d, yyyy').format(dt).toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final mutedInk = details?.inkMutedColor ?? (isDark ? Colors.white60 : AppColors.inkMuted);
    final surfaceHigh = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface);

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
          : _logs.isEmpty
              ? Center(
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
                )
              : Center(
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 850),
                    child: RefreshIndicator(
                      onRefresh: () async {
                        await _syncManager.syncNow();
                        await _loadInitialLogs();
                      },
                      child: ListView.builder(
                        controller: _scrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _logs.length + (_hasMore ? 1 : 0),
                        itemBuilder: (context, index) {
                      if (index == _logs.length) {
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

                      final item = _logs[index];
                      final fromProg = (item['from_progress'] as num?)?.toDouble() ?? 0.0;
                      final toProg = (item['to_progress'] as num?)?.toDouble() ?? 0.0;
                      final delta = (toProg - fromProg).clamp(0.0, 99999.0);
                      final deltaStr = delta % 1 == 0 ? delta.toInt().toString() : delta.toStringAsFixed(1);
                      final fromStr = fromProg % 1 == 0 ? fromProg.toInt().toString() : fromProg.toStringAsFixed(1);
                      final toStr = toProg % 1 == 0 ? toProg.toInt().toString() : toProg.toStringAsFixed(1);
                      final loggedAt = item['logged_at']?.toString() ?? '';
                      final bookTitle = item['book_title']?.toString() ?? 'Unknown Book';
                      final bookType = item['book_type']?.toString() ?? 'Novel';
                      final note = item['note']?.toString();

                      final showHeader = index == 0 ||
                          _formatDateHeader(_logs[index - 1]['logged_at']?.toString() ?? '') !=
                              _formatDateHeader(loggedAt);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showHeader) ...[
                            Padding(
                              padding: EdgeInsets.only(top: index == 0 ? 0 : 16, bottom: 8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: accentColor,
                                  border: Border.all(color: borderColor, width: 1.5),
                                ),
                                child: Text(
                                  _formatDateHeader(loggedAt),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          BrutalistCard(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        bookTitle.toUpperCase(),
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 14,
                                          letterSpacing: -0.2,
                                          color: inkColor,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: surfaceHigh,
                                        border: Border.all(color: borderColor, width: 1),
                                      ),
                                      child: Text(
                                        '+$deltaStr',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 11,
                                          color: accentColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Text(
                                      '$bookType • Progress: $fromStr ➔ $toStr',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: mutedInk,
                                      ),
                                    ),
                                  ],
                                ),
                                if (note != null && note.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: surfaceHigh,
                                      border: Border.all(
                                        color: borderColor.withValues(alpha: 0.3),
                                        width: 1,
                                      ),
                                    ),
                                    child: Text(
                                      '"$note"',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontStyle: FontStyle.italic,
                                        fontWeight: FontWeight.w500,
                                        color: inkColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            ),
    );
  }
}
