# Build Android & Windows Binaries

Instructions for compiling release binaries for Android and Windows from `apps/client`.

---

## Prerequisites

* **Flutter SDK** `>= 3.19.0`
* **Java JDK** `>= 17` (Android)
* **Android SDK & Build Tools**
* **Visual Studio 2022** with C++ desktop development workload (Windows)

---

## Android Release Build

### 1. Resolve Dependencies
```bash
cd apps/client
flutter pub get
```

### 2. Compile APK
```bash
# Universal release APK
flutter build apk --release

# Or: Per-ABI split APKs (recommended for smaller binary size)
flutter build apk --split-per-abi --release
```

### 3. Binary Location
```text
apps/client/build/app/outputs/flutter-apk/app-release.apk
```

> [!TIP]
> Using `--split-per-abi` generates targeted APKs (`app-arm64-v8a-release.apk`), reducing the install file size by up to 60%.

---

## Windows Desktop Release Build

### 1. Enable Windows Support
```bash
flutter config --enable-windows-desktop
```

### 2. Compile Executable
```bash
cd apps/client
flutter build windows --release
```

### 3. Binary Location
```text
apps/client/build/windows/x64/runner/Release/
```
The output directory contains `reading_tracker_app.exe` alongside required DLL dependencies and assets.
