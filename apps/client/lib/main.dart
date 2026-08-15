import 'package:flutter/material.dart';
import 'screens/main_navigation_screen.dart';
import 'services/sync/sync_manager.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SyncManager.instance.init();
  runApp(const ReadingTrackerApp());
}

class ReadingTrackerApp extends StatefulWidget {
  const ReadingTrackerApp({super.key});

  @override
  State<ReadingTrackerApp> createState() => _ReadingTrackerAppState();
}

class _ReadingTrackerAppState extends State<ReadingTrackerApp> {
  ThemeMode _themeMode = ThemeMode.light;

  void _toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Paperback Reader',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: _themeMode,
      home: MainNavigationScreen(
        onThemeToggle: _toggleTheme,
        isDarkMode: _themeMode == ThemeMode.dark,
      ),
    );
  }
}
