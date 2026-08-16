import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/sync/sync_manager.dart';
import '../services/sync/sync_provider.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';
import 'trash_screen.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback onThemeToggle;
  final bool isDarkMode;

  const SettingsScreen({
    super.key,
    required this.onThemeToggle,
    required this.isDarkMode,
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

    if (mounted) {
      final isConnected = _syncManager.connectionStatus == 'Connected';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isConnected
              ? 'Settings saved & connection verified!'
              : 'Settings saved (Status: ${_syncManager.connectionStatus})'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _testConnection() async {
    setState(() => _isTestingConnection = true);
    final ok = await _syncManager.checkConnection();
    setState(() => _isTestingConnection = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok
              ? 'Connection successful!'
              : 'Connection test failed. Check URL & API Key.'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _openGitHub() async {
    final uri = Uri.parse('https://github.com/Tvastr-ops/reading-tracker');
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('GitHub: https://github.com/Tvastr-ops/reading-tracker'),
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'SETTINGS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_rounded),
            tooltip: 'Save Settings',
            onPressed: () => _saveConfig(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Section 0: Appearance & Neo-Paper Themes
          _buildSectionHeader('APPEARANCE & NEO-PAPER THEMES'),
          const SizedBox(height: 8),
          _buildThemeSelector(isDark),
          const SizedBox(height: 24),

          // Section 1: Network Preferences
          _buildSectionHeader('NETWORK PREFERENCES'),
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
          const SizedBox(height: 12),

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
          const SizedBox(height: 24),

          // Section 2: Remote Backend Configuration (Smart Collapsible / Protected)
          _buildSectionHeader('REMOTE BACKEND & API'),
          const SizedBox(height: 8),
          _buildBackendConfigCard(isDark),
          const SizedBox(height: 24),

          // Section 3: Data Management
          _buildSectionHeader('DATA MANAGEMENT'),
          const SizedBox(height: 8),

          BrutalistCard(
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
          ),
          const SizedBox(height: 24),

          // Section 4: Manual Sync Trigger
          _buildSectionHeader('CLOUD SYNCHRONIZATION'),
          const SizedBox(height: 8),

          BrutalistButton(
            backgroundColor: Theme.of(context).colorScheme.primary,
            onPressed: _syncManager.isSyncing
                ? null
                : () async {
                    await _saveConfig();
                    final books = await _syncManager.syncNow();
                    if (!context.mounted) return;
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
          ),
          const SizedBox(height: 28),

          // Section 5: About & GitHub Open Source
          _buildSectionHeader('ABOUT & OPEN SOURCE'),
          const SizedBox(height: 8),

          BrutalistCard(
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
                        'v1.2.0b',
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
          ),
          const SizedBox(height: 40),
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
                        size: 13,
                        color: _isConfigExpanded ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isConfigExpanded ? 'LOCK' : 'EDIT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: _isConfigExpanded ? Colors.white : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Collapsed Quick Action (Test Connection)
          if (!_isConfigExpanded) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: _isTestingConnection ? null : _testConnection,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
                        border: Border.all(color: borderColor.withValues(alpha: 0.6), width: 1.5),
                      ),
                      alignment: Alignment.center,
                      child: _isTestingConnection
                          ? const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.network_check_rounded, size: 14, color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
                                const SizedBox(width: 6),
                                Text(
                                  'TEST CONNECTION',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                    color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Expanded Drawer with Inputs and Protection
          if (_isConfigExpanded) ...[
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 14),

            const Text(
              'SELECT BACKEND TYPE',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: _buildBackendChoice(
                    'Supabase',
                    SyncBackendType.supabase,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildBackendChoice(
                    'Generic REST',
                    SyncBackendType.selfHostedRest,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            Text(
              _selectedType == SyncBackendType.supabase ? 'SUPABASE PROJECT URL' : 'SERVER ENDPOINT URL',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 6),
            _buildBrutalistInput(
              controller: _urlController,
              hint: _selectedType == SyncBackendType.supabase
                  ? 'https://xyzcompany.supabase.co'
                  : 'https://api.yourdomain.com/v1',
              icon: Icons.link_rounded,
            ),
            const SizedBox(height: 14),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedType == SyncBackendType.supabase ? 'ANON PUBLIC KEY (JWT)' : 'AUTHORIZATION TOKEN',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                InkWell(
                  onTap: () => setState(() => _showApiKey = !_showApiKey),
                  child: Row(
                    children: [
                      Icon(
                        _showApiKey ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 13,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _showApiKey ? 'HIDE' : 'SHOW',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            _buildBrutalistInput(
              controller: _apiKeyController,
              hint: _selectedType == SyncBackendType.supabase
                  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                  : 'Bearer secret_token_here',
              icon: Icons.key_rounded,
              isObscure: !_showApiKey,
            ),
            const SizedBox(height: 16),

            // Save and Lock Action Buttons
            Row(
              children: [
                Expanded(
                  child: BrutalistButton(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    onPressed: () => _saveConfig(collapseAfter: true),
                    child: const Text('SAVE & LOCK', style: TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: InkWell(
                    onTap: _testConnection,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurfaceHigh : Colors.white,
                        border: Border.all(color: borderColor, width: 1.5),
                      ),
                      alignment: Alignment.center,
                      child: const Text(
                        'TEST',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
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
          const SizedBox(height: 16),

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
                  border: Border.all(color: Colors.black54, width: 1.5),
                ),
                padding: const EdgeInsets.all(4),
                child: Container(
                  decoration: BoxDecoration(
                    color: variant.previewCard,
                    border: Border.all(color: Colors.black26, width: 1),
                  ),
                  child: Center(
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: variant.previewAccent,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.black54, width: 1),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      variant.label,
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                        color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      variant.description,
                      style: TextStyle(
                        fontSize: 11,
                        color: (isDark ? AppColors.darkInkWhite : AppColors.inkBlack).withValues(alpha: 0.65),
                      ),
                    ),
                  ],
                ),
              ),

              if (isSelected) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: variant.previewAccent,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, size: 14, color: Colors.white),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w900,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildBackendChoice(String title, SyncBackendType type) {
    final isSelected = _selectedType == type;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: () => setState(() => _selectedType = type),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primary
              : (isDark ? AppColors.darkSurfaceHigh : Colors.white),
          border: Border.all(
            color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
            width: 1.5,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          title.toUpperCase(),
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isDark ? AppColors.darkInkWhite : AppColors.inkBlack),
            fontWeight: FontWeight.w800,
            fontSize: 11,
          ),
        ),
      ),
    );
  }

  Widget _buildBrutalistInput({
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
