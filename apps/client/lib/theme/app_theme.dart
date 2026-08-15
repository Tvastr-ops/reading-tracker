import 'package:flutter/material.dart';

class AppColors {
  // Neo-Brutalist Paper Light Palette (from Stitch Design)
  static const Color paperBg = Color(0xFFFCFAED);
  static const Color paperSurface = Color(0xFFF0EEE2);
  static const Color paperSurfaceHigh = Color(0xFFEAE8DD);
  static const Color paperSurfaceHighest = Color(0xFFE5E3D7);
  static const Color inkBlack = Color(0xFF1B1C15);
  static const Color inkMuted = Color(0xFF5E5E5E);

  // Brand Accents
  static const Color primaryRed = Color(0xFFBB0114);
  static const Color primaryRedContainer = Color(0xFFE02929);
  static const Color successGreen = Color(0xFF15803D);
  static const Color skyBlue = Color(0xFF0284C7);
  static const Color amberWarning = Color(0xFFD97706);

  // Dark Brutalist Palette
  static const Color darkBg = Color(0xFF12130F);
  static const Color darkSurface = Color(0xFF1E2018);
  static const Color darkSurfaceHigh = Color(0xFF2B2D24);
  static const Color darkInkWhite = Color(0xFFF6F4E8);
}

class AppTheme {
  static const double borderHeavy = 3.0;
  static const double borderLight = 2.0;
  static const Offset shadowOffset = Offset(3.5, 3.5);
  static const Offset shadowOffsetSm = Offset(2.0, 2.0);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: AppColors.paperBg,
    colorScheme: const ColorScheme.light(
      primary: AppColors.primaryRed,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primaryRedContainer,
      onPrimaryContainer: Colors.white,
      surface: AppColors.paperSurface,
      onSurface: AppColors.inkBlack,
      error: Color(0xFFBA1A1A),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paperBg,
      foregroundColor: AppColors.inkBlack,
      elevation: 0,
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.darkBg,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primaryRedContainer,
      onPrimary: Colors.white,
      primaryContainer: AppColors.primaryRed,
      onPrimaryContainer: Colors.white,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkInkWhite,
      error: Color(0xFFFFB4AB),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.darkBg,
      foregroundColor: AppColors.darkInkWhite,
      elevation: 0,
    ),
  );
}
