import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/sync/sync_manager.dart';
import '../services/sync/sync_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/brutalist_widgets.dart';

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

  late TextEditingController _urlController;
  late TextEditingController _apiKeyController;
  late SyncBackendType _selectedType;
  late bool _offlineMode;
  late bool _autoSync;

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

  Future<void> _saveConfig() async {
    await _syncManager.updateConfig(
      type: _selectedType,
      url: _urlController.text,
      apiKey: _apiKeyController.text,
      offlineMode: _offlineMode,
      autoSync: _autoSync,
    );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Settings saved & connection verified'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _openGitHub() async {
    final uri = Uri.parse('https://github.com/Tvastr-ops/reading-tracker');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
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
    final isConnected = _syncManager.connectionStatus == 'Connected';

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
            onPressed: _saveConfig,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
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
                  activeThumbColor: AppColors.primaryRed,
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
                  activeThumbColor: AppColors.primaryRed,
                  onChanged: (val) {
                    setState(() => _autoSync = val);
                    _saveConfig();
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Section 2: Connection Details
          _buildSectionHeader('REMOTE BACKEND CONFIGURATION'),
          const SizedBox(height: 8),

          BrutalistCard(
            margin: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'BACKEND TYPE',
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
                        'Self-Hosted REST',
                        SyncBackendType.selfHostedRest,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                const Text(
                  'SERVER URL',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                const SizedBox(height: 6),
                _buildBrutalistInput(
                  controller: _urlController,
                  hint: _selectedType == SyncBackendType.supabase
                      ? 'https://your-project.supabase.co'
                      : 'https://api.yourdomain.com',
                  icon: Icons.link_rounded,
                ),
                const SizedBox(height: 14),

                Text(
                  _selectedType == SyncBackendType.supabase ? 'SUPABASE ANON KEY' : 'API KEY / TOKEN (OPTIONAL)',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                const SizedBox(height: 6),
                _buildBrutalistInput(
                  controller: _apiKeyController,
                  hint: 'eyJhbGciOiJIUzI1NiIsIn...',
                  icon: Icons.key_rounded,
                  isObscure: true,
                ),
                const SizedBox(height: 16),

                // Status Indicator
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: isConnected ? AppColors.successGreen : AppColors.primaryRed,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack,
                          width: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'STATUS: ${_syncManager.connectionStatus.toUpperCase()}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: isConnected ? AppColors.successGreen : AppColors.primaryRed,
                      ),
                    ),
                    const Spacer(),
                    if (_syncManager.lastSyncedAt != null)
                      Text(
                        'Last Sync: ${_syncManager.lastSyncedAt!.hour}:${_syncManager.lastSyncedAt!.minute.toString().padLeft(2, '0')}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.darkInkWhite.withValues(alpha: 0.6) : AppColors.inkMuted,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Section 3: Appearance & UI Preferences
          _buildSectionHeader('APPEARANCE & PREFERENCES'),
          const SizedBox(height: 8),

          BrutalistCard(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Theme Mode', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                        SizedBox(height: 2),
                        Text('Switch between Paper Light and Brutalist Dark', style: TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                      ],
                    ),
                    IconButton(
                      icon: Icon(widget.isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded),
                      onPressed: widget.onThemeToggle,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Section 4: 1-Click Sync Now Action Button
          BrutalistButton(
            isFullWidth: true,
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: AppColors.primaryRed,
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
                        color: AppColors.primaryRed,
                        border: Border.all(color: isDark ? AppColors.darkInkWhite : AppColors.inkBlack, width: 1),
                      ),
                      child: const Text(
                        'v1.0.0',
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
              ? AppColors.primaryRed
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
