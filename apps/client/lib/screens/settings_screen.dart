import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/sync/generic_rest_sync_provider.dart';
import '../services/sync/supabase_sync_provider.dart';
import '../services/sync/sync_manager.dart';
import '../services/sync/sync_provider.dart';
import '../services/theme_service.dart';
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

  late TextEditingController _urlController;
  late TextEditingController _apiKeyController;
  late SyncBackendType _selectedType;
  late bool _offlineMode;
  late bool _autoSync;
  bool _isConfigExpanded = false;
  bool _showApiKey = false;
  bool _isTestingConnection = false;

  // Collapsible section state for mobile screen real estate
  bool _isAppearanceExpanded = false;
  bool _isDisplayExpanded = false;
  bool _isLibraryNavExpanded = true;
  bool _isNetworkExpanded = true;
  bool _isDataExpanded = false;
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
  }

  @override
  void dispose() {
    _syncManager.removeListener(_onSyncUpdate);
    _urlController.dispose();
    _apiKeyController.dispose();
    super.dispose();
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
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.8,
                    color: inkColor,
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
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: accentColor,
                      ),
                    ),
                  ),
                ],
              ],
            ),
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

  Widget _buildSectionHeader(String title) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Text(
      title,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w900,
        letterSpacing: 0.8,
        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
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
    final displayBadge = _themeService.displayMode == AppDisplayMode.edgeToEdge
        ? 'Edge-to-Edge'
        : _themeService.displayMode == AppDisplayMode.classic
            ? 'Classic'
            : 'Fullscreen';

    return Scaffold(
      appBar: AppBar(
        title: const Text('SETTINGS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_rounded),
            tooltip: 'Save Settings',
            onPressed: () => _saveConfig(),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWideScreen = constraints.maxWidth >= 840;

          if (isWideScreen) {
            return _buildWideLayout(isDark, themeBadge, displayBadge);
          }

          return _buildMobileLayout(isDark, themeBadge, displayBadge);
        },
      ),
    );
  }

  Widget _buildMobileLayout(bool isDark, String themeBadge, String displayBadge) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        // Section 0: Appearance & Neo-Paper Themes
        _buildCollapsibleSectionHeader(
          'APPEARANCE & THEMES',
          _isAppearanceExpanded,
          () => setState(() => _isAppearanceExpanded = !_isAppearanceExpanded),
          badgeLabel: themeBadge,
        ),
        const SizedBox(height: 6),
        if (_isAppearanceExpanded) ...[
          _buildThemeSelector(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 1: Display & Status Bar Layout
        _buildCollapsibleSectionHeader(
          'DISPLAY & STATUS BAR',
          _isDisplayExpanded,
          () => setState(() => _isDisplayExpanded = !_isDisplayExpanded),
          badgeLabel: displayBadge,
        ),
        const SizedBox(height: 6),
        if (_isDisplayExpanded) ...[
          _buildDisplayModeSelector(isDark),
          const SizedBox(height: 14),
        ],
        const SizedBox(height: 8),

        // Section 2: Library & Navigation Preferences
        _buildCollapsibleSectionHeader(
          'LIBRARY PREFERENCES',
          _isLibraryNavExpanded,
          () => setState(() => _isLibraryNavExpanded = !_isLibraryNavExpanded),
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
          'NETWORK & SYNC PREFERENCES',
          _isNetworkExpanded,
          () => setState(() => _isNetworkExpanded = !_isNetworkExpanded),
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
          () => setState(() => _isDataExpanded = !_isDataExpanded),
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
          () => setState(() => _isAboutExpanded = !_isAboutExpanded),
          badgeLabel: 'v1.3.0c',
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

  Widget _buildWideLayout(bool isDark, String themeBadge, String displayBadge) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Column 1: Appearance & UI Preferences
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionHeader('APPEARANCE & THEMES'),
                const SizedBox(height: 8),
                _buildThemeSelector(isDark),
                const SizedBox(height: 20),

                _buildSectionHeader('DISPLAY & STATUS BAR'),
                const SizedBox(height: 8),
                _buildDisplayModeSelector(isDark),
                const SizedBox(height: 20),

                _buildSectionHeader('LIBRARY PREFERENCES'),
                const SizedBox(height: 8),
                _buildLibraryNavPreferences(isDark),
              ],
            ),
          ),
          const SizedBox(width: 20),

          // Column 2: Backend, Sync & Data
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionHeader('NETWORK & BACKEND PREFERENCES'),
                const SizedBox(height: 8),
                _buildNetworkPreferences(isDark),
                const SizedBox(height: 12),
                _buildBackendConfigCard(isDark),
                const SizedBox(height: 20),

                _buildSectionHeader('DATA MANAGEMENT'),
                const SizedBox(height: 8),
                _buildDataManagementCard(isDark),
                const SizedBox(height: 20),

                _buildManualSyncButton(),
                const SizedBox(height: 20),

                _buildSectionHeader('ABOUT PAPERBACK'),
                const SizedBox(height: 8),
                _buildAboutCard(isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLibraryNavPreferences(bool isDark) {
    final sticky = _themeService.stickyStatusFilter;

    return BrutalistCard(
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
          Switch(
            value: sticky,
            activeThumbColor: Theme.of(context).colorScheme.primary,
            onChanged: (val) {
              _themeService.setStickyStatusFilter(val);
              setState(() {});
            },
          ),
        ],
      ),
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
              Switch(
                value: _offlineMode,
                activeThumbColor: Theme.of(context).colorScheme.primary,
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
              Switch(
                value: _autoSync,
                activeThumbColor: Theme.of(context).colorScheme.primary,
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
                child: const Text(
                  'v1.3.0c',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white),
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
        ],
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
                Switch(
                  value: _themeService.useDynamicColor,
                  activeThumbColor: Theme.of(context).colorScheme.primary,
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
                  'LIGHT PALETTES (5)',
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
            ...lightVariants.map((v) => _buildPaletteCard(v, _themeService.lightVariant == v, isDark)),
            const SizedBox(height: 12),
          ],

          // Dark Palettes
          if (mode != ThemeMode.light) ...[
            Row(
              children: [
                const Icon(Icons.nightlight_round_outlined, size: 14),
                const SizedBox(width: 6),
                Text(
                  'DARK PALETTES (5)',
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
            ...darkVariants.map((v) => _buildPaletteCard(v, _themeService.darkVariant == v, isDark)),
          ],
        ],
      ),
    );
  }

  Widget _buildDisplayModeSelector(bool isDark) {
    final currentMode = _themeService.displayMode;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return BrutalistCard(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'STATUS BAR & DISPLAY LAYOUT',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildDisplayModeOption(
                  'EDGE-TO-EDGE',
                  'New',
                  AppDisplayMode.edgeToEdge,
                  currentMode == AppDisplayMode.edgeToEdge,
                  Icons.phone_android_rounded,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildDisplayModeOption(
                  'CLASSIC',
                  'Old',
                  AppDisplayMode.classic,
                  currentMode == AppDisplayMode.classic,
                  Icons.dock_rounded,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: _buildDisplayModeOption(
                  'FULLSCREEN',
                  'Max',
                  AppDisplayMode.immersive,
                  currentMode == AppDisplayMode.immersive,
                  Icons.fullscreen_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
              border: Border.all(color: borderColor.withValues(alpha: 0.3), width: 1),
            ),
            child: Text(
              currentMode == AppDisplayMode.edgeToEdge
                  ? 'Edge-to-Edge: Status bar is transparent and seamlessly overlays the canvas palette.'
                  : currentMode == AppDisplayMode.classic
                      ? 'Classic: Standard solid status bar anchored at the top.'
                      : 'Fullscreen: Hides the status bar for uninterrupted, full-screen reading real estate.',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.8) : AppColors.inkMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisplayModeOption(
    String title,
    String badge,
    AppDisplayMode targetMode,
    bool isSelected,
    IconData icon,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return GestureDetector(
      onTap: () {
        _themeService.setDisplayMode(targetMode);
        setState(() {});
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
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
              size: 18,
              color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                fontWeight: FontWeight.w900,
                fontSize: 9.5,
                letterSpacing: 0.2,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeButton(String label, ThemeMode targetMode, bool isSelected) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return GestureDetector(
      onTap: () {
        _themeService.setThemeMode(targetMode);
        setState(() {});
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
    );
  }

  Widget _buildPaletteCard(AppThemeVariant variant, bool isSelected, bool isDark) {
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          if (variant.isDark) {
            _themeService.setDarkVariant(variant);
          } else {
            _themeService.setLightVariant(variant);
          }
          setState(() {});
        },
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppColors.darkSurfaceHigh : Colors.white)
                : (isDark ? AppColors.darkSurface : AppColors.paperSurface),
            border: Border.all(
              color: isSelected ? variant.previewAccent : borderColor.withValues(alpha: 0.5),
              width: isSelected ? 2.5 : 1.5,
            ),
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
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: variant.previewCanvas,
                  border: Border.all(color: borderColor, width: 1.5),
                ),
                child: Center(
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: variant.previewAccent,
                      border: Border.all(color: borderColor, width: 1),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          variant.label.toUpperCase(),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                          ),
                        ),
                        if (isSelected) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            color: variant.previewAccent,
                            child: const Text(
                              'ACTIVE',
                              style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      variant.description,
                      style: TextStyle(
                        fontSize: 11,
                        color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
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
