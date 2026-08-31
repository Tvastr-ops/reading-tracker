import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/app_lock_service.dart';
import '../services/theme_service.dart';
import '../widgets/paper_texture_canvas.dart';

class AppLockScreen extends StatefulWidget {
  final VoidCallback onUnlocked;

  const AppLockScreen({
    super.key,
    required this.onUnlocked,
  });

  @override
  State<AppLockScreen> createState() => _AppLockScreenState();
}

class _AppLockScreenState extends State<AppLockScreen>
    with SingleTickerProviderStateMixin {
  final AppLockService _appLockService = AppLockService.instance;
  final TextEditingController _passwordController = TextEditingController();

  String _enteredPin = '';
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _isChecking = false;

  Timer? _countdownTimer;
  int _remainingSeconds = 0;

  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 16)
        .chain(CurveTween(curve: Curves.elasticIn))
        .animate(_shakeController);

    _appLockService.addListener(_onServiceUpdate);

    _checkLockout();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_appLockService.isBiometricEnabled &&
          _appLockService.isBiometricAvailable &&
          !_appLockService.isLockedOut) {
        Future.delayed(const Duration(milliseconds: 150), () {
          if (mounted && _appLockService.isCurrentlyLocked.value) {
            _triggerBiometric();
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _appLockService.removeListener(_onServiceUpdate);
    _countdownTimer?.cancel();
    _shakeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onServiceUpdate() {
    if (!_appLockService.isCurrentlyLocked.value) {
      widget.onUnlocked();
    } else {
      _checkLockout();
      if (mounted) setState(() {});
    }
  }

  void _checkLockout() {
    if (_appLockService.isLockedOut) {
      _remainingSeconds = _appLockService.remainingLockoutSeconds;
      _startCountdown();
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final remaining = _appLockService.remainingLockoutSeconds;
      setState(() {
        _remainingSeconds = remaining;
      });
      if (remaining <= 0) {
        timer.cancel();
        setState(() {
          _errorMessage = null;
        });
      }
    });
  }

  Future<void> _triggerBiometric() async {
    if (_appLockService.isLockedOut) return;
    final success = await _appLockService.authenticateBiometric();
    if (success && mounted) {
      widget.onUnlocked();
    }
  }

  void _shake() {
    _shakeController.forward(from: 0.0);
    HapticFeedback.heavyImpact();
  }

  Future<void> _handleDigitPress(String digit) async {
    if (_appLockService.isLockedOut || _isChecking) return;
    if (_enteredPin.length >= 12) return;

    HapticFeedback.lightImpact();
    setState(() {
      _enteredPin += digit;
      _errorMessage = null;
    });

    if (_enteredPin.length >= 6) {
      // Auto verify when at least 6 digits are typed, or on check
    }
  }

  void _handleBackspace() {
    if (_enteredPin.isEmpty || _isChecking) return;
    HapticFeedback.selectionClick();
    setState(() {
      _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
      _errorMessage = null;
    });
  }

  void _handleClear() {
    if (_enteredPin.isEmpty || _isChecking) return;
    HapticFeedback.selectionClick();
    setState(() {
      _enteredPin = '';
      _errorMessage = null;
    });
  }

  Future<void> _verifyPinNow() async {
    if (_enteredPin.length < 6 || _isChecking) return;

    setState(() => _isChecking = true);
    final valid = await _appLockService.verifySecret(_enteredPin);
    if (!mounted) return;

    setState(() => _isChecking = false);

    if (valid) {
      widget.onUnlocked();
    } else {
      _shake();
      setState(() {
        _enteredPin = '';
        if (_appLockService.isLockedOut) {
          _remainingSeconds = _appLockService.remainingLockoutSeconds;
          _errorMessage = 'Too many failed attempts. Locked for $_remainingSeconds s.';
          _startCountdown();
        } else {
          _errorMessage = 'INCORRECT PIN';
        }
      });
    }
  }

  Future<void> _verifyPasswordNow() async {
    final password = _passwordController.text.trim();
    if (password.isEmpty || _isChecking) return;

    setState(() => _isChecking = true);
    final valid = await _appLockService.verifySecret(password);
    if (!mounted) return;

    setState(() => _isChecking = false);

    if (valid) {
      widget.onUnlocked();
    } else {
      _shake();
      setState(() {
        if (_appLockService.isLockedOut) {
          _remainingSeconds = _appLockService.remainingLockoutSeconds;
          _errorMessage = 'Too many failed attempts. Locked for $_remainingSeconds s.';
          _startCountdown();
        } else {
          _errorMessage = 'INCORRECT PASSWORD';
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: PaperTextureCanvas(
        isDark: isDark,
        patternType: PaperPatternType.deckleGrain,
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Spacer(flex: 2),

                      // Logo / Icon
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: primaryColor,
                          border: Border.all(
                            color: isDark ? Colors.white : Colors.black,
                            width: 2.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isDark ? Colors.black54 : Colors.black26,
                              offset: const Offset(4, 4),
                              blurRadius: 0,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.lock_rounded,
                          size: 34,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 20),

                      Text(
                        'PAPERBACK',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.5,
                          color: theme.textTheme.titleLarge?.color,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _appLockService.lockType == AppLockType.pin
                            ? 'ENTER SECURITY PIN'
                            : 'ENTER MASTER PASSWORD',
                        style: GoogleFonts.spaceMono(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                          color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Error message or lockout banner
                      if (_errorMessage != null || _remainingSeconds > 0)
                        AnimatedBuilder(
                          animation: _shakeAnimation,
                          builder: (context, child) {
                            return Transform.translate(
                              offset: Offset(_shakeAnimation.value * (1 - 2 * (_shakeAnimation.value % 2)), 0),
                              child: child,
                            );
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.errorContainer,
                              border: Border.all(
                                color: theme.colorScheme.error,
                                width: 2,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.warning_amber_rounded, size: 16, color: theme.colorScheme.error),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    _remainingSeconds > 0
                                        ? 'COOLDOWN: TRY AGAIN IN $_remainingSeconds S'
                                        : (_errorMessage ?? ''),
                                    style: GoogleFonts.spaceMono(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: theme.colorScheme.onErrorContainer,
                                      fontFeatures: const [FontFeature.tabularFigures()],
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      if (_appLockService.lockType == AppLockType.pin) ...[
                        // PIN Dots
                        _buildPinDisplay(theme, isDark),
                        const SizedBox(height: 28),

                        // Numeric Keypad
                        _buildPinKeypad(theme, isDark),
                      ] else ...[
                        // Password Text Field
                        _buildPasswordField(theme, isDark),
                      ],

                      const Spacer(flex: 3),

                      // Biometric button (if available and enabled)
                      if (_appLockService.isBiometricAvailable && _appLockService.isBiometricEnabled)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: OutlinedButton.icon(
                            onPressed: _remainingSeconds > 0 ? null : _triggerBiometric,
                            icon: const Icon(Icons.fingerprint_rounded, size: 22),
                            label: Text(
                              'USE BIOMETRIC',
                              style: GoogleFonts.spaceMono(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.0,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(
                                color: isDark ? Colors.white38 : Colors.black45,
                                width: 1.5,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                          ),
                        ),
                    ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPinDisplay(ThemeData theme, bool isDark) {
    final length = _enteredPin.length;
    final maxDots = max(6, length);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(maxDots, (index) {
        final isFilled = index < length;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOutBack,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          width: isFilled ? 15 : 13,
          height: isFilled ? 15 : 13,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isFilled ? theme.colorScheme.primary : Colors.transparent,
            border: Border.all(
              color: isFilled
                  ? theme.colorScheme.primary
                  : (isDark ? Colors.white38 : Colors.black45),
              width: 2,
            ),
            boxShadow: isFilled
                ? [
                    BoxShadow(
                      color: theme.colorScheme.primary.withValues(alpha: 0.35),
                      blurRadius: 3,
                      offset: const Offset(0, 1),
                    )
                  ]
                : null,
          ),
        );
      }),
    );
  }

  Widget _buildPinKeypad(ThemeData theme, bool isDark) {
    return Column(
      children: [
        _buildKeypadRow(['1', '2', '3'], theme, isDark),
        const SizedBox(height: 12),
        _buildKeypadRow(['4', '5', '6'], theme, isDark),
        const SizedBox(height: 12),
        _buildKeypadRow(['7', '8', '9'], theme, isDark),
        const SizedBox(height: 12),
        _buildBottomKeypadRow(theme, isDark),
      ],
    );
  }

  Widget _buildKeypadRow(List<String> digits, ThemeData theme, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: digits.map((d) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: _buildKeypadButton(d, () => _handleDigitPress(d), theme, isDark),
        );
      }).toList(),
    );
  }

  Widget _buildBottomKeypadRow(ThemeData theme, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: _buildActionButton(
            icon: Icons.backspace_outlined,
            onTap: _handleBackspace,
            onLongPress: _handleClear,
            theme: theme,
            isDark: isDark,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: _buildKeypadButton('0', () => _handleDigitPress('0'), theme, isDark),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: _buildActionButton(
            icon: Icons.arrow_forward_rounded,
            onTap: _enteredPin.length >= 6 ? _verifyPinNow : null,
            theme: theme,
            isDark: isDark,
            isPrimary: _enteredPin.length >= 6,
          ),
        ),
      ],
    );
  }

  Widget _buildKeypadButton(
    String label,
    VoidCallback onTap,
    ThemeData theme,
    bool isDark,
  ) {
    final disabled = _remainingSeconds > 0 || _isChecking;
    final borderColor = isDark ? Colors.white38 : Colors.black87;
    final bg = isDark ? const Color(0xFF222222) : const Color(0xFFF4F2EB);

    return _BrutalistKeypadKey(
      onTap: onTap,
      disabled: disabled,
      backgroundColor: bg,
      borderColor: borderColor,
      child: Text(
        label,
        style: GoogleFonts.spaceGrotesk(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: disabled
              ? theme.disabledColor
              : theme.textTheme.bodyLarge?.color,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required VoidCallback? onTap,
    VoidCallback? onLongPress,
    required ThemeData theme,
    required bool isDark,
    bool isPrimary = false,
  }) {
    final disabled = onTap == null || _remainingSeconds > 0 || _isChecking;
    final borderColor = isDark ? Colors.white38 : Colors.black87;
    final bg = isPrimary
        ? theme.colorScheme.primary
        : (isDark ? const Color(0xFF1E1E1E) : const Color(0xFFE8E5DC));

    return _BrutalistKeypadKey(
      onTap: onTap,
      onLongPress: onLongPress,
      disabled: disabled,
      isPrimary: isPrimary,
      backgroundColor: bg,
      borderColor: borderColor,
      child: Icon(
        icon,
        size: 22,
        color: disabled
            ? theme.disabledColor
            : (isPrimary ? Colors.white : theme.iconTheme.color),
      ),
    );
  }

  Widget _buildPasswordField(ThemeData theme, bool isDark) {
    return Column(
      children: [
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          enabled: _remainingSeconds == 0 && !_isChecking,
          autofocus: true,
          style: GoogleFonts.spaceMono(fontSize: 16),
          decoration: InputDecoration(
            hintText: 'Enter password',
            hintStyle: GoogleFonts.spaceMono(fontSize: 14),
            border: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(width: 2),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(
                color: isDark ? Colors.white38 : Colors.black45,
                width: 2,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(
                color: theme.colorScheme.primary,
                width: 2.5,
              ),
            ),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                size: 20,
              ),
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          onSubmitted: (_) => _verifyPasswordNow(),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton(
            onPressed: _remainingSeconds > 0 || _isChecking
                ? null
                : _verifyPasswordNow,
            style: FilledButton.styleFrom(
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: _isChecking
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    'UNLOCK',
                    style: GoogleFonts.spaceMono(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

class _BrutalistKeypadKey extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool isPrimary;
  final bool disabled;
  final Color? backgroundColor;
  final Color borderColor;

  const _BrutalistKeypadKey({
    required this.child,
    required this.onTap,
    this.onLongPress,
    this.isPrimary = false,
    this.disabled = false,
    this.backgroundColor,
    required this.borderColor,
  });

  @override
  State<_BrutalistKeypadKey> createState() => _BrutalistKeypadKeyState();
}

class _BrutalistKeypadKeyState extends State<_BrutalistKeypadKey> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final offset = (_isPressed && !widget.disabled)
        ? const Offset(1.0, 1.0)
        : const Offset(2.5, 2.5);

    return MouseRegion(
      cursor: widget.disabled ? SystemMouseCursors.basic : SystemMouseCursors.click,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.disabled
            ? null
            : (_) {
                ThemeService.instance.triggerHapticClick();
                setState(() => _isPressed = true);
              },
        onTapUp: widget.disabled
            ? null
            : (_) {
                setState(() => _isPressed = false);
                widget.onTap?.call();
              },
        onTapCancel: () {
          if (_isPressed) setState(() => _isPressed = false);
        },
        onLongPress: widget.disabled
            ? null
            : () {
                ThemeService.instance.triggerHapticImpact();
                widget.onLongPress?.call();
              },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 50),
          width: 68,
          height: 68,
          transform: Matrix4.translationValues(
            _isPressed && !widget.disabled ? 1.5 : 0.0,
            _isPressed && !widget.disabled ? 1.5 : 0.0,
            0.0,
          ),
          decoration: BoxDecoration(
            color: widget.backgroundColor,
            border: Border.all(color: widget.borderColor, width: 2),
            boxShadow: widget.disabled
                ? null
                : [
                    BoxShadow(
                      color: widget.borderColor,
                      offset: offset,
                      blurRadius: 0,
                    ),
                  ],
          ),
          alignment: Alignment.center,
          child: widget.child,
        ),
      ),
    );
  }
}
