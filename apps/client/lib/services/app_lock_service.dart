import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'secure_storage_service.dart';

enum AppLockType { pin, password }

class AppLockService extends ChangeNotifier {
  static final AppLockService instance = AppLockService._();
  AppLockService._();

  final LocalAuthentication _localAuth = LocalAuthentication();
  final ValueNotifier<bool> isCurrentlyLocked = ValueNotifier<bool>(false);

  bool _isInitialized = false;
  bool _isLockEnabled = false;
  AppLockType _lockType = AppLockType.pin;
  bool _isBiometricEnabled = false;
  bool _isBiometricAvailable = false;
  int _autoLockDurationSeconds = 300; // default 5 minutes
  bool _isPrivacyScreenEnabled = false;

  String? _verifySalt;
  String? _verifyHash;

  int _failedAttempts = 0;
  DateTime? _lockoutUntil;
  DateTime? _lastBackgroundedTime;

  bool get isInitialized => _isInitialized;
  bool get isLockEnabled => _isLockEnabled;
  AppLockType get lockType => _lockType;
  bool get isBiometricEnabled => _isBiometricEnabled;
  bool get isBiometricAvailable => _isBiometricAvailable;
  int get autoLockDurationSeconds => _autoLockDurationSeconds;
  bool get isPrivacyScreenEnabled => _isPrivacyScreenEnabled;

  bool get isLockedOut =>
      _lockoutUntil != null && DateTime.now().isBefore(_lockoutUntil!);

  int get remainingLockoutSeconds {
    if (_lockoutUntil == null) return 0;
    final diff = _lockoutUntil!.difference(DateTime.now()).inSeconds;
    return max(0, diff);
  }

  static const int _pbkdf2Iterations = 600000;

  static String _computePbkdf2Hash(String secret, Uint8List salt, int iterations) {
    final keyBytes = SecureStorageService.pbkdf2HmacSha256(
      Uint8List.fromList(utf8.encode(secret)),
      salt,
      iterations: iterations,
      keyLength: 32,
    );
    return base64Encode(keyBytes);
  }

  Future<String> _hashSecret(String secret, Uint8List salt) async {
    if (kIsWeb) {
      return _computePbkdf2Hash(secret, salt, _pbkdf2Iterations);
    }
    return Isolate.run(() => _computePbkdf2Hash(secret, salt, _pbkdf2Iterations));
  }

  Future<void> init() async {
    if (_isInitialized) return;

    final prefs = await SharedPreferences.getInstance();
    _isLockEnabled = prefs.getBool('app_lock_enabled') ?? false;
    final typeStr = prefs.getString('app_lock_type') ?? 'pin';
    _lockType = typeStr == 'password' ? AppLockType.password : AppLockType.pin;
    _isBiometricEnabled = prefs.getBool('app_lock_biometric_enabled') ?? false;
    _autoLockDurationSeconds = prefs.getInt('app_lock_timeout_seconds') ?? 300;
    _isPrivacyScreenEnabled = prefs.getBool('app_lock_privacy_screen') ?? false;
    _verifySalt = prefs.getString('app_lock_verify_salt');
    _verifyHash = prefs.getString('app_lock_verify_hash');

    // Check biometric capability
    if (!kIsWeb) {
      try {
        final canCheck = await _localAuth.canCheckBiometrics;
        final isSupported = await _localAuth.isDeviceSupported();
        _isBiometricAvailable = canCheck || isSupported;
      } catch (e) {
        debugPrint('AppLockService biometric check error: $e');
        _isBiometricAvailable = false;
      }
    }

    if (_isPrivacyScreenEnabled) {
      await _applyPrivacyScreen(true);
    }

    if (_isLockEnabled && _verifyHash != null && _verifySalt != null) {
      isCurrentlyLocked.value = true;
    } else {
      isCurrentlyLocked.value = false;
    }

    _isInitialized = true;
    notifyListeners();
  }

  static const MethodChannel _securityChannel =
      MethodChannel('com.readingtracker.mobile/window_security');

  Future<void> _applyPrivacyScreen(bool enable) async {
    if (kIsWeb) return;
    if (Platform.isAndroid) {
      try {
        await _securityChannel.invokeMethod('setSecure', {'enable': enable});
      } catch (e) {
        debugPrint('AppLockService privacy screen error: $e');
      }
    }
  }

  Future<void> setPrivacyScreen(bool enable) async {
    _isPrivacyScreenEnabled = enable;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('app_lock_privacy_screen', enable);
    await _applyPrivacyScreen(enable);
    notifyListeners();
  }

  void handleAppLifecycleState(AppLifecycleState state) {
    if (!_isLockEnabled) return;

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      _lastBackgroundedTime = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      if (!isCurrentlyLocked.value && _lastBackgroundedTime != null) {
        final elapsedSeconds =
            DateTime.now().difference(_lastBackgroundedTime!).inSeconds;

        if (_autoLockDurationSeconds == 0) {
          // Instant
          isCurrentlyLocked.value = true;
        } else if (_autoLockDurationSeconds > 0 &&
            elapsedSeconds >= _autoLockDurationSeconds) {
          isCurrentlyLocked.value = true;
        }
      }
      _lastBackgroundedTime = null;
    }
  }

  Future<bool> verifySecret(String secret) async {
    if (isLockedOut) return false;
    if (_verifySalt == null || _verifyHash == null) return true;

    try {
      final saltBytes = base64Decode(_verifySalt!);
      final computedHash = await _hashSecret(secret, saltBytes);

      if (computedHash == _verifyHash) {
        _failedAttempts = 0;
        _lockoutUntil = null;
        SecureStorageService.instance.setMasterKey(secret);
        isCurrentlyLocked.value = false;
        notifyListeners();
        return true;
      } else {
        _failedAttempts++;
        if (_failedAttempts >= 3) {
          _lockoutUntil = DateTime.now().add(const Duration(seconds: 30));
        }
        notifyListeners();
        return false;
      }
    } catch (e) {
      debugPrint('AppLockService verify error: $e');
      return false;
    }
  }

  Future<bool> authenticateBiometric() async {
    if (!_isBiometricEnabled || !_isBiometricAvailable || isLockedOut) {
      return false;
    }

    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to unlock Paperback Reader',
        biometricOnly: true,
        persistAcrossBackgrounding: true,
        sensitiveTransaction: false,
      );

      if (authenticated) {
        _failedAttempts = 0;
        _lockoutUntil = null;
        isCurrentlyLocked.value = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('AppLockService biometric auth error: $e');
    }
    return false;
  }

  Future<void> setupLock({
    required String secret,
    required AppLockType type,
    required int timeoutSeconds,
    required bool enableBiometric,
  }) async {
    final saltBytes = SecureStorageService.generateRandomBytes(32);
    final saltStr = base64Encode(saltBytes);
    final hashStr = await _hashSecret(secret, saltBytes);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('app_lock_enabled', true);
    await prefs.setString('app_lock_type', type == AppLockType.password ? 'password' : 'pin');
    await prefs.setBool('app_lock_biometric_enabled', enableBiometric);
    await prefs.setInt('app_lock_timeout_seconds', timeoutSeconds);
    await prefs.setString('app_lock_verify_salt', saltStr);
    await prefs.setString('app_lock_verify_hash', hashStr);

    _isLockEnabled = true;
    _lockType = type;
    _isBiometricEnabled = enableBiometric;
    _autoLockDurationSeconds = timeoutSeconds;
    _verifySalt = saltStr;
    _verifyHash = hashStr;
    _failedAttempts = 0;
    _lockoutUntil = null;

    SecureStorageService.instance.setMasterKey(secret);
    isCurrentlyLocked.value = false;
    notifyListeners();
  }

  Future<void> updateTimeout(int timeoutSeconds) async {
    _autoLockDurationSeconds = timeoutSeconds;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('app_lock_timeout_seconds', timeoutSeconds);
    notifyListeners();
  }

  Future<void> updateBiometric(bool enable) async {
    _isBiometricEnabled = enable;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('app_lock_biometric_enabled', enable);
    notifyListeners();
  }

  Future<void> disableLock() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('app_lock_enabled', false);
    await prefs.remove('app_lock_type');
    await prefs.remove('app_lock_biometric_enabled');
    await prefs.remove('app_lock_verify_salt');
    await prefs.remove('app_lock_verify_hash');

    _isLockEnabled = false;
    _verifySalt = null;
    _verifyHash = null;
    _failedAttempts = 0;
    _lockoutUntil = null;
    isCurrentlyLocked.value = false;
    SecureStorageService.instance.clearMasterKey();
    notifyListeners();
  }

  void lockNow() {
    if (_isLockEnabled) {
      isCurrentlyLocked.value = true;
    }
  }
}
