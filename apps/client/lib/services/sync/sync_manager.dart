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

  bool _isSyncing = false;
  bool _offlineMode = false;
  bool _autoSync = true;
  String _connectionStatus = 'Offline';
  DateTime? _lastSyncedAt;
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
    final typeIdx = prefs.getInt('backend_type') ?? 0;
    _backendType = SyncBackendType.values[typeIdx.clamp(0, SyncBackendType.values.length - 1)];

    _updateProvider();
    _startPeriodicTimer();
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

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('backend_type', type.index);
    await prefs.setString('server_url', _serverUrl);
    await prefs.setString('api_key', _apiKey);
    await prefs.setBool('offline_mode', _offlineMode);
    await prefs.setBool('auto_sync', _autoSync);
    await prefs.remove('last_synced_at');

    _updateProvider();
    await checkConnection();
    notifyListeners();
  }

  Future<bool> checkConnection() async {
    if (_offlineMode || _activeProvider == null) {
      _connectionStatus = 'Offline Mode';
      notifyListeners();
      return false;
    }

    final ok = await _activeProvider!.testConnection();
    _connectionStatus = ok ? 'Connected' : 'Connection Failed';
    notifyListeners();
    return ok;
  }

  Future<List<Book>> syncNow() async {
    if (_isSyncing) return await _dbHelper.getBooks();
    _isSyncing = true;
    notifyListeners();

    try {
      if (_offlineMode || _activeProvider == null) {
        _isSyncing = false;
        notifyListeners();
        return await _dbHelper.getBooks();
      }

      // 0. Push durable permanent delete tombstones
      final tombstones = await _dbHelper.getPendingTombstones();
      for (final tomb in tombstones) {
        final recordId = tomb['record_id'] as String;
        final ok = await _activeProvider!.deleteBook(recordId, permanent: true);
        if (ok) {
          await _dbHelper.removeTombstone(tomb['id'] as String);
        }
      }

      // 1. Push pending local book mutations
      final pending = await _dbHelper.getPendingSyncBooks();
      final failedPushIds = <String>{};

      for (final book in pending) {
        if (book.syncStatus == 'pending_delete') {
          final ok = await _activeProvider!.deleteBook(book.id, permanent: false);
          if (ok) {
            await _dbHelper.markBookSynced(book.id);
          } else {
            failedPushIds.add(book.id);
          }
        } else {
          final ok = await _activeProvider!.pushBook(book);
          if (ok) {
            await _dbHelper.markBookSynced(book.id);
          } else {
            failedPushIds.add(book.id);
          }
        }
      }

      // 1b. Push pending local reading logs (only for non-failing books)
      final pendingLogs = await _dbHelper.getPendingSyncReadingLogs();
      for (final log in pendingLogs) {
        if (!failedPushIds.contains(log.bookId)) {
          final ok = await _activeProvider!.pushReadingLog(log);
          if (ok) {
            await _dbHelper.markReadingLogSynced(log.id);
          }
        }
      }

      // 2. Fetch remote updates (including soft-deleted/trash books)
      final remote = await _activeProvider!.fetchRemoteBooks();
      if (remote.isNotEmpty) {
        final remoteIds = <String>{};
        for (final b in remote) {
          if (!failedPushIds.contains(b.id)) {
            remoteIds.add(b.id);
            await _dbHelper.upsertRemoteBook(b);
          }
        }
        // Only cleanup missing remote books if we got a non-empty remote list
        // This guards against accidental full wipe due to transient network errors
        if (failedPushIds.isEmpty && remote.isNotEmpty) {
          await _dbHelper.cleanupMissingRemoteBooks(remoteIds);
        }
      }
      // NOTE: intentionally no cleanup on empty remote — avoids wiping all local
      // books if the server returns nothing due to a transient error or quota issue.

      // 2b. Fetch remote reading logs and recalculate pace for affected books
      final localLogCount = await _dbHelper.getReadingLogsCount();
      final sinceParam = (localLogCount == 0) ? null : _lastSyncedAt;
      final remoteLogs = await _activeProvider!.fetchRemoteReadingLogs(since: sinceParam);
      if (remoteLogs.isNotEmpty) {
        final affectedBookIds = <String>{};
        for (final log in remoteLogs) {
          await _dbHelper.upsertRemoteReadingLog(log);
          affectedBookIds.add(log.bookId);
        }
        // Recalculate reading pace for every book that received new remote logs,
        // ensuring cross-device pace stays accurate without requiring a local progress entry.
        await _dbHelper.recalculatePaceForBooks(affectedBookIds);
      }

      // 3. Fetch remote yearly goal
      final remoteGoal = await _activeProvider!.fetchYearlyGoal();
      if (remoteGoal != null && remoteGoal != _yearlyGoal) {
        _yearlyGoal = remoteGoal;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('yearly_goal', _yearlyGoal);
      }

      _lastSyncedAt = DateTime.now();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_synced_at', _lastSyncedAt!.toIso8601String());

      _connectionStatus = failedPushIds.isEmpty ? 'Connected' : 'Sync Partially Succeeded';
    } catch (e, stack) {
      // Log the real error for debuggability rather than silently swallowing it
      debugPrint('[SyncManager] syncNow error: $e\n$stack');
      _connectionStatus = 'Sync Interrupted';
    } finally {
      _isSyncing = false;
      notifyListeners();
    }

    return await _dbHelper.getBooks();
  }

  Future<void> updateYearlyGoal(int newGoal) async {
    if (newGoal < 0) return;
    _yearlyGoal = newGoal;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('yearly_goal', newGoal);
    notifyListeners();

    if (!_offlineMode && _activeProvider != null) {
      await _activeProvider!.pushYearlyGoal(newGoal);
    }
  }
}
