import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/sync/sync_manager.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
import '../widgets/paper_texture_canvas.dart';
import 'library_screen.dart';
import 'settings_screen.dart';
import 'stats_screen.dart';
import 'timeline_screen.dart';

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

class _MainNavigationScreenState extends State<MainNavigationScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  final GlobalKey<LibraryScreenState> _libraryKey = GlobalKey<LibraryScreenState>();
  late Widget _libraryScreen;
  late Widget _statsScreen;
  late Widget _timelineScreen;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ThemeService.instance.addListener(_onThemeServiceChanged);

    _libraryScreen = LibraryScreen(
      key: _libraryKey,
      onNavigateToSync: () => setState(() => _currentIndex = 3),
    );
    _statsScreen = const StatsScreen();
    _timelineScreen = const TimelineScreen();

    // Auto-sync on app boot if enabled
    if (SyncManager.instance.autoSync) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SyncManager.instance.syncNow();
      });
    }
  }

  void _onThemeServiceChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    ThemeService.instance.removeListener(_onThemeServiceChanged);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && SyncManager.instance.autoSync) {
      SyncManager.instance.syncNow();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final canvasBg = details?.canvasColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);

    final pages = [
      _libraryScreen,
      _statsScreen,
      _timelineScreen,
      SettingsScreen(
        onThemeToggle: widget.onThemeToggle,
        isDarkMode: widget.isDarkMode,
      ),
    ];

    final activeVariant = isDark ? ThemeService.instance.darkVariant : ThemeService.instance.lightVariant;
    final patternType = activeVariant.defaultPattern;
    final enableTexture = ThemeService.instance.enablePaperTexture;

    return PaperTextureCanvas(
      patternType: patternType,
      isDark: isDark,
      enabled: enableTexture,
      baseCanvasColor: canvasBg,
      child: CallbackShortcuts(
        bindings: {
          const SingleActivator(LogicalKeyboardKey.f11): () => ThemeService.instance.toggleFullscreen(),
          const SingleActivator(LogicalKeyboardKey.f1): () => _openKeyboardShortcutsDialog(context),
          const SingleActivator(LogicalKeyboardKey.slash, shift: true): () => _openKeyboardShortcutsDialog(context),
          const SingleActivator(LogicalKeyboardKey.digit1): () => setState(() => _currentIndex = 0),
          const SingleActivator(LogicalKeyboardKey.digit2): () => setState(() => _currentIndex = 1),
          const SingleActivator(LogicalKeyboardKey.digit3): () => setState(() => _currentIndex = 2),
          const SingleActivator(LogicalKeyboardKey.digit4): () => setState(() => _currentIndex = 3),
        },
        child: Focus(
          autofocus: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isDesktopOrTablet = constraints.maxWidth >= 800;

        if (isDesktopOrTablet) {
          // Desktop / Widescreen Layout: Left Navigation Rail + Expanded Page Stack
          return Scaffold(
            body: Row(
              children: [
                // Left Neo-Brutalist Navigation Rail
                Container(
                  width: 210,
                  decoration: BoxDecoration(
                    color: canvasBg,
                    border: Border(
                      right: BorderSide(
                        color: borderColor,
                        width: AppTheme.borderHeavy,
                      ),
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Sidebar Brand Header
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: accentColor,
                                border: Border.all(color: borderColor, width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: borderColor,
                                    offset: AppTheme.shadowOffsetSm,
                                    blurRadius: 0,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.menu_book_rounded,
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'PAPERBACK',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                  ),
                                ),
                                Text(
                                  'READER LEDGER',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.0,
                                    color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Navigation Items List
                      _buildRailNavItem(
                        index: 0,
                        label: 'LIBRARY',
                        icon: Icons.grid_view_rounded,
                        isDark: isDark,
                        borderColor: borderColor,
                        accentColor: accentColor,
                        canvasBg: canvasBg,
                      ),
                      const SizedBox(height: 8),
                      _buildRailNavItem(
                        index: 1,
                        label: 'ANALYTICS',
                        icon: Icons.bar_chart_rounded,
                        isDark: isDark,
                        borderColor: borderColor,
                        accentColor: accentColor,
                        canvasBg: canvasBg,
                      ),
                      const SizedBox(height: 8),
                      _buildRailNavItem(
                        index: 2,
                        label: 'JOURNEY',
                        icon: Icons.auto_stories_rounded,
                        isDark: isDark,
                        borderColor: borderColor,
                        accentColor: accentColor,
                        canvasBg: canvasBg,
                      ),
                      const SizedBox(height: 8),
                      _buildRailNavItem(
                        index: 3,
                        label: 'SETTINGS',
                        icon: Icons.tune_rounded,
                        isDark: isDark,
                        borderColor: borderColor,
                        accentColor: accentColor,
                        canvasBg: canvasBg,
                      ),

                      const Spacer(),

                      // Quick Add Book Button at Sidebar Bottom
                      GestureDetector(
                        onTap: () {
                          // Navigate to library if not already there
                          if (_currentIndex != 0) {
                            setState(() => _currentIndex = 0);
                          }
                          _libraryKey.currentState?.openAddBookDialog();
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          decoration: BoxDecoration(
                            color: accentColor,
                            border: Border.all(color: borderColor, width: 1.5),
                            boxShadow: [
                              BoxShadow(
                                color: borderColor,
                                offset: AppTheme.shadowOffsetSm,
                                blurRadius: 0,
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_rounded, size: 18, color: Colors.white),
                              SizedBox(width: 6),
                              Text(
                                'ADD BOOK',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Keyboard Shortcuts Button
                      GestureDetector(
                        onTap: () => _openKeyboardShortcutsDialog(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                            border: Border.all(color: borderColor, width: 1.0),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text('⌨️', style: TextStyle(fontSize: 12)),
                              const SizedBox(width: 6),
                              Text(
                                'SHORTCUTS (?)',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.3,
                                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Main Content View
                Expanded(
                  child: IndexedStack(
                    index: _currentIndex,
                    children: pages,
                  ),
                ),
              ],
            ),
          );
        }

        // Mobile Layout (< 800px): Bottom Navigation Bar
        return Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: pages,
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: canvasBg,
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
                _buildBottomNavItem(
                  index: 0,
                  label: 'LIBRARY',
                  icon: Icons.grid_view_rounded,
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  canvasBg: canvasBg,
                ),
                _buildBottomNavItem(
                  index: 1,
                  label: 'STATS',
                  icon: Icons.bar_chart_rounded,
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  canvasBg: canvasBg,
                ),
                _buildBottomNavItem(
                  index: 2,
                  label: 'JOURNEY',
                  icon: Icons.auto_stories_rounded,
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  canvasBg: canvasBg,
                ),
                _buildBottomNavItem(
                  index: 3,
                  label: 'SETTINGS',
                  icon: Icons.tune_rounded,
                  isDark: isDark,
                  borderColor: borderColor,
                  accentColor: accentColor,
                  canvasBg: canvasBg,
                ),
              ],
            ),
          ),
        );
      },
    ),
  ),
),
);
  }

  Widget _buildRailNavItem({
    required int index,
    required String label,
    required IconData icon,
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required Color canvasBg,
  }) {
    final isSelected = _currentIndex == index;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () => setState(() => _currentIndex = index),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: isSelected ? accentColor : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
            border: Border.all(color: borderColor, width: isSelected ? 2.0 : 1.5),
            boxShadow: [
              BoxShadow(
                color: borderColor,
                offset: isSelected ? AppTheme.shadowOffsetSm : const Offset(1.5, 1.5),
                blurRadius: 0,
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 19,
                color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavItem({
    required int index,
    required String label,
    required IconData icon,
    required bool isDark,
    required Color borderColor,
    required Color accentColor,
    required Color canvasBg,
  }) {
    final isSelected = _currentIndex == index;

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? accentColor : canvasBg,
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
              color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
                color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openKeyboardShortcutsDialog(BuildContext context) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = details?.cardColor ?? (isDark ? AppColors.darkSurface : AppColors.paperBg);
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final primaryColor = Theme.of(context).colorScheme.primary;

    final shortcuts = [
      {'key': '1 – 4', 'desc': 'Switch Navigation Tabs (Library, Stats, Timeline, Settings)'},
      {'key': '/', 'desc': 'Focus Search Bar in Library'},
      {'key': 'F11', 'desc': 'Toggle Fullscreen Mode'},
      {'key': '? / F1', 'desc': 'Open Keyboard Shortcuts Help'},
      {'key': 'Esc', 'desc': 'Close Modal / Cancel Search / Deselect Book'},
    ];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        backgroundColor: dialogBg,
        title: Row(
          children: [
            Icon(Icons.keyboard_rounded, size: 20, color: primaryColor),
            const SizedBox(width: 8),
            Text(
              'KEYBOARD SHORTCUTS',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: inkColor),
            ),
          ],
        ),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: shortcuts.map((s) {
              return Container(
                margin: const EdgeInsets.symmetric(vertical: 4),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                  border: Border.all(color: borderColor.withValues(alpha: 0.3), width: 1.0),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.15),
                        border: Border.all(color: primaryColor, width: 1.0),
                      ),
                      child: Text(
                        s['key']!,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: primaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        s['desc']!,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: inkColor,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('CLOSE', style: TextStyle(color: inkColor, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}
