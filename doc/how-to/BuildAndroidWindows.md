# How-To: Compile Android APK & Windows Desktop Binaries

This guide provides the exact recipe for compiling release binaries for Android and Windows from the `apps/client` Flutter codebase.

---

## 📋 Prerequisites
* **Flutter SDK** `>= 3.19.0` ([Flutter Installation Guide](https://docs.flutter.dev/get-started/install))
* **Java JDK** `>= 17` (for Android builds)
* **Android SDK & Command-line Tools** (installed via Android Studio or sdkmanager)
* **Visual Studio 2022** with "Desktop development with C++" workload (for Windows desktop builds)

---

## 📱 Compiling Android Release APK

### 1. Navigate to the Client Workspace
```bash
cd apps/client
```

### 2. Verify Flutter Dependencies
```bash
flutter pub get
```

### 3. Generate App Icons (Optional)
If you updated the application brand icon in `assets/icon.png`:
```bash
dart run flutter_launcher_icons
```

### 4. Build the Release APK
```bash
# Build universal release APK
flutter build apk --release

# Or: Build split per-ABI APKs (smaller file size for ARM64 devices)
flutter build apk --split-per-abi --release
```

### 5. Output Location
Your compiled Android APK will be located at:
```text
apps/client/build/app/outputs/flutter-apk/app-release.apk
```
Transfer this file to your Android phone and install it directly!

---

## 💻 Compiling Windows Desktop Release (`.exe`)

### 1. Enable Windows Desktop Support
```bash
flutter config --enable-windows-desktop
```

### 2. Build the Windows Release Executable
```bash
cd apps/client
flutter build windows --release
```

### 3. Output Location
Your compiled Windows application bundle will be located at:
```text
apps/client/build/windows/x64/runner/Release/
```
The folder contains `reading_tracker_app.exe` alongside all required DLL dependencies and assets. You can zip this folder to distribute it or run the executable directly on any Windows 10/11 machine.

---

## ⚙️ Automated GitHub Actions Workflow
The repository includes a multi-platform CI/CD workflow ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) that automatically compiles and uploads Android APK artifacts on every tag release!
