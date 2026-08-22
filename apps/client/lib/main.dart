import 'dart:io';
import 'dart:ui' show PointerDeviceKind;
import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import 'screens/main_navigation_screen.dart';
import 'services/sync/sync_manager.dart';
import 'services/theme_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
    await windowManager.ensureInitialized();
  }
  await ThemeService.instance.init();
  await SyncManager.instance.init();
  runApp(const ReadingTrackerApp());
}

ColorScheme? _toFlutterScheme(dynamic s, Brightness brightness) {
  if (s == null) return null;
  return ColorScheme(
    brightness: brightness,
    primary: Color((s.primary as dynamic).toARGB32()),
    onPrimary: Color((s.onPrimary as dynamic).toARGB32()),
    primaryContainer: Color((s.primaryContainer as dynamic).toARGB32()),
    onPrimaryContainer: Color((s.onPrimaryContainer as dynamic).toARGB32()),
    secondary: Color((s.secondary as dynamic).toARGB32()),
    onSecondary: Color((s.onSecondary as dynamic).toARGB32()),
    secondaryContainer: Color((s.secondaryContainer as dynamic).toARGB32()),
    onSecondaryContainer: Color((s.onSecondaryContainer as dynamic).toARGB32()),
    tertiary: Color((s.tertiary as dynamic).toARGB32()),
    onTertiary: Color((s.onTertiary as dynamic).toARGB32()),
    tertiaryContainer: Color((s.tertiaryContainer as dynamic).toARGB32()),
    onTertiaryContainer: Color((s.onTertiaryContainer as dynamic).toARGB32()),
    error: Color((s.error as dynamic).toARGB32()),
    onError: Color((s.onError as dynamic).toARGB32()),
    errorContainer: Color((s.errorContainer as dynamic).toARGB32()),
    onErrorContainer: Color((s.onErrorContainer as dynamic).toARGB32()),
    surface: Color((s.surface as dynamic).toARGB32()),
    onSurface: Color((s.onSurface as dynamic).toARGB32()),
    surfaceContainerLowest: Color((s.surfaceContainerLowest as dynamic).toARGB32()),
    surfaceContainerLow: Color((s.surfaceContainerLow as dynamic).toARGB32()),
    surfaceContainer: Color((s.surfaceContainer as dynamic).toARGB32()),
    surfaceContainerHigh: Color((s.surfaceContainerHigh as dynamic).toARGB32()),
    surfaceContainerHighest: Color((s.surfaceContainerHighest as dynamic).toARGB32()),
    outline: Color((s.outline as dynamic).toARGB32()),
    outlineVariant: Color((s.outlineVariant as dynamic).toARGB32()),
    shadow: Color((s.shadow as dynamic).toARGB32()),
    scrim: Color((s.scrim as dynamic).toARGB32()),
    inverseSurface: Color((s.inverseSurface as dynamic).toARGB32()),
    onInverseSurface: Color((s.onInverseSurface as dynamic).toARGB32()),
    inversePrimary: Color((s.inversePrimary as dynamic).toARGB32()),
  );
}

class ReadingTrackerApp extends StatelessWidget {
  const ReadingTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return DynamicColorBuilder(
      builder: (lightDynamic, darkDynamic) {
        final light = _toFlutterScheme(lightDynamic, Brightness.light);
        final dark = _toFlutterScheme(darkDynamic, Brightness.dark);
        ThemeService.instance.updateDynamicColorSchemes(light, dark);

        return ListenableBuilder(
          listenable: ThemeService.instance,
          builder: (context, _) {
            final themeService = ThemeService.instance;
            return MaterialApp(
              title: 'Paperback Reader',
              debugShowCheckedModeBanner: false,
              theme: themeService.currentLightTheme,
              darkTheme: themeService.currentDarkTheme,
              themeMode: themeService.themeMode,
              scrollBehavior: const MaterialScrollBehavior().copyWith(
                dragDevices: {
                  PointerDeviceKind.mouse,
                  PointerDeviceKind.touch,
                  PointerDeviceKind.trackpad,
                  PointerDeviceKind.stylus,
                },
                physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              ),
              home: MainNavigationScreen(
                onThemeToggle: () {
                  final isDark = themeService.themeMode == ThemeMode.dark;
                  themeService.setThemeMode(isDark ? ThemeMode.light : ThemeMode.dark);
                },
                isDarkMode: themeService.themeMode == ThemeMode.dark,
              ),
            );
          },
        );
      },
    );
  }
}
