import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'library_screen.dart';
import 'settings_screen.dart';
import 'stats_screen.dart';
import 'trash_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final VoidCallback onThemeToggle;
  final bool isDarkMode;

  const MainNavigationScreen({
    super.key,
    required this.onThemeToggle,
    required this.isDarkMode,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  final GlobalKey _libraryKey = GlobalKey();
  late Widget _libraryScreen;
  late Widget _statsScreen;
  late Widget _trashScreen;

  @override
  void initState() {
    super.initState();
    _libraryScreen = LibraryScreen(
      key: _libraryKey,
      onNavigateToSync: () => setState(() => _currentIndex = 3),
    );
    _statsScreen = const StatsScreen();
    _trashScreen = TrashScreen(onDataChanged: _onDataChanged);
  }

  void _onDataChanged() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    final pages = [
      _libraryScreen,
      _statsScreen,
      _trashScreen,
      SettingsScreen(
        onThemeToggle: widget.onThemeToggle,
        isDarkMode: widget.isDarkMode,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.paperBg,
          border: Border(
            top: BorderSide(
              color: borderColor,
              width: AppTheme.borderHeavy,
            ),
          ),
        ),
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(
              index: 0,
              label: 'LIBRARY',
              icon: Icons.grid_view_rounded,
            ),
            _buildNavItem(
              index: 1,
              label: 'STATS',
              icon: Icons.bar_chart_rounded,
            ),
            _buildNavItem(
              index: 2,
              label: 'TRASH',
              icon: Icons.delete_outline_rounded,
            ),
            _buildNavItem(
              index: 3,
              label: 'SYNC',
              icon: Icons.cloud_sync_rounded,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required String label,
    required IconData icon,
  }) {
    final isSelected = _currentIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryRed
              : (isDark ? AppColors.darkSurface : AppColors.paperBg),
          border: isSelected
              ? Border.all(color: borderColor, width: 1.5)
              : Border.all(color: Colors.transparent, width: 1.5),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: borderColor,
                    offset: AppTheme.shadowOffsetSm,
                    blurRadius: 0,
                  ),
                ]
              : [],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected
                  ? Colors.white
                  : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
                color: isSelected
                  ? Colors.white
                  : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
