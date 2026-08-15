# Paperback Reader Client (Flutter)

A modern reading tracker client built with **Flutter & Dart 3**, targeting **Android, Web, Windows, and Linux**. Built with a **Neo-Paper Brutalist** aesthetic and full feature parity with the Reading Tracker Next.js web application.

---

## Key Features

- **Platform Targets**:
  - **Mobile**: Android (API 21+).
  - **Web**: Progressive Web App & modern browsers (with full mobile Safari/iOS PWA support).
  - **Desktop**: Windows & Linux desktop apps with native `sqflite_common_ffi` SQLite database support.
- **Neo-Paper Brutalist Design System**:
  - Tactile paper-first aesthetic (`#FCFAED` warm cream canvas) with crisp high-contrast borders and `3.5px` solid drop shadows.
  - Switchable between **Paper Light** and **Brutalist Dark** themes.
  - Tactile action feedback on cards, increment chips, and buttons.
- **Pluggable & Modular Remote Sync Architecture**:
  - **Supabase**: Connect directly to Supabase PostgreSQL cloud sync.
  - **Self-Hosted REST Server**: Configure your own custom server endpoint (`/api/books`, `/api/books/{id}/log`) and API key.
  - **Offline-Only Mode**: Pause all network operations and run exclusively on device SQLite storage.
  - Live connection status indicators and 1-tap **Sync Now** action.
- **Multi-Tier & Serialization Support**:
  - **Volumes + Chapters**: Track Volume and Chapter progression for Light Novels.
  - **Parts + Chapters**: Multi-part tracking for Web Novels and serial publications.
  - **Ongoing Serialization Tracker**: Live caught-up status badges vs latest released chapter.
- **Full Library Management**:
  - Status tabs: *All, Reading, Plan to Read, Completed, On Hold, Dropped*.
  - Fast search by title and author.
  - Quick increment steppers (+1, +5, +10, etc.).
  - Open Library Cover Search integration.
  - Reading log history with timestamped notes.
  - Soft-delete Trash management (Restore & Permanent Purge).
- **Analytics & Yearly Goals**:
  - 2026 Yearly reading goal gauge.
  - Format distribution breakdown (Novels, Light Novels, Web Novels, Non-Fiction).
  - Average ratings & status metrics.

---

## Getting Started

### Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (`>=3.19.0`)
- Android Studio / Xcode / Chrome / Visual Studio (for Windows) / Build Essentials (for Linux)

### Installation & Run

```bash
# 1. Navigate to the client app directory
cd apps/client

# 2. Install dependencies
flutter pub get

# 3. Run on connected device, browser, or desktop
flutter run -d chrome     # Web Preview
flutter run -d windows    # Windows Desktop App
flutter run -d linux      # Linux Desktop App
flutter run -d android    # Android Device / Emulator
```

### Running Unit Tests

```bash
flutter test
```
