import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/services/update_service.dart';

void main() {
  group('UpdateService Version Comparison Tests', () {
    test('compareVersions accurately compares letter suffixes within same minor release', () {
      expect(UpdateService.compareVersions('v1.6.0b', 'v1.6.0a'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.6.0b'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0a', 'v1.6.0c'), lessThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.6.0c'), equals(0));
    });

    test('compareVersions accurately compares minor rollover releases', () {
      expect(UpdateService.compareVersions('v1.7.0', 'v1.6.0c'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.7.0a', 'v1.7.0'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.6.0c', 'v1.7.0'), lessThan(0));
    });

    test('compareVersions accurately compares major generation rollover', () {
      expect(UpdateService.compareVersions('v2.0.0', 'v1.9.0c'), greaterThan(0));
      expect(UpdateService.compareVersions('v1.9.0c', 'v2.0.0'), lessThan(0));
    });

    test('isNewerVersion flags updates correctly', () {
      expect(UpdateService.isNewerVersion('v1.7.0', 'v1.6.0c'), isTrue);
      expect(UpdateService.isNewerVersion('v1.6.0d', 'v1.6.0c'), isTrue);
      expect(UpdateService.isNewerVersion('v1.6.0c', 'v1.6.0c'), isFalse);
      expect(UpdateService.isNewerVersion('v1.6.0b', 'v1.6.0c'), isFalse);
    });
  });
}
