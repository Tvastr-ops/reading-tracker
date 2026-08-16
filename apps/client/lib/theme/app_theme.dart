import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Neo-Brutalist Paper Light Palette
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

enum AppThemeVariant {
  // Light Variants (5)
  classicPaperback,
  mangaInkpaper,
  matchaWashi,
  retroPulpComic,
  sakuraManuscript,

  // Dark Variants (5)
  charcoalLedger,
  nordicNight,
  mangaNoir,
  darkAcademia,
  cyanotypeBlueprint,
}

extension AppThemeVariantMeta on AppThemeVariant {
  String get id => name;

  String get label {
    switch (this) {
      case AppThemeVariant.classicPaperback:
        return 'Classic Paperback';
      case AppThemeVariant.mangaInkpaper:
        return 'Manga Inkpaper';
      case AppThemeVariant.matchaWashi:
        return 'Matcha & Washi';
      case AppThemeVariant.retroPulpComic:
        return 'Retro Pulp Comic';
      case AppThemeVariant.sakuraManuscript:
        return 'Sakura Manuscript';
      case AppThemeVariant.charcoalLedger:
        return 'Charcoal Ledger';
      case AppThemeVariant.nordicNight:
        return 'Nordic Night (Fjord)';
      case AppThemeVariant.mangaNoir:
        return 'Manga Noir (OLED)';
      case AppThemeVariant.darkAcademia:
        return 'Dark Academia';
      case AppThemeVariant.cyanotypeBlueprint:
        return 'Cyanotype Blueprint';
    }
  }

  String get description {
    switch (this) {
      case AppThemeVariant.classicPaperback:
        return 'Warm vintage cream with crimson red bookmark.';
      case AppThemeVariant.mangaInkpaper:
        return 'Crisp newsprint & deep manga comic ink.';
      case AppThemeVariant.matchaWashi:
        return 'Japanese washi paper with ceremonial matcha.';
      case AppThemeVariant.retroPulpComic:
        return 'Aged yellowed pulp & high-contrast comic strip.';
      case AppThemeVariant.sakuraManuscript:
        return 'Pale sakura cream with vivid blossom crimson.';
      case AppThemeVariant.charcoalLedger:
        return 'Warm charcoal slate with off-white paper ink.';
      case AppThemeVariant.nordicNight:
        return 'Deep arctic midnight slate with fjord cyan.';
      case AppThemeVariant.mangaNoir:
        return 'True pitch black OLED with neon manga red.';
      case AppThemeVariant.darkAcademia:
        return 'Mahogany & leather with candlelight parchment.';
      case AppThemeVariant.cyanotypeBlueprint:
        return 'Drafting navy manuscript with safety orange.';
    }
  }

  bool get isDark {
    switch (this) {
      case AppThemeVariant.classicPaperback:
      case AppThemeVariant.mangaInkpaper:
      case AppThemeVariant.matchaWashi:
      case AppThemeVariant.retroPulpComic:
      case AppThemeVariant.sakuraManuscript:
        return false;
      case AppThemeVariant.charcoalLedger:
      case AppThemeVariant.nordicNight:
      case AppThemeVariant.mangaNoir:
      case AppThemeVariant.darkAcademia:
      case AppThemeVariant.cyanotypeBlueprint:
        return true;
    }
  }

  Color get previewCanvas {
    switch (this) {
      case AppThemeVariant.classicPaperback:
        return const Color(0xFFFCFAED);
      case AppThemeVariant.mangaInkpaper:
        return const Color(0xFFF6F6F6);
      case AppThemeVariant.matchaWashi:
        return const Color(0xFFF7F6EE);
      case AppThemeVariant.retroPulpComic:
        return const Color(0xFFFAF4D3);
      case AppThemeVariant.sakuraManuscript:
        return const Color(0xFFFCF8F8);
      case AppThemeVariant.charcoalLedger:
        return const Color(0xFF12130F);
      case AppThemeVariant.nordicNight:
        return const Color(0xFF0C121E);
      case AppThemeVariant.mangaNoir:
        return const Color(0xFF000000);
      case AppThemeVariant.darkAcademia:
        return const Color(0xFF15100D);
      case AppThemeVariant.cyanotypeBlueprint:
        return const Color(0xFF0A1220);
    }
  }

  Color get previewCard {
    switch (this) {
      case AppThemeVariant.classicPaperback:
        return const Color(0xFFF0EEE2);
      case AppThemeVariant.mangaInkpaper:
        return const Color(0xFFEBEAE5);
      case AppThemeVariant.matchaWashi:
        return const Color(0xFFEBE9DC);
      case AppThemeVariant.retroPulpComic:
        return const Color(0xFFEFE8BE);
      case AppThemeVariant.sakuraManuscript:
        return const Color(0xFFF5EDED);
      case AppThemeVariant.charcoalLedger:
        return const Color(0xFF1E2018);
      case AppThemeVariant.nordicNight:
        return const Color(0xFF151F2E);
      case AppThemeVariant.mangaNoir:
        return const Color(0xFF141414);
      case AppThemeVariant.darkAcademia:
        return const Color(0xFF221A15);
      case AppThemeVariant.cyanotypeBlueprint:
        return const Color(0xFF122036);
    }
  }

  Color get previewAccent {
    switch (this) {
      case AppThemeVariant.classicPaperback:
        return const Color(0xFFBB0114);
      case AppThemeVariant.mangaInkpaper:
        return const Color(0xFFFF3B30);
      case AppThemeVariant.matchaWashi:
        return const Color(0xFF3D6B4F);
      case AppThemeVariant.retroPulpComic:
        return const Color(0xFFDC2626);
      case AppThemeVariant.sakuraManuscript:
        return const Color(0xFFE11D48);
      case AppThemeVariant.charcoalLedger:
        return const Color(0xFFE02929);
      case AppThemeVariant.nordicNight:
        return const Color(0xFF38BDF8);
      case AppThemeVariant.mangaNoir:
        return const Color(0xFFFF2E54);
      case AppThemeVariant.darkAcademia:
        return const Color(0xFFD97706);
      case AppThemeVariant.cyanotypeBlueprint:
        return const Color(0xFFF97316);
    }
  }
}

class AppThemeDetails extends ThemeExtension<AppThemeDetails> {
  final Color canvasColor;
  final Color cardColor;
  final Color cardHighColor;
  final Color inkColor;
  final Color inkMutedColor;
  final Color accentColor;
  final Color secondaryAccent;
  final Color borderColor;
  final double borderHeavy;
  final double borderLight;
  final Offset shadowOffset;
  final Offset shadowOffsetSm;

  const AppThemeDetails({
    required this.canvasColor,
    required this.cardColor,
    required this.cardHighColor,
    required this.inkColor,
    required this.inkMutedColor,
    required this.accentColor,
    required this.secondaryAccent,
    required this.borderColor,
    this.borderHeavy = 3.0,
    this.borderLight = 2.0,
    this.shadowOffset = const Offset(3.5, 3.5),
    this.shadowOffsetSm = const Offset(2.0, 2.0),
  });

  @override
  AppThemeDetails copyWith({
    Color? canvasColor,
    Color? cardColor,
    Color? cardHighColor,
    Color? inkColor,
    Color? inkMutedColor,
    Color? accentColor,
    Color? secondaryAccent,
    Color? borderColor,
    double? borderHeavy,
    double? borderLight,
    Offset? shadowOffset,
    Offset? shadowOffsetSm,
  }) {
    return AppThemeDetails(
      canvasColor: canvasColor ?? this.canvasColor,
      cardColor: cardColor ?? this.cardColor,
      cardHighColor: cardHighColor ?? this.cardHighColor,
      inkColor: inkColor ?? this.inkColor,
      inkMutedColor: inkMutedColor ?? this.inkMutedColor,
      accentColor: accentColor ?? this.accentColor,
      secondaryAccent: secondaryAccent ?? this.secondaryAccent,
      borderColor: borderColor ?? this.borderColor,
      borderHeavy: borderHeavy ?? this.borderHeavy,
      borderLight: borderLight ?? this.borderLight,
      shadowOffset: shadowOffset ?? this.shadowOffset,
      shadowOffsetSm: shadowOffsetSm ?? this.shadowOffsetSm,
    );
  }

  @override
  AppThemeDetails lerp(ThemeExtension<AppThemeDetails>? other, double t) {
    if (other is! AppThemeDetails) return this;
    return AppThemeDetails(
      canvasColor: Color.lerp(canvasColor, other.canvasColor, t)!,
      cardColor: Color.lerp(cardColor, other.cardColor, t)!,
      cardHighColor: Color.lerp(cardHighColor, other.cardHighColor, t)!,
      inkColor: Color.lerp(inkColor, other.inkColor, t)!,
      inkMutedColor: Color.lerp(inkMutedColor, other.inkMutedColor, t)!,
      accentColor: Color.lerp(accentColor, other.accentColor, t)!,
      secondaryAccent: Color.lerp(secondaryAccent, other.secondaryAccent, t)!,
      borderColor: Color.lerp(borderColor, other.borderColor, t)!,
      borderHeavy: borderHeavy,
      borderLight: borderLight,
      shadowOffset: shadowOffset,
      shadowOffsetSm: shadowOffsetSm,
    );
  }
}

class AppTheme {
  static const double borderHeavy = 3.0;
  static const double borderLight = 2.0;
  static const Offset shadowOffset = Offset(3.5, 3.5);
  static const Offset shadowOffsetSm = Offset(2.0, 2.0);

  // Backward compatibility colors
  static const Color paperBg = Color(0xFFFCFAED);
  static const Color paperSurface = Color(0xFFF0EEE2);
  static const Color paperSurfaceHigh = Color(0xFFEAE8DD);
  static const Color inkBlack = Color(0xFF1B1C15);
  static const Color primaryRed = Color(0xFFBB0114);

  static AppThemeDetails getDetails(AppThemeVariant variant) {
    switch (variant) {
      case AppThemeVariant.classicPaperback:
        return const AppThemeDetails(
          canvasColor: Color(0xFFFCFAED),
          cardColor: Color(0xFFF0EEE2),
          cardHighColor: Color(0xFFEAE8DD),
          inkColor: Color(0xFF1B1C15),
          inkMutedColor: Color(0xFF5E5E5E),
          accentColor: Color(0xFFBB0114),
          secondaryAccent: Color(0xFFD97706),
          borderColor: Color(0xFF1B1C15),
        );
      case AppThemeVariant.mangaInkpaper:
        return const AppThemeDetails(
          canvasColor: Color(0xFFF6F6F6),
          cardColor: Color(0xFFEBEAE5),
          cardHighColor: Color(0xFFDFDED8),
          inkColor: Color(0xFF0A0A0A),
          inkMutedColor: Color(0xFF666666),
          accentColor: Color(0xFFFF3B30),
          secondaryAccent: Color(0xFF2563EB),
          borderColor: Color(0xFF0A0A0A),
        );
      case AppThemeVariant.matchaWashi:
        return const AppThemeDetails(
          canvasColor: Color(0xFFF7F6EE),
          cardColor: Color(0xFFEBE9DC),
          cardHighColor: Color(0xFFE2E0CF),
          inkColor: Color(0xFF18231C),
          inkMutedColor: Color(0xFF55665C),
          accentColor: Color(0xFF3D6B4F),
          secondaryAccent: Color(0xFFB8860B),
          borderColor: Color(0xFF18231C),
        );
      case AppThemeVariant.retroPulpComic:
        return const AppThemeDetails(
          canvasColor: Color(0xFFFAF4D3),
          cardColor: Color(0xFFEFE8BE),
          cardHighColor: Color(0xFFE4DCAC),
          inkColor: Color(0xFF0A0A0A),
          inkMutedColor: Color(0xFF5C5446),
          accentColor: Color(0xFFDC2626),
          secondaryAccent: Color(0xFFEAB308),
          borderColor: Color(0xFF0A0A0A),
        );
      case AppThemeVariant.sakuraManuscript:
        return const AppThemeDetails(
          canvasColor: Color(0xFFFCF8F8),
          cardColor: Color(0xFFF5EDED),
          cardHighColor: Color(0xFFECE2E2),
          inkColor: Color(0xFF201A1E),
          inkMutedColor: Color(0xFF6E5D66),
          accentColor: Color(0xFFE11D48),
          secondaryAccent: Color(0xFFDB2777),
          borderColor: Color(0xFF201A1E),
        );
      case AppThemeVariant.charcoalLedger:
        return const AppThemeDetails(
          canvasColor: Color(0xFF12130F),
          cardColor: Color(0xFF1E2018),
          cardHighColor: Color(0xFF2B2D24),
          inkColor: Color(0xFFF6F4E8),
          inkMutedColor: Color(0xFF9E9E9E),
          accentColor: Color(0xFFE02929),
          secondaryAccent: Color(0xFFF59E0B),
          borderColor: Color(0xFFF6F4E8),
        );
      case AppThemeVariant.nordicNight:
        return const AppThemeDetails(
          canvasColor: Color(0xFF0C121E),
          cardColor: Color(0xFF151F2E),
          cardHighColor: Color(0xFF1F2D40),
          inkColor: Color(0xFFE2E8F0),
          inkMutedColor: Color(0xFF94A3B8),
          accentColor: Color(0xFF38BDF8),
          secondaryAccent: Color(0xFFF43F5E),
          borderColor: Color(0xFFE2E8F0),
        );
      case AppThemeVariant.mangaNoir:
        return const AppThemeDetails(
          canvasColor: Color(0xFF000000),
          cardColor: Color(0xFF141414),
          cardHighColor: Color(0xFF222222),
          inkColor: Color(0xFFFFFFFF),
          inkMutedColor: Color(0xFFA3A3A3),
          accentColor: Color(0xFFFF2E54),
          secondaryAccent: Color(0xFF00F0FF),
          borderColor: Color(0xFFFFFFFF),
        );
      case AppThemeVariant.darkAcademia:
        return const AppThemeDetails(
          canvasColor: Color(0xFF15100D),
          cardColor: Color(0xFF221A15),
          cardHighColor: Color(0xFF2E241E),
          inkColor: Color(0xFFEFE3D3),
          inkMutedColor: Color(0xFFA89887),
          accentColor: Color(0xFFD97706),
          secondaryAccent: Color(0xFFB91C1C),
          borderColor: Color(0xFFEFE3D3),
        );
      case AppThemeVariant.cyanotypeBlueprint:
        return const AppThemeDetails(
          canvasColor: Color(0xFF0A1220),
          cardColor: Color(0xFF122036),
          cardHighColor: Color(0xFF1B2E4D),
          inkColor: Color(0xFFE0F2FE),
          inkMutedColor: Color(0xFF7DD3FC),
          accentColor: Color(0xFFF97316),
          secondaryAccent: Color(0xFF38BDF8),
          borderColor: Color(0xFFE0F2FE),
        );
    }
  }

  static ThemeData buildTheme(AppThemeVariant variant) {
    final d = getDetails(variant);
    return _buildThemeFromDetails(d, variant.isDark);
  }

  static ThemeData buildDynamicTheme(ColorScheme dynamicScheme, {required bool isDark}) {
    final d = AppThemeDetails(
      canvasColor: isDark
          ? (dynamicScheme.surfaceContainerLowest)
          : (dynamicScheme.surface),
      cardColor: isDark
          ? (dynamicScheme.surfaceContainerLow)
          : (dynamicScheme.surfaceContainerLowest),
      cardHighColor: isDark
          ? (dynamicScheme.surfaceContainerHigh)
          : (dynamicScheme.surfaceContainerHighest),
      inkColor: isDark ? dynamicScheme.onSurface : AppColors.inkBlack,
      inkMutedColor: isDark ? dynamicScheme.onSurfaceVariant : AppColors.inkMuted,
      accentColor: dynamicScheme.primary,
      secondaryAccent: dynamicScheme.secondary,
      borderColor: isDark ? dynamicScheme.outline : AppColors.inkBlack,
    );

    return _buildThemeFromDetails(d, isDark);
  }

  static ThemeData _buildThemeFromDetails(AppThemeDetails d, bool isDark) {
    final baseTextTheme = isDark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme;

    final textTheme = GoogleFonts.plusJakartaSansTextTheme(baseTextTheme).copyWith(
      headlineLarge: GoogleFonts.lora(
        fontSize: 32,
        fontWeight: FontWeight.w900,
        color: d.inkColor,
        letterSpacing: -0.5,
      ),
      headlineMedium: GoogleFonts.lora(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: d.inkColor,
        letterSpacing: -0.3,
      ),
      titleLarge: GoogleFonts.lora(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: d.inkColor,
      ),
      titleMedium: GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: d.inkColor,
      ),
      bodyLarge: GoogleFonts.plusJakartaSans(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: d.inkColor,
      ),
      bodyMedium: GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: d.inkColor,
      ),
      labelLarge: GoogleFonts.plusJakartaSans(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: d.inkColor,
        letterSpacing: 0.8,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: d.canvasColor,
      cardColor: d.cardColor,
      textTheme: textTheme,
      extensions: [d],
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: d.accentColor,
        onPrimary: Colors.white,
        primaryContainer: d.accentColor.withValues(alpha: 0.2),
        onPrimaryContainer: d.inkColor,
        secondary: d.secondaryAccent,
        onSecondary: Colors.white,
        surface: d.cardColor,
        onSurface: d.inkColor,
        error: const Color(0xFFBA1A1A),
        onError: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: d.canvasColor,
        foregroundColor: d.inkColor,
        elevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
          statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
          systemNavigationBarColor: d.canvasColor,
          systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
        ),
        titleTextStyle: GoogleFonts.lora(
          fontSize: 20,
          fontWeight: FontWeight.w900,
          color: d.inkColor,
          letterSpacing: 0.5,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: d.borderColor,
        thickness: 1.5,
        space: 1.5,
      ),
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.dragged) || states.contains(WidgetState.hovered)) {
            return d.accentColor;
          }
          return d.borderColor.withValues(alpha: isDark ? 0.45 : 0.35);
        }),
        trackColor: WidgetStateProperty.all(Colors.transparent),
        radius: Radius.zero,
        thickness: WidgetStateProperty.all(8.0),
        thumbVisibility: WidgetStateProperty.all(true),
        interactive: true,
      ),
    );
  }

  static ThemeData get lightTheme => buildTheme(AppThemeVariant.classicPaperback);
  static ThemeData get darkTheme => buildTheme(AppThemeVariant.charcoalLedger);
}
