package com.readingtracker.mobile

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        applySplashThemeFromPrefs()
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        applySplashThemeFromPrefs()
    }

    private fun applySplashThemeFromPrefs() {
        try {
            val prefs = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            val themeMode = prefs.getString("flutter.app_theme_mode", "system")
            val isDark = when (themeMode) {
                "dark" -> true
                "light" -> false
                else -> {
                    val nightModeFlags = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
                    nightModeFlags == Configuration.UI_MODE_NIGHT_YES
                }
            }

            val hexColor = if (isDark) {
                val darkVariant = prefs.getString("flutter.app_theme_dark_variant", "charcoalLedger")
                when (darkVariant) {
                    "nordicNight" -> "#0F172A"
                    "darkAcademia" -> "#1C1917"
                    "cyanotypeBlueprint" -> "#0B132B"
                    "midnightVelvet" -> "#090D16"
                    else -> "#0E100D" // charcoalLedger
                }
            } else {
                val lightVariant = prefs.getString("flutter.app_theme_light_variant", "classicPaperback")
                when (lightVariant) {
                    "matchaWashi" -> "#F7F6EE"
                    "retroPulpComic" -> "#FDFBF7"
                    "sakuraManuscript" -> "#FFF5F5"
                    "mangaInkpaper" -> "#F8F9FA"
                    else -> "#FCFAED" // classicPaperback
                }
            }

            val parsedColor = Color.parseColor(hexColor)
            window.setBackgroundDrawable(ColorDrawable(parsedColor))
            window.decorView.setBackgroundColor(parsedColor)
        } catch (_: Exception) {
            // Gracefully fallback to default system splash theme
        }
    }
}
