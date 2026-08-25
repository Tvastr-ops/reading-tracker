import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/sync/generic_rest_sync_provider.dart';
import '../services/sync/supabase_sync_provider.dart';
import '../services/sync/sync_manager.dart';
import '../services/sync/sync_provider.dart';
import '../services/theme_service.dart';
import '../services/update_service.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';
import 'trash_screen.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback? onThemeToggle;
  final bool? isDarkMode;

  const SettingsScreen({
    super.key,
    this.onThemeToggle,
    this.isDarkMode,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final SyncManager _syncManager = SyncManager.instance;
  final ThemeService _themeService = ThemeService.instance;
  final UpdateService _updateService = UpdateService.instance;

  late TextEditingController _urlController;
  late TextEditingController _apiKeyController;
  late SyncBackendType _selectedType;
  late bool _offlineMode;
  late bool _autoSync;
  bool _isConfigExpanded = false;
  bool _showApiKey = false;
  bool _isTestingConnection = false;

  UpdateInfo? _updateInfo;
  bool _isCheckingUpdate = false;
  String? _updateError;
  String _appVersion = 'v1.7.0';

  // Persisted Collapsible section states
  static const String _keyPrefAppearance = 'settings_expanded_appearance';
  static const String _keyPrefDisplay = 'settings_expanded_display';
  static const String _keyPrefLibraryNav = 'settings_expanded_library_nav';
  static const String _keyPrefNetwork = 'settings_expanded_network';
  static const String _keyPrefData = 'settings_expanded_data';
  static const String _keyPrefAbout = 'settings_expanded_about';

  bool _isAppearanceExpanded = true;
  bool _isDisplayExpanded = true;
  bool _isLibraryNavExpanded = true;
  bool _isNetworkExpanded = true;
  bool _isDataExpanded = true;
  bool _isAboutExpanded = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: _syncManager.serverUrl);
    _apiKeyController = TextEditingController(text: _syncManager.apiKey);
    _selectedType = _syncManager.backendType;
    _offlineMode = _syncManager.offlineMode;
    _autoSync = _syncManager.autoSync;

    _syncManager.addListener(_onSyncUpdate);
    _themeService.addListener(_onThemeUpdate);
    _loadSectionPreferences();

    _updateService.getCurrentAppVersion().then((v) {
      if (mounted) {
        setState(() => _appVersion = v);
      }
    });
  }

  @override
  void dispose() {
    _syncManager.removeListener(_onSyncUpdate);
    _themeService.removeListener(_onThemeUpdate);
    _urlController.dispose();
    _apiKeyController.dispose();
    super.dispose();
  }

  void _onThemeUpdate() {
    if (mounted) setState(() {});
  }

  Future<void> _loadSectionPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _isAppearanceExpanded = prefs.getBool(_keyPrefAppearance) ?? true;
      _isDisplayExpanded = prefs.getBool(_keyPrefDisplay) ?? true;
      _isLibraryNavExpanded = prefs.getBool(_keyPrefLibraryNav) ?? true;
      _isNetworkExpanded = prefs.getBool(_keyPrefNetwork) ?? true;
      _isDataExpanded = prefs.getBool(_keyPrefData) ?? true;
      _isAboutExpanded = prefs.getBool(_keyPrefAbout) ?? false;
    });
  }

  Future<void> _toggleSection(String key, bool currentVal, ValueChanged<bool> updater) async {
    final nextVal = !currentVal;
    setState(() {
      updater(nextVal);
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, nextVal);
  }

  Future<void> _setAllSections(bool expand) async {
    setState(() {
      _isAppearanceExpanded = expand;
      _isDisplayExpanded = expand;
      _isLibraryNavExpanded = expand;
      _isNetworkExpanded = expand;
      _isDataExpanded = expand;
      _isAboutExpanded = expand;
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyPrefAppearance, expand);
    await prefs.setBool(_keyPrefDisplay, expand);
    await prefs.setBool(_keyPrefLibraryNav, expand);
    await prefs.setBool(_keyPrefNetwork, expand);
    await prefs.setBool(_keyPrefData, expand);
    await prefs.setBool(_keyPrefAbout, expand);
  }

  void _onSyncUpdate() {
    if (mounted) setState(() {});
  }

  Future<void> _saveConfig({bool collapseAfter = false}) async {
    await _syncManager.updateConfig(
      type: _selectedType,
      url: _urlController.text,
      apiKey: _apiKeyController.text,
      offlineMode: _offlineMode,
      autoSync: _autoSync,
    );

    if (collapseAfter) {
      setState(() => _isConfigExpanded = false);
    }
  }

  Future<void> _testConnection() async {
    setState(() => _isTestingConnection = true);
    final RemoteSyncProvider provider = _selectedType == SyncBackendType.supabase
        ? SupabaseSyncProvider(
            supabaseUrl: _urlController.text.trim(),
            anonKey: _apiKeyController.text.trim(),
          )
        : GenericRestSyncProvider(
            serverUrl: _urlController.text.trim(),
            apiKey: _apiKeyController.text.trim(),
          );

    final ok = await provider.testConnection();
    setState(() => _isTestingConnection = false);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Connection successful!' : 'Failed to connect to backend'),
        backgroundColor: ok ? AppColors.successGreen : Colors.red,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _openGitHub() async {
    final uri = Uri.parse('https://github.com/Tvastr-ops/reading-tracker');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildCollapsibleSectionHeader(
    String title,
    bool isExpanded,
    VoidCallback onToggle, {
    String? badgeLabel,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final inkColor = details?.inkColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final cardHigh = details?.cardHighColor ?? (isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;

    return InkWell(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Row(
                children: [
                  Flexible(
                    child: Text(
                      title,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                        color: inkColor,
                      ),
                    ),
                  ),
                  if (badgeLabel != null && !isExpanded) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: accentColor.withValues(alpha: 0.15),
                        border: Border.all(color: accentColor, width: 1),
                      ),
                      child: Text(
                        badgeLabel.toUpperCase(),
                        style: TextStyle(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                          color: accentColor,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                border: Border.all(color: borderColor, width: 1),
                color: cardHigh,
              ),
              child: Icon(
                isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                size: 16,
                color: inkColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentLight = _themeService.lightVariant;
    final currentDark = _themeService.darkVariant;
    final themeBadge = _themeService.useDynamicColor
        ? 'Material You'
        : (isDark ? currentDark.label : currentLight.label);
    final layoutBadge = _themeService.compactMode
        ? '${_themeService.defaultViewMode.toUpperCase()} • COMPACT'
        : _themeService.defaultViewMode.toUpperCase();

    final isAllExpanded = _isAppearanceExpanded &&
        _isDisplayExpanded &&
        _isLibraryNavExpanded &&
        _isNetworkExpanded &&
        _isDataExpanded &&
        _isAboutExpanded;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SETTINGS'),
        actions: [
          IconButton(
            icon: Icon(isAllExpanded ? Icons.unfold_less_rounded : Icons.unfold_more_rounded),
            tooltip: isAllExpanded ? 'Collapse All' : 'Expand All',
            onPressed: () => _setAllSections(!isAllExpanded),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWideScreen = constraints.maxWidth >= 840;

          if (isWideScreen) {
            return _buildWideLayout(isDark, themeBadge, layoutBadge);
          }

          return _buildMobileLayout(isDark, themeBadge, layoutBadge);
        },
      ),
    );
  }

  Widget _buildMobileLayout(bool isDark, String themeBadge, String layoutBadge) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        // Section 0: Appearance & Neo-Paper Themes
        _buildCollapsibleSectionHeader(
          'APPEARANCE & THEMES',
          _isAppearanceExpanded,
          () => _toggleSection(_keyPrefAppearance, _isAppearanceExpanded, (v) => _isAppearanceExpanded = v),
          badgeLabel: themeBadge,
        ),
        const SizedBox(height: 6),
        if (_isAppearanceExpanded) ...[
          _buildThemeSelector(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 1: Display & Layout Preferences
        _buildCollapsibleSectionHeader(
          'DISPLAY & LAYOUT',
          _isDisplayExpanded,
          () => _toggleSection(_keyPrefDisplay, _isDisplayExpanded, (v) => _isDisplayExpanded = v),
          badgeLabel: layoutBadge,
        ),
        const SizedBox(height: 6),
        if (_isDisplayExpanded) ...[
          _buildDisplayAndLayoutPreferences(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 2: Library & Navigation Preferences
        _buildCollapsibleSectionHeader(
          'LIBRARY PREFERENCES',
          _isLibraryNavExpanded,
          () => _toggleSection(_keyPrefLibraryNav, _isLibraryNavExpanded, (v) => _isLibraryNavExpanded = v),
          badgeLabel: _themeService.stickyStatusFilter ? 'Pinned Tabs' : 'Scroll Tabs',
        ),
        const SizedBox(height: 6),
        if (_isLibraryNavExpanded) ...[
          _buildLibraryNavPreferences(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 3: Network Preferences
        _buildCollapsibleSectionHeader(
          'NETWORK & SYNC',
          _isNetworkExpanded,
          () => _toggleSection(_keyPrefNetwork, _isNetworkExpanded, (v) => _isNetworkExpanded = v),
          badgeLabel: _offlineMode ? 'Offline' : 'Online',
        ),
        const SizedBox(height: 6),
        if (_isNetworkExpanded) ...[
          _buildNetworkPreferences(isDark),
          const SizedBox(height: 10),
          _buildBackendConfigCard(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 4: Data Management
        _buildCollapsibleSectionHeader(
          'DATA MANAGEMENT',
          _isDataExpanded,
          () => _toggleSection(_keyPrefData, _isDataExpanded, (v) => _isDataExpanded = v),
        ),
        const SizedBox(height: 6),
        if (_isDataExpanded) ...[
          _buildDataManagementCard(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 5: Manual Sync Button
        _buildManualSyncButton(),
        const SizedBox(height: 20),

        // Section 6: About & GitHub
        _buildCollapsibleSectionHeader(
          'ABOUT PAPERBACK',
          _isAboutExpanded,
          () => _toggleSection(_keyPrefAbout, _isAboutExpanded, (v) => _isAboutExpanded = v),
          badgeLabel: _appVersion,
        ),
        const SizedBox(height: 6),
        if (_isAboutExpanded) ...[
          _buildAboutCard(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildWideLayout(bool isDark, String themeBadge, String layoutBadge) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1140),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Column 1: Appearance & Library Navigation (~620px)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildCollapsibleSectionHeader(
                      'APPEARANCE & THEMES',
                      _isAppearanceExpanded,
                      () => _toggleSection(_keyPrefAppearance, _isAppearanceExpanded, (v) => _isAppearanceExpanded = v),
                      badgeLabel: themeBadge,
                    ),
                    const SizedBox(height: 6),
                    if (_isAppearanceExpanded) ...[
                      _buildThemeSelector(isDark),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 12),

                    _buildCollapsibleSectionHeader(
                      'LIBRARY PREFERENCES',
                      _isLibraryNavExpanded,
                      () => _toggleSection(_keyPrefLibraryNav, _isLibraryNavExpanded, (v) => _isLibraryNavExpanded = v),
                      badgeLabel: _themeService.stickyStatusFilter ? 'Pinned Tabs' : 'Scroll Tabs',
                    ),
                    const SizedBox(height: 6),
                    if (_isLibraryNavExpanded) ...[
                      _buildLibraryNavPreferences(isDark),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 20),

              // Column 2: Display, Network, Data & System (~650px)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildCollapsibleSectionHeader(
                      'DISPLAY & LAYOUT',
                      _isDisplayExpanded,
                      () => _toggleSection(_keyPrefDisplay, _isDisplayExpanded, (v) => _isDisplayExpanded = v),
                      badgeLabel: layoutBadge,
                    ),
                    const SizedBox(height: 6),
                    if (_isDisplayExpanded) ...[
                      _buildDisplayAndLayoutPreferences(isDark),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 12),

                    _buildCollapsibleSectionHeader(
                      'NETWORK & SYNC',
                      _isNetworkExpanded,
                      () => _toggleSection(_keyPrefNetwork, _isNetworkExpanded, (v) => _isNetworkExpanded = v),
                      badgeLabel: _offlineMode ? 'Offline' : 'Online',
                    ),
                    const SizedBox(height: 6),
                    if (_isNetworkExpanded) ...[
                      _buildNetworkPreferences(isDark),
                      const SizedBox(height: 10),
                      _buildBackendConfigCard(isDark),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 12),

                    _buildCollapsibleSectionHeader(
                      'DATA MANAGEMENT',
                      _isDataExpanded,
                      () => _toggleSection(_keyPrefData, _isDataExpanded, (v) => _isDataExpanded = v),
                    ),
                    const SizedBox(height: 6),
                    if (_isDataExpanded) ...[
                      _buildDataManagementCard(isDark),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 12),

                    _buildManualSyncButton(),
                    const SizedBox(height: 16),

                    _buildCollapsibleSectionHeader(
                      'ABOUT PAPERBACK',
                      _isAboutExpanded,
                      () => _toggleSection(_keyPrefAbout, _isAboutExpanded, (v) => _isAboutExpanded = v),
                      badgeLabel: _appVersion,
                    ),
                    const SizedBox(height: 6),
                    if (_isAboutExpanded) ...[
                      _buildAboutCard(isDark),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLibraryNavPreferences(bool isDark) {
    final sticky = _themeService.stickyStatusFilter;
    final promptNote = _themeService.promptNoteOnQuickLog;

    return Column(
      children: [
        BrutalistCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Sticky Shelf / Status Tabs',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      sticky
                          ? 'Status filter tabs stay pinned at the top when scrolling through books.'
                          : 'Status filter tabs scroll away with the search bar to maximize screen real estate.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              BrutalistSwitch(
                value: sticky,
                onChanged: (val) {
                  _themeService.setStickyStatusFilter(val);
                  setState(() {});
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        BrutalistCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Prompt Note on Quick Progress',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      promptNote
                          ? 'Briefly shows a quick-note prompt after tapping +1 / +5 progress chips.'
                          : 'Quick chips log progress instantly in 0ms without any popups.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              BrutalistSwitch(
                value: promptNote,
                onChanged: (val) {
                  _themeService.setPromptNoteOnQuickLog(val);
                  setState(() {});
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        BrutalistCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Show All Shelves in Hero Bar',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _themeService.alwaysShowAllShelves
                          ? 'All custom shelves appear as horizontal tabs in the library header.'
                          : 'Shelves appear docked on the left only when selected from filters.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              BrutalistSwitch(
                value: _themeService.alwaysShowAllShelves,
                onChanged: (val) {
                  _themeService.setAlwaysShowAllShelves(val);
                  setState(() {});
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNetworkPreferences(bool isDark) {
    return Column(
      children: [
        BrutalistCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Offline Mode',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Pause remote syncing. App operates exclusively from local SQLite database.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              BrutalistSwitch(
                value: _offlineMode,
                onChanged: (val) {
                  setState(() => _offlineMode = val);
                  _saveConfig();
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        BrutalistCard(
          margin: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Auto-Sync on Launch',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Automatically push local changes and pull remote updates in the background.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              BrutalistSwitch(
                value: _autoSync,
                onChanged: (val) {
                  setState(() => _autoSync = val);
                  _saveConfig();
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDataManagementCard(bool isDark) {
    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => TrashScreen(onDataChanged: () {})),
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                  border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1.5),
                ),
                child: Icon(Icons.delete_outline_rounded, size: 20, color: isDark ? Colors.white : AppColors.inkBlack),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Trash & Recovery',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'View deleted books, restore them to your library, or permanently remove them.',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.7) : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: isDark ? Colors.white : AppColors.inkBlack),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildManualSyncButton() {
    return BrutalistButton(
      backgroundColor: Theme.of(context).colorScheme.primary,
      onPressed: _syncManager.isSyncing
          ? null
          : () async {
              await _saveConfig();
              final books = await _syncManager.syncNow();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Sync completed! ${books.length} books in local database.'),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
      child: _syncManager.isSyncing
          ? const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                ),
                SizedBox(width: 10),
                Text('SYNCING WITH REMOTE...', style: TextStyle(color: Colors.white)),
              ],
            )
          : const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.cloud_sync_rounded, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('SYNC NOW', style: TextStyle(color: Colors.white, fontSize: 15)),
              ],
            ),
    );
  }

  Widget _buildAboutCard(bool isDark) {
    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'PAPERBACK READER',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, letterSpacing: -0.2),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1),
                ),
                child: Text(
                  _appVersion,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'A tactile, offline-first reading ledger engineered for serialized web novels, light novels, and physical literature.',
            style: TextStyle(
              fontSize: 12,
              height: 1.4,
              color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.75) : AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: 14),
          const Divider(height: 1),
          const SizedBox(height: 12),
          InkWell(
            onTap: _openGitHub,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                    offset: AppTheme.shadowOffsetSm,
                    blurRadius: 0,
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.code_rounded, size: 18, color: isDark ? Colors.white : AppColors.inkBlack),
                  const SizedBox(width: 8),
                  Text(
                    'GITHUB REPOSITORY',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 0.5,
                      color: isDark ? Colors.white : AppColors.inkBlack,
                    ),
                  ),
                  const Spacer(),
                  Icon(Icons.open_in_new_rounded, size: 16, color: isDark ? Colors.white70 : AppColors.inkMuted),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          _buildUpdateCheckerWidget(isDark),
        ],
      ),
    );
  }

  Future<void> _checkForUpdates() async {
    if (_isCheckingUpdate) return;
    setState(() {
      _isCheckingUpdate = true;
      _updateError = null;
    });

    final info = await _updateService.checkForUpdates();
    if (!mounted) return;

    setState(() {
      _isCheckingUpdate = false;
      if (info != null) {
        _updateInfo = info;
      } else {
        _updateError = 'Could not reach update server';
      }
    });
  }

  Widget _buildUpdateCheckerWidget(bool isDark) {
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final accentColor = Theme.of(context).extension<AppThemeDetails>()?.accentColor ?? Theme.of(context).colorScheme.primary;

    if (_isCheckingUpdate) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: accentColor,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'CHECKING GITHUB FOR UPDATES...',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
                color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
              ),
            ),
          ],
        ),
      );
    }

    if (_updateInfo != null) {
      if (_updateInfo!.hasUpdate) {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFB800),
            border: Border.all(color: AppColors.inkBlack, width: 2),
            boxShadow: const [
              BoxShadow(color: AppColors.inkBlack, offset: Offset(2.5, 2.5), blurRadius: 0),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.rocket_launch_rounded, size: 16, color: AppColors.inkBlack),
                  const SizedBox(width: 6),
                  Text(
                    'UPDATE AVAILABLE: ${_updateInfo!.latestVersion.toUpperCase()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 0.5,
                      color: AppColors.inkBlack,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'A new release is ready on GitHub. Tap below to download the latest installer or APK.',
                style: TextStyle(fontSize: 11, color: AppColors.inkBlack, height: 1.3),
              ),
              const SizedBox(height: 10),
              InkWell(
                onTap: () async {
                  final uri = Uri.parse(_updateInfo!.releaseUrl);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.inkBlack,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'GET LATEST RELEASE ➔',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      } else {
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
            border: Border.all(color: borderColor, width: 1.5),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle_outline_rounded, size: 16, color: Colors.green),
              const SizedBox(width: 8),
              Text(
                'YOU ARE ON THE LATEST VERSION (${_updateInfo!.currentVersion})',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                ),
              ),
            ],
          ),
        );
      }
    }

    return InkWell(
      onTap: _checkForUpdates,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
          border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
              offset: AppTheme.shadowOffsetSm,
              blurRadius: 0,
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.system_update_alt_rounded, size: 18, color: isDark ? Colors.white : AppColors.inkBlack),
            const SizedBox(width: 8),
            Text(
              'CHECK FOR UPDATES',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 12,
                letterSpacing: 0.5,
                color: isDark ? Colors.white : AppColors.inkBlack,
              ),
            ),
            if (_updateError != null) ...[
              const Spacer(),
              Text(
                '⚠️ RETRY',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBackendConfigCard(bool isDark) {
    final isConnected = _syncManager.connectionStatus == 'Connected';
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final hasConfiguredEndpoint = _urlController.text.trim().isNotEmpty;

    String displayEndpoint = 'Not Configured';
    if (hasConfiguredEndpoint) {
      try {
        final uri = Uri.parse(_urlController.text.trim());
        displayEndpoint = uri.host.isNotEmpty ? uri.host : _urlController.text.trim();
      } catch (_) {
        displayEndpoint = _urlController.text.trim();
      }
    }

    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Status + Safe Summary + Lock/Expand Toggle Button
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: isConnected ? AppColors.successGreen : Colors.redAccent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          _selectedType == SyncBackendType.supabase ? 'SUPABASE' : 'GENERIC REST',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: isConnected ? AppColors.successGreen.withValues(alpha: 0.15) : Colors.red.withValues(alpha: 0.15),
                            border: Border.all(
                              color: isConnected ? AppColors.successGreen : Colors.red,
                              width: 1,
                            ),
                          ),
                          child: Text(
                            _syncManager.connectionStatus.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: isConnected ? AppColors.successGreen : Colors.red,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      displayEndpoint,
                      style: TextStyle(
                        fontSize: 11,
                        color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.6),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              // Expand / Collapse Lock Button
              InkWell(
                onTap: () => setState(() => _isConfigExpanded = !_isConfigExpanded),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: _isConfigExpanded
                        ? Theme.of(context).colorScheme.primary
                        : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
                    border: Border.all(color: borderColor, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: borderColor,
                        offset: AppTheme.shadowOffsetSm,
                        blurRadius: 0,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isConfigExpanded ? Icons.lock_open_rounded : Icons.lock_outline_rounded,
                        size: 14,
                        color: _isConfigExpanded ? Colors.white : (isDark ? Colors.white : AppColors.inkBlack),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isConfigExpanded ? 'LOCK' : 'EDIT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: _isConfigExpanded ? Colors.white : (isDark ? Colors.white : AppColors.inkBlack),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Collapsible Form
          if (_isConfigExpanded) ...[
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Provider Type Selector
            const Text(
              'BACKEND PROVIDER',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildProviderButton(
                    'SUPABASE',
                    SyncBackendType.supabase,
                    _selectedType == SyncBackendType.supabase,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildProviderButton(
                    'SELF-HOSTED REST',
                    SyncBackendType.selfHostedRest,
                    _selectedType == SyncBackendType.selfHostedRest,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Endpoint URL Input
            Text(
              _selectedType == SyncBackendType.supabase ? 'SUPABASE PROJECT URL' : 'SERVER BASE URL',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 6),
            _buildBrutalistTextField(
              controller: _urlController,
              hint: _selectedType == SyncBackendType.supabase
                  ? 'https://xyzcompany.supabase.co'
                  : 'https://api.yourdomain.com',
              icon: Icons.link_rounded,
            ),
            const SizedBox(height: 14),

            // API Key / Token Input
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedType == SyncBackendType.supabase ? 'ANON PUBLIC KEY' : 'API ACCESS TOKEN',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                GestureDetector(
                  onTap: () => setState(() => _showApiKey = !_showApiKey),
                  child: Text(
                    _showApiKey ? 'HIDE' : 'REVEAL',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            _buildBrutalistTextField(
              controller: _apiKeyController,
              hint: _selectedType == SyncBackendType.supabase ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' : 'Your Secret Token',
              icon: Icons.vpn_key_rounded,
              isObscure: !_showApiKey,
            ),
            const SizedBox(height: 16),

            // Test Connection & Save Action Row
            Row(
              children: [
                Expanded(
                  child: BrutalistButton(
                    backgroundColor: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                    textColor: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                    onPressed: _isTestingConnection ? null : _testConnection,
                    child: _isTestingConnection
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('TEST LINK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: BrutalistButton(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    textColor: Colors.white,
                    onPressed: () => _saveConfig(collapseAfter: true),
                    child: const Text('SAVE & LOCK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildThemeSelector(bool isDark) {
    final mode = _themeService.themeMode;
    final lightVariants = AppThemeVariant.values.where((v) => !v.isDark).toList();
    final darkVariants = AppThemeVariant.values.where((v) => v.isDark).toList();

    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'THEME MODE',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),

          // Segmented buttons: System / Light / Dark
          Row(
            children: [
              Expanded(
                child: _buildModeButton('System', ThemeMode.system, mode == ThemeMode.system),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildModeButton('Light', ThemeMode.light, mode == ThemeMode.light),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildModeButton('Dark', ThemeMode.dark, mode == ThemeMode.dark),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Option 2: Material You Dynamic Wallpaper Toggle Switch
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
              border: Border.all(
                color: _themeService.useDynamicColor
                    ? Theme.of(context).colorScheme.primary
                    : (isDark ? AppColors.darkInkWhite.withValues(alpha: 0.3) : AppColors.inkBlack.withValues(alpha: 0.2)),
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.palette_outlined,
                            size: 15,
                            color: _themeService.useDynamicColor
                                ? Theme.of(context).colorScheme.primary
                                : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'MATERIAL YOU DYNAMIC COLOR',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.3,
                              color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _themeService.useDynamicColor
                            ? 'Syncing canvas & accent hues with your device wallpaper.'
                            : 'Match app colors to your Android home screen wallpaper.',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                BrutalistSwitch(
                  value: _themeService.useDynamicColor,
                  onChanged: (val) {
                    _themeService.setUseDynamicColor(val);
                    setState(() {});
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_themeService.useDynamicColor)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                border: Border.all(color: Theme.of(context).colorScheme.primary, width: 1),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded, size: 14, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Wallpaper dynamic color is active. Disable toggle above to switch back to curated book palettes.',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Light Palettes
          if (mode != ThemeMode.dark) ...[
            Row(
              children: [
                const Icon(Icons.wb_sunny_outlined, size: 14),
                const SizedBox(width: 6),
                Text(
                  'LIGHT PALETTES (${lightVariants.length})',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildVariantGrid(lightVariants, _themeService.lightVariant, isDark),
            const SizedBox(height: 14),
          ],

          // Dark Palettes
          if (mode != ThemeMode.light) ...[
            Row(
              children: [
                const Icon(Icons.nightlight_round_outlined, size: 14),
                const SizedBox(width: 6),
                Text(
                  'DARK PALETTES (${darkVariants.length})',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildVariantGrid(darkVariants, _themeService.darkVariant, isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildDisplayAndLayoutPreferences(bool isDark) {
    final details = Theme.of(context).extension<AppThemeDetails>();
    final borderColor = details?.borderColor ?? (isDark ? AppColors.darkInkWhite : AppColors.inkBlack);
    final accentColor = details?.accentColor ?? Theme.of(context).colorScheme.primary;
    final defaultMode = _themeService.defaultViewMode;
    final isCompact = _themeService.compactMode;
    final showCarousel = _themeService.showReadingCarousel;
    final highRefreshRate = _themeService.highRefreshRate;
    final isFullscreen = _themeService.isFullscreen;
    final enableTexture = _themeService.enablePaperTexture;
    final isMobile = !kIsWeb && (Platform.isAndroid || Platform.isIOS);

    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Default Library View Mode
          const Text(
            'DEFAULT LIBRARY VIEW',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildLayoutOption(
                  'CARDS',
                  Icons.grid_view_rounded,
                  defaultMode == 'cards',
                  () => _themeService.setDefaultViewMode('cards'),
                  isDark,
                  borderColor,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildLayoutOption(
                  'COVERS',
                  Icons.auto_stories_rounded,
                  defaultMode == 'covers',
                  () => _themeService.setDefaultViewMode('covers'),
                  isDark,
                  borderColor,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildLayoutOption(
                  'TABLE',
                  Icons.view_headline_rounded,
                  defaultMode == 'table',
                  () => _themeService.setDefaultViewMode('table'),
                  isDark,
                  borderColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2. Card Display Density
          const Text(
            'CARD DENSITY',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildLayoutOption(
                  'COMFORTABLE',
                  Icons.aspect_ratio_rounded,
                  !isCompact,
                  () => _themeService.setCompactMode(false),
                  isDark,
                  borderColor,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildLayoutOption(
                  'COMPACT',
                  Icons.density_medium_rounded,
                  isCompact,
                  () => _themeService.setCompactMode(true),
                  isDark,
                  borderColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 3. Carousel Toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
              border: Border.all(color: borderColor, width: 1.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CURRENTLY READING CAROUSEL',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Show hero carousel banner at top of library',
                        style: TextStyle(
                          fontSize: 10,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                        ),
                      ),
                    ],
                  ),
                ),
                BrutalistSwitch(
                  value: showCarousel,
                  onChanged: (val) => _themeService.setShowReadingCarousel(val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 4. Android High Refresh Rate Mode (Only on Mobile/Android)
          if (isMobile) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'HIGH REFRESH RATE (120Hz)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Unlocks 90Hz/120Hz smooth animations on supported screens',
                          style: TextStyle(
                            fontSize: 10,
                            color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                          ),
                        ),
                      ],
                    ),
                  ),
                  BrutalistSwitch(
                    value: highRefreshRate,
                    onChanged: (val) => _themeService.setHighRefreshRate(val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],

          // 5. Fullscreen Mode Toggle (Desktop & Mobile)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
              border: Border.all(color: borderColor, width: 1.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isMobile ? 'IMMERSIVE FULLSCREEN' : 'DISTRACTION-FREE FULLSCREEN (F11)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isMobile
                            ? 'Hide status bar & navigation bar for focused reading'
                            : 'Toggle borderless fullscreen mode (Shortcut: F11)',
                        style: TextStyle(
                          fontSize: 10,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                        ),
                      ),
                    ],
                  ),
                ),
                BrutalistSwitch(
                  value: isFullscreen,
                  onChanged: (val) => _themeService.toggleFullscreen(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 6. Tactile Paper & Canvas Textures Toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
              border: Border.all(color: borderColor, width: 1.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TACTILE PAPER & CANVAS TEXTURES',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Show subtle stationery grain, washi fibers, and notebook grids',
                        style: TextStyle(
                          fontSize: 10,
                          color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                        ),
                      ),
                    ],
                  ),
                ),
                BrutalistSwitch(
                  value: enableTexture,
                  onChanged: (val) => _themeService.setEnablePaperTexture(val),
                ),
              ],
            ),
          ),

          // 7. Pattern Intensity Presets & Slider
          if (enableTexture) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                border: Border.all(color: borderColor, width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PATTERN INTENSITY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: accentColor,
                          border: Border.all(color: borderColor, width: 1.2),
                        ),
                        child: Text(
                          '${(_themeService.patternIntensity * 100).round()}%',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildLayoutOption(
                          'SUBTLE',
                          Icons.opacity_rounded,
                          (_themeService.patternIntensity - 0.6).abs() < 0.05,
                          () => _themeService.setPatternIntensity(0.6),
                          isDark,
                          borderColor,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildLayoutOption(
                          'BALANCED',
                          Icons.contrast_rounded,
                          (_themeService.patternIntensity - 1.0).abs() < 0.05,
                          () => _themeService.setPatternIntensity(1.0),
                          isDark,
                          borderColor,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _buildLayoutOption(
                          'BOLD',
                          Icons.brightness_medium_rounded,
                          (_themeService.patternIntensity - 1.5).abs() < 0.05,
                          () => _themeService.setPatternIntensity(1.5),
                          isDark,
                          borderColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: accentColor,
                      inactiveTrackColor: borderColor.withValues(alpha: 0.2),
                      thumbColor: accentColor,
                      overlayColor: accentColor.withValues(alpha: 0.15),
                      trackHeight: 3.5,
                      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                    ),
                    child: Slider(
                      value: _themeService.patternIntensity,
                      min: 0.3,
                      max: 1.8,
                      divisions: 15,
                      onChanged: (val) => _themeService.setPatternIntensity(val),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLayoutOption(
    String title,
    IconData icon,
    bool isSelected,
    VoidCallback onTap,
    bool isDark,
    Color borderColor,
  ) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
            border: Border.all(color: borderColor, width: isSelected ? 2.0 : 1.5),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: borderColor,
                      offset: AppTheme.shadowOffsetSm,
                      blurRadius: 0,
                    ),
                  ]
                : null,
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                  fontWeight: FontWeight.w900,
                  fontSize: 10,
                  letterSpacing: 0.3,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeButton(String label, ThemeMode targetMode, bool isSelected) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: InkWell(
        onTap: () {
          _themeService.setThemeMode(targetMode);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
            border: Border.all(color: borderColor, width: 1.5),
          ),
          alignment: Alignment.center,
          child: Text(
            label.toUpperCase(),
            style: TextStyle(
              color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildVariantGrid(List<AppThemeVariant> variants, AppThemeVariant selectedVariant, bool isDark) {
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, constraints) {
            final crossAxisCount = constraints.maxWidth > 700
                ? 4
                : (constraints.maxWidth > 450 ? 3 : 2);

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                mainAxisExtent: 74,
              ),
              itemCount: variants.length,
              itemBuilder: (context, index) {
                final v = variants[index];
                return _buildCompactPaletteTile(v, selectedVariant == v, isDark);
              },
            );
          },
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
            border: Border.all(
              color: borderColor.withValues(alpha: 0.25),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: selectedVariant.previewAccent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${selectedVariant.label} — ${selectedVariant.description}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.85) : AppColors.inkBlack.withValues(alpha: 0.85),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCompactPaletteTile(AppThemeVariant variant, bool isSelected, bool isDark) {
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: InkWell(
        onTap: () {
          if (variant.isDark) {
            _themeService.setDarkVariant(variant);
          } else {
            _themeService.setLightVariant(variant);
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppColors.darkSurfaceHigh : Colors.white)
                : (isDark ? AppColors.darkSurface : AppColors.paperSurface),
            border: Border.all(
              color: isSelected ? variant.previewAccent : borderColor.withValues(alpha: 0.4),
              width: isSelected ? 2.5 : 1.5,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      offset: AppTheme.shadowOffsetSm,
                      blurRadius: 0,
                    ),
                  ]
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Triple Color Swatch
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: variant.previewCanvas,
                          border: Border.all(color: borderColor, width: 1),
                        ),
                      ),
                      const SizedBox(width: 3),
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: variant.previewCard,
                          border: Border.all(color: borderColor, width: 1),
                        ),
                      ),
                      const SizedBox(width: 3),
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: variant.previewAccent,
                          border: Border.all(color: borderColor, width: 1),
                        ),
                      ),
                    ],
                  ),
                  if (isSelected)
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: variant.previewAccent,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded, size: 12, color: Colors.white),
                    ),
                ],
              ),
              Text(
                variant.label.toUpperCase(),
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 10.5,
                  letterSpacing: -0.1,
                  color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProviderButton(String label, SyncBackendType type, bool isSelected) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return GestureDetector(
      onTap: () => setState(() => _selectedType = type),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primary
              : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
          border: Border.all(color: borderColor, width: 1.5),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: borderColor,
                    offset: AppTheme.shadowOffsetSm,
                    blurRadius: 0,
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            fontWeight: FontWeight.w900,
            fontSize: 11,
          ),
        ),
      ),
    );
  }

  Widget _buildBrutalistTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isObscure = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
        border: Border.all(color: borderColor, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: borderColor,
            offset: AppTheme.shadowOffsetSm,
            blurRadius: 0,
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: isObscure,
        style: TextStyle(
          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.4),
            fontSize: 12,
          ),
          prefixIcon: Icon(icon, size: 18, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        ),
      ),
    );
  }
}
