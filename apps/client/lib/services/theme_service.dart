import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

class ThemeService extends ChangeNotifier {
  static final ThemeService instance = ThemeService._init();

  ThemeService._init();

  static const String _keyThemeMode = 'app_theme_mode';
  static const String _keyLightVariant = 'app_theme_light_variant';
  static const String _keyDarkVariant = 'app_theme_dark_variant';

  ThemeMode _themeMode = ThemeMode.system;
  AppThemeVariant _lightVariant = AppThemeVariant.classicPaperback;
  AppThemeVariant _darkVariant = AppThemeVariant.charcoalLedger;

  ThemeMode get themeMode => _themeMode;
  AppThemeVariant get lightVariant => _lightVariant;
  AppThemeVariant get darkVariant => _darkVariant;

  ThemeData get currentLightTheme => AppTheme.buildTheme(_lightVariant);
  ThemeData get currentDarkTheme => AppTheme.buildTheme(_darkVariant);

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

    notifyListeners();
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
