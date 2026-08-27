import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/book.dart';
import '../database_helper.dart';
import 'generic_rest_sync_provider.dart';
import 'supabase_sync_provider.dart';
import 'sync_provider.dart';

class SyncManager extends ChangeNotifier {
  static final SyncManager instance = SyncManager._init();

  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  RemoteSyncProvider? _activeProvider;
  Timer? _periodicTimer;
  Timer? _debouncedSyncTimer;

  bool _isSyncing = false;
  bool _offlineMode = false;
  bool _autoSync = true;
  String _connectionStatus = 'Offline';
  DateTime? _lastSyncedAt;
  DateTime? _lastBookSyncCursor;
  DateTime? _lastJourneySyncCursor;
  DateTime? _lastLogSyncCursor;
  int _syncCount = 0;
  int _yearlyGoal = 25;

  SyncBackendType _backendType = SyncBackendType.supabase;
  String _serverUrl = '';
  String _apiKey = '';

  SyncManager._init();

  bool get isSyncing => _isSyncing;
  bool get offlineMode => _offlineMode;
  bool get autoSync => _autoSync;
  String get connectionStatus => _connectionStatus;
  DateTime? get lastSyncedAt => _lastSyncedAt;
  int get yearlyGoal => _yearlyGoal;
  SyncBackendType get backendType => _backendType;
  String get serverUrl => _serverUrl;
  String get apiKey => _apiKey;
  RemoteSyncProvider? get activeProvider => _activeProvider;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _offlineMode = prefs.getBool('offline_mode') ?? false;
    _autoSync = prefs.getBool('auto_sync') ?? true;
    _serverUrl = prefs.getString('server_url') ?? '';
    _apiKey = prefs.getString('api_key') ?? '';
    _yearlyGoal = prefs.getInt('yearly_goal') ?? 25;
    final lastSyncedStr = prefs.getString('last_synced_at');
    if (lastSyncedStr != null && lastSyncedStr.isNotEmpty) {
      _lastSyncedAt = DateTime.tryParse(lastSyncedStr);
    }
    final lastBookCursorStr = prefs.getString('last_book_sync_cursor');
    if (lastBookCursorStr != null && lastBookCursorStr.isNotEmpty) {
      _lastBookSyncCursor = DateTime.tryParse(lastBookCursorStr);
    }
    final lastLogCursorStr = prefs.getString('last_log_sync_cursor');
    if (lastLogCursorStr != null && lastLogCursorStr.isNotEmpty) {
      _lastLogSyncCursor = DateTime.tryParse(lastLogCursorStr);
    }
    final lastJourneyCursorStr = prefs.getString('last_journey_sync_cursor');
    if (lastJourneyCursorStr != null && lastJourneyCursorStr.isNotEmpty) {
      _lastJourneySyncCursor = DateTime.tryParse(lastJourneyCursorStr);
    }
    final typeIdx = prefs.getInt('backend_type') ?? 0;
    _backendType = SyncBackendType.values[typeIdx.clamp(0, SyncBackendType.values.length - 1)];

    _updateProvider();
    _startPeriodicTimer();
    await loadCachedGoals();
    await checkConnection();
  }

  void _startPeriodicTimer() {
    _periodicTimer?.cancel();
    if (_autoSync && !_offlineMode && _activeProvider != null) {
      _periodicTimer = Timer.periodic(const Duration(minutes: 5), (_) {
        if (!_isSyncing) {
          syncNow();
        }
      });
    }
  }

  void scheduleSyncSoon({Duration delay = const Duration(milliseconds: 1200)}) {
    if (_offlineMode || _activeProvider == null) return;
    _debouncedSyncTimer?.cancel();
    _debouncedSyncTimer = Timer(delay, () {
      if (!_isSyncing) {
        syncNow();
      }
    });
  }

  void _updateProvider() {
    if (_offlineMode || _backendType == SyncBackendType.offlineOnly) {
      _activeProvider = null;
      _connectionStatus = 'Offline';
    } else if (_backendType == SyncBackendType.supabase) {
      _activeProvider = SupabaseSyncProvider(supabaseUrl: _serverUrl, anonKey: _apiKey);
    } else {
      _activeProvider = GenericRestSyncProvider(serverUrl: _serverUrl, apiKey: _apiKey);
    }
    _startPeriodicTimer();
  }

  Future<void> updateConfig({
    required SyncBackendType type,
    required String url,
    required String apiKey,
    required bool offlineMode,
    required bool autoSync,
  }) async {
    _backendType = type;
    _serverUrl = url.trim();
    _apiKey = apiKey.trim();
    _offlineMode = offlineMode;
    _autoSync = autoSync;
    _lastSyncedAt = null;
    _lastBookSyncCursor = null;
    _lastLogSyncCursor = null;
    _lastJourneySyncCursor = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('backend_type', type.index);
    await prefs.setString('server_url', _serverUrl);
    await prefs.setString('api_key', _apiKey);
    await prefs.setBool('offline_mode', _offlineMode);
    await prefs.setBool('auto_sync', _autoSync);
    await prefs.remove('last_synced_at');
    await prefs.remove('last_book_sync_cursor');
    await prefs.remove('last_log_sync_cursor');
    await prefs.remove('last_journey_sync_cursor');

    _updateProvider();
    await checkConnection();
    notifyListeners();
  }

  Future<bool> checkConnection() async {
    if (_offlineMode || _activeProvider == null) {
      _connectionStatus = 'Offline';
      notifyListeners();
      return false;
    }

    final ok = await _activeProvider!.testConnection();
    _connectionStatus = ok ? 'Connected' : 'Connection Failed';
    notifyListeners();
    return ok;
  }

  Future<List<Book>> syncNow({bool forceFullReconciliation = false}) async {
    if (_offlineMode || _activeProvider == null) {
      return await _dbHelper.getBooks();
    }

    if (_isSyncing) {
      return await _dbHelper.getBooks();
    }

    _isSyncing = true;
    _syncCount++;
    notifyListeners();

    try {
      final isConn = await _activeProvider!.testConnection();
      if (!isConn) {
        _connectionStatus = 'Connection Failed';
        _isSyncing = false;
        notifyListeners();
        return await _dbHelper.getBooks();
      }

      final isFullReconciliation = forceFullReconciliation ||
          _syncCount % 10 == 1 ||
          _lastBookSyncCursor == null ||
          _lastJourneySyncCursor == null ||
          _lastLogSyncCursor == null;

      final syncStartTime = DateTime.now().toUtc();

      final tombstones = await _dbHelper.getPendingTombstones();
      for (final tomb in tombstones) {
        final recordId = tomb['record_id'] as String;
        final ok = await _activeProvider!.deleteBook(recordId, permanent: true);
        if (ok) {
          await _dbHelper.removeTombstone(tomb['id'] as String);
        }
      }

      final pending = await _dbHelper.getPendingSyncBooks();
      final failedPushIds = <String>{};

      final toDelete = <Book>[];
      final toUpsert = <Book>[];
      for (final b in pending) {
        if (b.syncStatus == 'pending_delete') {
          toDelete.add(b);
        } else {
          toUpsert.add(b);
        }
      }

      if (toUpsert.isNotEmpty) {
        final failed = await _activeProvider!.pushBooks(toUpsert);
        failedPushIds.addAll(failed);
        final successful = toUpsert.where((b) => !failed.contains(b.id));
        for (final b in successful) {
          await _dbHelper.markBookSynced(b.id);
        }
      }

      for (final b in toDelete) {
        final ok = await _activeProvider!.deleteBook(b.id, permanent: false);
        if (ok) {
          await _dbHelper.markBookSynced(b.id);
        } else {
          failedPushIds.add(b.id);
        }
      }

      final pendingJourneys = await _dbHelper.getPendingSyncReadingJourneys();
      final journeysToPush = pendingJourneys.where((j) => !failedPushIds.contains(j.bookId)).toList();
      final failedJourneyPushIds = <String>{};
      if (journeysToPush.isNotEmpty) {
        final failedJourneys = await _activeProvider!.pushReadingJourneys(journeysToPush);
        failedJourneyPushIds.addAll(failedJourneys);
        final successfulJourneys = journeysToPush.where((j) => !failedJourneys.contains(j.id));
        for (final j in successfulJourneys) {
          await _dbHelper.markReadingJourneySynced(j.id);
        }
      }

      final pendingLogs = await _dbHelper.getPendingSyncReadingLogs();
      final logsToPush = pendingLogs.where((l) => !failedPushIds.contains(l.bookId) && (l.journeyId == null || !failedJourneyPushIds.contains(l.journeyId))).toList();
      if (logsToPush.isNotEmpty) {
        final failedLogs = await _activeProvider!.pushReadingLogs(logsToPush);
        final successfulLogs = logsToPush.where((l) => !failedLogs.contains(l.id));
        for (final l in successfulLogs) {
          await _dbHelper.markReadingLogSynced(l.id);
        }
      }

      final bookFetchCursor = isFullReconciliation ? null : _lastBookSyncCursor;
      final remote = await _activeProvider!.fetchRemoteBooks(since: bookFetchCursor);

      if (remote.isNotEmpty) {
        final remoteToUpsert = remote.where((b) => !failedPushIds.contains(b.id)).toList();
        await _dbHelper.upsertRemoteBooks(remoteToUpsert);

        if (isFullReconciliation && failedPushIds.isEmpty) {
          final remoteIds = remote.map((b) => b.id).toSet();
          await _dbHelper.cleanupMissingRemoteBooks(remoteIds);
        }
      }

      final journeyFetchCursor = isFullReconciliation ? null : _lastJourneySyncCursor;
      final remoteJourneys = await _activeProvider!.fetchRemoteReadingJourneys(since: journeyFetchCursor);
      if (remoteJourneys.isNotEmpty) {
        await _dbHelper.upsertRemoteReadingJourneys(remoteJourneys);
      }

      final logFetchCursor = isFullReconciliation ? null : _lastLogSyncCursor;
      final remoteLogs = await _activeProvider!.fetchRemoteReadingLogs(since: logFetchCursor);

      if (remoteLogs.isNotEmpty) {
        await _dbHelper.upsertRemoteReadingLogs(remoteLogs);
        final affectedBookIds = remoteLogs.map((l) => l.bookId).toSet();
        await _dbHelper.recalculatePaceForBooks(affectedBookIds);
      }

      final remoteGoal = await _activeProvider!.fetchYearlyGoal();
      if (remoteGoal != null && remoteGoal != _yearlyGoal) {
        _yearlyGoal = remoteGoal;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('yearly_goal', _yearlyGoal);
      }

      _lastSyncedAt = DateTime.now();
      _lastBookSyncCursor = syncStartTime;
      _lastJourneySyncCursor = syncStartTime;
      _lastLogSyncCursor = syncStartTime;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_synced_at', _lastSyncedAt!.toIso8601String());
      await prefs.setString('last_book_sync_cursor', _lastBookSyncCursor!.toIso8601String());
      await prefs.setString('last_journey_sync_cursor', _lastJourneySyncCursor!.toIso8601String());
      await prefs.setString('last_log_sync_cursor', _lastLogSyncCursor!.toIso8601String());

      _connectionStatus = failedPushIds.isEmpty ? 'Connected' : 'Sync Partially Succeeded';
    } catch (e, stack) {
      debugPrint('[SyncManager] syncNow error: $e\n$stack');
      _connectionStatus = 'Sync Interrupted';
    } finally {
      _isSyncing = false;
      notifyListeners();
    }

    return await _dbHelper.getBooks();
  }

  Future<void> updateYearlyGoal(int newGoal) async {
    await setGoalFor(year: DateTime.now().year, metric: 'books', target: newGoal);
  }

  int getGoalFor({required int year, required String metric}) {
    final key = 'yearly_goal_${year}_$metric';
    if (metric == 'books' && year == DateTime.now().year) {
      return _yearlyGoal;
    }
    // Fallback: If no explicit goal for that year/metric, check default
    return _sharedPreferencesCache[key] ?? (metric == 'books' ? _yearlyGoal : 0);
  }

  final Map<String, int> _sharedPreferencesCache = {};

  Future<void> loadCachedGoals() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys();
    for (final k in keys) {
      if (k.startsWith('yearly_goal_')) {
        final val = prefs.getInt(k);
        if (val != null) {
          _sharedPreferencesCache[k] = val;
        }
      }
    }
  }

  Future<void> setGoalFor({required int year, required String metric, required int target}) async {
    if (target < 0) return;
    final key = 'yearly_goal_${year}_$metric';
    _sharedPreferencesCache[key] = target;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(key, target);

    if (metric == 'books' && year == DateTime.now().year) {
      _yearlyGoal = target;
      await prefs.setInt('yearly_goal', target);
      if (!_offlineMode && _activeProvider != null) {
        await _activeProvider!.pushYearlyGoal(target);
      }
    }

    notifyListeners();
  }
}
