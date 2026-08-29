import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/services/secure_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SecureStorageService Cryptographic Tests', () {
    test('PBKDF2 HMAC-SHA256 produces deterministic 32-byte key', () {
      final password = Uint8List.fromList(utf8.encode('test_master_secret_123456'));
      final salt = Uint8List.fromList(utf8.encode('salt_32_bytes_test_vector_salt_12'));

      final key1 = SecureStorageService.pbkdf2HmacSha256(
        password,
        salt,
        iterations: 1000,
        keyLength: 32,
      );

      final key2 = SecureStorageService.pbkdf2HmacSha256(
        password,
        salt,
        iterations: 1000,
        keyLength: 32,
      );

      expect(key1.length, equals(32));
      expect(key2.length, equals(32));
      expect(key1, equals(key2));
    });

    test('PBKDF2 with different passwords produces distinct keys', () {
      final passA = Uint8List.fromList(utf8.encode('pin_123456'));
      final passB = Uint8List.fromList(utf8.encode('pin_654321'));
      final salt = Uint8List.fromList(utf8.encode('uniform_test_salt_for_vector_01'));

      final keyA = SecureStorageService.pbkdf2HmacSha256(passA, salt, iterations: 1000, keyLength: 32);
      final keyB = SecureStorageService.pbkdf2HmacSha256(passB, salt, iterations: 1000, keyLength: 32);

      expect(keyA, isNot(equals(keyB)));
    });

    test('generateRandomBytes generates secure non-zero random sequences', () {
      final bytes1 = SecureStorageService.generateRandomBytes(32);
      final bytes2 = SecureStorageService.generateRandomBytes(32);

      expect(bytes1.length, equals(32));
      expect(bytes2.length, equals(32));
      expect(bytes1, isNot(equals(bytes2)));
    });
  });
}
