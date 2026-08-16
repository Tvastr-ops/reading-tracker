import 'package:flutter/material.dart';
import 'screens/main_navigation_screen.dart';
import 'services/sync/sync_manager.dart';
import 'services/theme_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeService.instance.init();
  await SyncManager.instance.init();
  runApp(const ReadingTrackerApp());
}

class ReadingTrackerApp extends StatelessWidget {
  const ReadingTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
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
  }
}
