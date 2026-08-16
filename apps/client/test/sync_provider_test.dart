import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/services/sync/generic_rest_sync_provider.dart';
import 'package:reading_tracker_app/services/sync/supabase_sync_provider.dart';
import 'package:reading_tracker_app/services/sync/sync_provider.dart';

void main() {
  group('Sync Providers Unit Tests', () {
    test('SupabaseSyncProvider initialized correctly', () {
      final provider = SupabaseSyncProvider(
        supabaseUrl: 'https://example.supabase.co',
        anonKey: 'test-key',
      );

      expect(provider.type, SyncBackendType.supabase);
      expect(provider.name, 'Supabase (PostgreSQL)');
    });

    test('GenericRestSyncProvider initialized correctly', () {
      final provider = GenericRestSyncProvider(
        serverUrl: 'https://api.customserver.com',
        apiKey: 'custom-secret',
      );

      expect(provider.type, SyncBackendType.selfHostedRest);
      expect(provider.name, 'Self-Hosted REST Server');
    });

    test('SyncBackendType enum indexing', () {
      expect(SyncBackendType.values.length, 3);
      expect(SyncBackendType.supabase.index, 0);
      expect(SyncBackendType.selfHostedRest.index, 1);
      expect(SyncBackendType.offlineOnly.index, 2);
    });

    test('SupabaseSyncProvider returns null when url is empty', () async {
      final provider = SupabaseSyncProvider(supabaseUrl: '', anonKey: '');
      final goal = await provider.fetchYearlyGoal();
      expect(goal, isNull);
    });

    test('GenericRestSyncProvider returns null when url is empty', () async {
      final provider = GenericRestSyncProvider(serverUrl: '');
      final goal = await provider.fetchYearlyGoal();
      expect(goal, isNull);
    });
  });
}
