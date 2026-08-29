import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path/path.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorageService {
  static final SecureStorageService instance = SecureStorageService._();
  SecureStorageService._();

  bool _isInitialized = false;
  bool _isPortable = false;
  String? _portableDataDir;
  FlutterSecureStorage? _secureStorage;
  String? _activeMasterKey;

  bool get isPortable => _isPortable;
  String? get portableDataDir => _portableDataDir;

  /// Pure Dart PBKDF2 HMAC-SHA256 key derivation (RFC 2898)
  static Uint8List pbkdf2HmacSha256(
    Uint8List password,
    Uint8List salt, {
    int iterations = 100000,
    int keyLength = 32,
  }) {
    final hmac = Hmac(sha256, password);
    final numBlocks = (keyLength + 31) ~/ 32;
    final result = BytesBuilder(copy: false);

    for (int block = 1; block <= numBlocks; block++) {
      final blockBytes = Uint8List(salt.length + 4);
      blockBytes.setAll(0, salt);
      ByteData.view(blockBytes.buffer, salt.length, 4).setUint32(0, block, Endian.big);

      var u = hmac.convert(blockBytes).bytes;
      var t = Uint8List.fromList(u);

      for (int iter = 1; iter < iterations; iter++) {
        u = hmac.convert(u).bytes;
        for (int k = 0; k < t.length; k++) {
          t[k] ^= u[k];
        }
      }
      result.add(t);
    }
    return Uint8List.sublistView(result.toBytes(), 0, keyLength);
  }

  /// Generate cryptographically secure random bytes
  static Uint8List generateRandomBytes(int length) {
    final rng = Random.secure();
    final bytes = Uint8List(length);
    for (int i = 0; i < length; i++) {
      bytes[i] = rng.nextInt(256);
    }
    return bytes;
  }

  Future<void> init() async {
    if (_isInitialized) return;

    // Detect portable mode
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
      try {
        final exeDir = File(Platform.resolvedExecutable).parent.path;
        final portableDataDir = Directory(join(exeDir, 'portable_data'));
        final portableMarker = File(join(exeDir, '.portable'));

        if (portableDataDir.existsSync() || portableMarker.existsSync()) {
          if (!portableDataDir.existsSync()) {
            portableDataDir.createSync(recursive: true);
          }
          _isPortable = true;
          _portableDataDir = portableDataDir.path;
        }
      } catch (e) {
        debugPrint('SecureStorageService portable check error: $e');
      }
    }

    if (!_isPortable) {
      _secureStorage = const FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        wOptions: WindowsOptions(),
        lOptions: LinuxOptions(),
        mOptions: MacOsOptions(),
        iOptions: IOSOptions(),
      );
    }

    _isInitialized = true;
    await _migrateFromLegacySharedPreferences();
  }

  void setMasterKey(String masterKey) {
    _activeMasterKey = masterKey;
  }

  void clearMasterKey() {
    _activeMasterKey = null;
  }

  String _getEffectivePortableKeySecret() {
    if (_activeMasterKey != null && _activeMasterKey!.isNotEmpty) {
      return _activeMasterKey!;
    }
    // Fallback fingerprint derived from host machine and executable path
    try {
      final exe = Platform.resolvedExecutable;
      final host = Platform.localHostname;
      return sha256.convert(utf8.encode('PAPERBACK_PORTABLE_${host}_$exe')).toString();
    } catch (_) {
      return 'PAPERBACK_PORTABLE_DEFAULT_SECRET_FALLBACK';
    }
  }

  File? _getPortableConfigFile() {
    if (!_isPortable || _portableDataDir == null) return null;
    return File(join(_portableDataDir!, 'secure_config.dat'));
  }

  Map<String, String> _readPortableConfigData() {
    final file = _getPortableConfigFile();
    if (file == null || !file.existsSync()) return {};

    try {
      final rawString = file.readAsStringSync().trim();
      if (rawString.isEmpty) return {};

      final jsonMap = jsonDecode(rawString) as Map<String, dynamic>;
      final saltBase64 = jsonMap['salt'] as String?;
      final ivBase64 = jsonMap['iv'] as String?;
      final cipherBase64 = jsonMap['data'] as String?;

      if (saltBase64 == null || ivBase64 == null || cipherBase64 == null) {
        return {};
      }

      final salt = base64Decode(saltBase64);
      final iv = enc.IV(base64Decode(ivBase64));
      final secret = _getEffectivePortableKeySecret();
      final keyBytes = pbkdf2HmacSha256(Uint8List.fromList(utf8.encode(secret)), salt);
      final encKey = enc.Key(keyBytes);

      final encrypter = enc.Encrypter(enc.AES(encKey, mode: enc.AESMode.cbc));
      final decryptedStr = encrypter.decrypt(enc.Encrypted.fromBase64(cipherBase64), iv: iv);
      final map = jsonDecode(decryptedStr) as Map<String, dynamic>;
      return map.map((k, v) => MapEntry(k, v.toString()));
    } catch (e) {
      debugPrint('SecureStorageService portable decrypt error: $e');
      return {};
    }
  }

  void _writePortableConfigData(Map<String, String> data) {
    final file = _getPortableConfigFile();
    if (file == null) return;

    try {
      final secret = _getEffectivePortableKeySecret();
      final salt = generateRandomBytes(32);
      final ivBytes = generateRandomBytes(16);
      final iv = enc.IV(ivBytes);

      final keyBytes = pbkdf2HmacSha256(Uint8List.fromList(utf8.encode(secret)), salt);
      final encKey = enc.Key(keyBytes);
      final encrypter = enc.Encrypter(enc.AES(encKey, mode: enc.AESMode.cbc));

      final plainJson = jsonEncode(data);
      final encrypted = encrypter.encrypt(plainJson, iv: iv);

      final container = {
        'salt': base64Encode(salt),
        'iv': base64Encode(ivBytes),
        'data': encrypted.base64,
        'v': 1,
      };

      file.writeAsStringSync(jsonEncode(container), flush: true);
    } catch (e) {
      debugPrint('SecureStorageService portable write error: $e');
    }
  }

  Future<String?> read(String key) async {
    await init();
    if (_isPortable) {
      final map = _readPortableConfigData();
      return map[key];
    } else {
      try {
        return await _secureStorage?.read(key: key);
      } catch (e) {
        debugPrint('SecureStorageService read error: $e');
        return null;
      }
    }
  }

  Future<void> write(String key, String value) async {
    await init();
    if (_isPortable) {
      final map = _readPortableConfigData();
      map[key] = value;
      _writePortableConfigData(map);
    } else {
      try {
        await _secureStorage?.write(key: key, value: value);
      } catch (e) {
        debugPrint('SecureStorageService write error: $e');
      }
    }
  }

  Future<void> delete(String key) async {
    await init();
    if (_isPortable) {
      final map = _readPortableConfigData();
      if (map.containsKey(key)) {
        map.remove(key);
        _writePortableConfigData(map);
      }
    } else {
      try {
        await _secureStorage?.delete(key: key);
      } catch (e) {
        debugPrint('SecureStorageService delete error: $e');
      }
    }
  }

  Future<void> deleteAll() async {
    await init();
    if (_isPortable) {
      final file = _getPortableConfigFile();
      if (file != null && file.existsSync()) {
        try {
          file.deleteSync();
        } catch (_) {}
      }
    } else {
      try {
        await _secureStorage?.deleteAll();
      } catch (e) {
        debugPrint('SecureStorageService deleteAll error: $e');
      }
    }
  }

  Future<void> _migrateFromLegacySharedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final alreadyMigrated = prefs.getBool('migrated_to_secure_v1') ?? false;
      if (alreadyMigrated) return;

      final oldApiKey = prefs.getString('api_key');
      final oldServerUrl = prefs.getString('server_url');

      if (oldApiKey != null && oldApiKey.isNotEmpty) {
        await write('api_key', oldApiKey);
        await prefs.remove('api_key');
      }

      if (oldServerUrl != null && oldServerUrl.isNotEmpty) {
        await write('server_url', oldServerUrl);
        await prefs.remove('server_url');
      }

      await prefs.setBool('migrated_to_secure_v1', true);
    } catch (e) {
      debugPrint('SecureStorageService migration error: $e');
    }
  }
}
