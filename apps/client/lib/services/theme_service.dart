import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

enum AppDisplayMode {
  edgeToEdge, // New (Seamless transparent status bar)
  classic, // Old (Standard status bar)
  immersive, // Fullscreen (Hidden status bar)
}

class ThemeService extends ChangeNotifier {
  static final ThemeService instance = ThemeService._init();

  ThemeService._init();

  static const String _keyThemeMode = 'app_theme_mode';
  static const String _keyLightVariant = 'app_theme_light_variant';
  static const String _keyDarkVariant = 'app_theme_dark_variant';
  static const String _keyDisplayMode = 'app_display_mode';
  static const String _keyStickyStatusFilter = 'app_sticky_status_filter';
  static const String _keyUseDynamicColor = 'app_use_dynamic_color';

  ThemeMode _themeMode = ThemeMode.system;
  AppThemeVariant _lightVariant = AppThemeVariant.classicPaperback;
  AppThemeVariant _darkVariant = AppThemeVariant.charcoalLedger;
  AppDisplayMode _displayMode = AppDisplayMode.edgeToEdge;
  bool _stickyStatusFilter = false;
  bool _useDynamicColor = false;
  ColorScheme? _lightDynamic;
  ColorScheme? _darkDynamic;

  ThemeMode get themeMode => _themeMode;
  AppThemeVariant get lightVariant => _lightVariant;
  AppThemeVariant get darkVariant => _darkVariant;
  AppDisplayMode get displayMode => _displayMode;
  bool get stickyStatusFilter => _stickyStatusFilter;
  bool get useDynamicColor => _useDynamicColor;
  bool get isDynamicColorAvailable => _lightDynamic != null || _darkDynamic != null;

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

    final savedDisplay = prefs.getString(_keyDisplayMode);
    if (savedDisplay != null) {
      _displayMode = AppDisplayMode.values.firstWhere(
        (v) => v.name == savedDisplay,
        orElse: () => AppDisplayMode.edgeToEdge,
      );
    }
    _applyDisplayMode();

    _stickyStatusFilter = prefs.getBool(_keyStickyStatusFilter) ?? false;
    _useDynamicColor = prefs.getBool(_keyUseDynamicColor) ?? false;

    notifyListeners();
  }

  Future<void> setUseDynamicColor(bool val) async {
    if (_useDynamicColor == val) return;
    _useDynamicColor = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyUseDynamicColor, val);
  }

  void _applyDisplayMode() {
    switch (_displayMode) {
      case AppDisplayMode.edgeToEdge:
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
        break;
      case AppDisplayMode.classic:
        SystemChrome.setEnabledSystemUIMode(
          SystemUiMode.manual,
          overlays: const [SystemUiOverlay.top, SystemUiOverlay.bottom],
        );
        break;
      case AppDisplayMode.immersive:
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        break;
    }
  }

  Future<void> setStickyStatusFilter(bool val) async {
    if (_stickyStatusFilter == val) return;
    _stickyStatusFilter = val;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyStickyStatusFilter, val);
  }

  Future<void> setDisplayMode(AppDisplayMode mode) async {
    if (_displayMode == mode) return;
    _displayMode = mode;
    _applyDisplayMode();
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDisplayMode, mode.name);
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
}
