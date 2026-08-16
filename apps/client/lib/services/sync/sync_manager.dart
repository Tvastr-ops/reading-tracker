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
    final typeIdx = prefs.getInt('backend_type') ?? 0;
    _backendType = SyncBackendType.values[typeIdx.clamp(0, SyncBackendType.values.length - 1)];

    _updateProvider();
    await checkConnection();
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

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('backend_type', type.index);
    await prefs.setString('server_url', _serverUrl);
    await prefs.setString('api_key', _apiKey);
    await prefs.setBool('offline_mode', _offlineMode);
    await prefs.setBool('auto_sync', _autoSync);

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

      // 1. Push pending local mutations
      final pending = await _dbHelper.getPendingSyncBooks();
      final failedPushIds = <String>{};

      for (final book in pending) {
        if (book.syncStatus == 'pending_delete') {
          final ok = await _activeProvider!.deleteBook(book.id);
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

      // 2. Fetch remote updates (only upsert if local copy has no unpushed local changes)
      final remote = await _activeProvider!.fetchRemoteBooks();
      if (remote.isNotEmpty) {
        for (final b in remote) {
          if (!failedPushIds.contains(b.id)) {
            await _dbHelper.upsertRemoteBook(b);
          }
        }
      }

      // 3. Fetch remote yearly goal
      final remoteGoal = await _activeProvider!.fetchYearlyGoal();
      if (remoteGoal != null && remoteGoal != _yearlyGoal) {
        _yearlyGoal = remoteGoal;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt('yearly_goal', _yearlyGoal);
      }

      _lastSyncedAt = DateTime.now();
      _connectionStatus = failedPushIds.isEmpty ? 'Connected' : 'Sync Partially Succeeded';
    } catch (_) {
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
