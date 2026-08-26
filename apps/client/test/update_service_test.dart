import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/services/update_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('UpdateService Version Comparison Tests', () {
    test('compareVersions accurately compares letter suffixes within same minor release', () {
      expect(UpdateService.compareVersions('v1.6.0b', 'v1.6.0a'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.6.0b'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0a', 'v1.6.0c'), lessThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.6.0c'), equals(0));
      expect(UpdateService.compareVersions('v1.7.0a', 'v1.7.0'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.7.0', 'v1.7.0'), equals(0));
    });

    test('compareVersions accurately compares minor rollover releases', () {
      expect(UpdateService.compareVersions('v1.7.0', 'v1.6.0c'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.7.0a', 'v1.7.0'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.7.0'), lessThan(0));
      expect(UpdateService.compareVersions('v1.8.0', 'v1.7.0c'), greaterThan(0));
    });

    test('compareVersions accurately compares major generation rollover', () {
      expect(UpdateService.compareVersions('v2.0.0', 'v1.9.0c'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.9.0c', 'v2.0.0'), lessThan(0));
    });

    test('isNewerVersion flags updates correctly', () {
      expect(UpdateService.isNewerVersion('v1.7.0a', 'v1.7.0'), isTrue);
      expect(UpdateService.isNewerVersion('v1.8.0', 'v1.7.0'), isTrue);
      expect(UpdateService.isNewerVersion('v1.7.0', 'v1.7.0'), isFalse);
      expect(UpdateService.isNewerVersion('v1.6.0c', 'v1.7.0'), isFalse);
    });

    test('getCurrentAppVersion returns currentReleaseVersion when package info is unconfigured', () async {
      final version = await UpdateService.instance.getCurrentAppVersion();
      expect(version, equals('v2.2.0b'));
    });
  });
}
