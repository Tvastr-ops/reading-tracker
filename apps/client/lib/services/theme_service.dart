import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:window_manager/window_manager.dart';
import '../theme/app_theme.dart';

class ThemeService extends ChangeNotifier {
  static final ThemeService instance = ThemeService._init();

  ThemeService._init();

  static const String _keyThemeMode = 'app_theme_mode';
  static const String _keyLightVariant = 'app_theme_light_variant';
  static const String _keyDarkVariant = 'app_theme_dark_variant';
  static const String _keyStickyStatusFilter = 'app_sticky_status_filter';
  static const String _keyUseDynamicColor = 'app_use_dynamic_color';
  static const String _keyDefaultViewMode = 'app_default_view_mode';
  static const String _keyShowReadingCarousel = 'app_show_reading_carousel';
  static const String _keyCompactMode = 'app_compact_mode';
  static const String _keyHighRefreshRate = 'app_high_refresh_rate';
  static const String _keyEnablePaperTexture = 'app_enable_paper_texture';
  static const String _keyPatternIntensity = 'app_pattern_intensity';
  static const String _keyPromptNoteOnQuickLog = 'app_prompt_note_on_quick_log';
  static const String _keyAlwaysShowAllShelves = 'app_always_show_all_shelves';
  static const String _keyHapticFeedback = 'app_haptic_feedback';

  ThemeMode _themeMode = ThemeMode.system;
  AppThemeVariant _lightVariant = AppThemeVariant.classicPaperback;
  AppThemeVariant _darkVariant = AppThemeVariant.charcoalLedger;
  bool _stickyStatusFilter = false;
  bool _useDynamicColor = false;
  String _defaultViewMode = 'cards'; // 'cards', 'covers', 'table'
  bool _showReadingCarousel = true;
  bool _compactMode = false;
  bool _highRefreshRate = true;
  bool _enablePaperTexture = true;
  double _patternIntensity = 1.0;
  bool _promptNoteOnQuickLog = false;
  bool _alwaysShowAllShelves = false;
  bool _hapticFeedback = true;
  bool _isFullscreen = false;

  ColorScheme? _lightDynamic;
  ColorScheme? _darkDynamic;

  ThemeMode get themeMode => _themeMode;
  AppThemeVariant get lightVariant => _lightVariant;
  AppThemeVariant get darkVariant => _darkVariant;
  bool get stickyStatusFilter => _stickyStatusFilter;
  bool get useDynamicColor => _useDynamicColor;
  bool get isDynamicColorAvailable => _lightDynamic != null || _darkDynamic != null;

  String get defaultViewMode => _defaultViewMode;
  bool get showReadingCarousel => _showReadingCarousel;
  bool get compactMode => _compactMode;
  bool get highRefreshRate => _highRefreshRate;
  bool get enablePaperTexture => _enablePaperTexture;
  double get patternIntensity => _patternIntensity;
  bool get promptNoteOnQuickLog => _promptNoteOnQuickLog;
  bool get alwaysShowAllShelves => _alwaysShowAllShelves;
  bool get hapticFeedback => _hapticFeedback;
  bool get isFullscreen => _isFullscreen;

  ThemeData get currentLightTheme {
    if (_useDynamicColor && _lightDynamic != null) {
      return AppTheme.buildDynamicTheme(_lightDynamic!, isDark: false);
    }
    return AppTheme.buildTheme(_lightVariant);
  }

  ThemeData get currentDarkTheme {
    if (_useDynamicColor && _darkDynamic != null) {
      return AppTheme.buildDynamicTheme(_darkDynamic!, isDark: true);
    }
    return AppTheme.buildTheme(_darkVariant);
  }

  void updateDynamicColorSchemes(ColorScheme? light, ColorScheme? dark) {
    if (_lightDynamic != light || _darkDynamic != dark) {
      _lightDynamic = light;
      _darkDynamic = dark;
      notifyListeners();
    }
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    final savedMode = prefs.getString(_keyThemeMode);
    if (savedMode == 'light') {
      _themeMode = ThemeMode.light;
    } else if (savedMode == 'dark') {
      _themeMode = ThemeMode.dark;
    } else {
      _themeMode = ThemeMode.system;
    }

    final savedLight = prefs.getString(_keyLightVariant);
    if (savedLight != null) {
      _lightVariant = AppThemeVariant.values.firstWhere(
        (v) => v.name == savedLight && !v.isDark,
        orElse: () => AppThemeVariant.classicPaperback,
      );
    }

    final savedDark = prefs.getString(_keyDarkVariant);
    if (savedDark != null) {
      _darkVariant = AppThemeVariant.values.firstWhere(
        (v) => v.name == savedDark && v.isDark,
        orElse: () => AppThemeVariant.charcoalLedger,
      );
    }

    _stickyStatusFilter = prefs.getBool(_keyStickyStatusFilter) ?? false;
    _useDynamicColor = prefs.getBool(_keyUseDynamicColor) ?? false;
    _defaultViewMode = prefs.getString(_keyDefaultViewMode) ?? 'cards';
    _showReadingCarousel = prefs.getBool(_keyShowReadingCarousel) ?? true;
    _compactMode = prefs.getBool(_keyCompactMode) ?? false;
    _highRefreshRate = prefs.getBool(_keyHighRefreshRate) ?? true;
    _enablePaperTexture = prefs.getBool(_keyEnablePaperTexture) ?? true;
    _patternIntensity = prefs.getDouble(_keyPatternIntensity) ?? 1.0;
    _promptNoteOnQuickLog = prefs.getBool(_keyPromptNoteOnQuickLog) ?? false;
    _alwaysShowAllShelves = prefs.getBool(_keyAlwaysShowAllShelves) ?? false;
    _hapticFeedback = prefs.getBool(_keyHapticFeedback) ?? true;

    // Apply native edge-to-edge transparent system UI
    if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }

    // Apply high refresh rate on Android if enabled
    if (_highRefreshRate) {
      await _applyHighRefreshRate();
    }

    notifyListeners();
  }

  Future<void> _applyHighRefreshRate() async {
    if (!kIsWeb && Platform.isAndroid) {
      try {
        await FlutterDisplayMode.setHighRefreshRate();
      } catch (_) {
        // Ignored on unsupported devices/emulators
      }
    }
  }

  Future<void> setHighRefreshRate(bool val) async {
    if (_highRefreshRate == val) return;
    _highRefreshRate = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyHighRefreshRate, val);

    if (val) {
      await _applyHighRefreshRate();
    } else if (!kIsWeb && Platform.isAndroid) {
      try {
        await FlutterDisplayMode.setLowRefreshRate();
      } catch (_) {}
    }
  }

  Future<void> setDefaultViewMode(String mode) async {
    if (_defaultViewMode == mode) return;
    _defaultViewMode = mode;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDefaultViewMode, mode);
  }

  Future<void> setShowReadingCarousel(bool val) async {
    if (_showReadingCarousel == val) return;
    _showReadingCarousel = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyShowReadingCarousel, val);
  }

  Future<void> setCompactMode(bool val) async {
    if (_compactMode == val) return;
    _compactMode = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyCompactMode, val);
  }

  Future<void> toggleFullscreen() async {
    _isFullscreen = !_isFullscreen;
    notifyListeners();

    if (!kIsWeb) {
      if (Platform.isAndroid || Platform.isIOS) {
        if (_isFullscreen) {
          SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        } else {
          SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
        }
      } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
        try {
          if (_isFullscreen) {
            final isMax = await windowManager.isMaximized();
            if (isMax) {
              await windowManager.unmaximize();
            }
            await windowManager.setFullScreen(true);
          } else {
            await windowManager.setFullScreen(false);
          }
        } catch (_) {}
      }
    }
  }

  Future<void> setHapticFeedback(bool val) async {
    if (_hapticFeedback == val) return;
    _hapticFeedback = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyHapticFeedback, val);
  }

  Future<void> setUseDynamicColor(bool val) async {
    if (_useDynamicColor == val) return;
    _useDynamicColor = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyUseDynamicColor, val);
  }

  Future<void> setStickyStatusFilter(bool val) async {
    if (_stickyStatusFilter == val) return;
    _stickyStatusFilter = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyStickyStatusFilter, val);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    final modeStr = mode == ThemeMode.light
        ? 'light'
        : mode == ThemeMode.dark
            ? 'dark'
            : 'system';
    await prefs.setString(_keyThemeMode, modeStr);
  }

  Future<void> setLightVariant(AppThemeVariant variant) async {
    if (variant.isDark || _lightVariant == variant) return;
    _lightVariant = variant;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyLightVariant, variant.name);
  }

  Future<void> setDarkVariant(AppThemeVariant variant) async {
    if (!variant.isDark || _darkVariant == variant) return;
    _darkVariant = variant;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDarkVariant, variant.name);
  }

  Future<void> setEnablePaperTexture(bool val) async {
    if (_enablePaperTexture == val) return;
    _enablePaperTexture = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyEnablePaperTexture, val);
  }

  Future<void> setPatternIntensity(double val) async {
    final clamped = val.clamp(0.2, 2.0);
    if ((_patternIntensity - clamped).abs() < 0.01) return;
    _patternIntensity = clamped;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_keyPatternIntensity, clamped);
  }

  Future<void> setPromptNoteOnQuickLog(bool val) async {
    if (_promptNoteOnQuickLog == val) return;
    _promptNoteOnQuickLog = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyPromptNoteOnQuickLog, val);
  }

  Future<void> setAlwaysShowAllShelves(bool val) async {
    if (_alwaysShowAllShelves == val) return;
    _alwaysShowAllShelves = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyAlwaysShowAllShelves, val);
  }
}

