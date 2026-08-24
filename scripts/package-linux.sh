#!/usr/bin/env bash
set -e

# Target directories
RELEASE_ASSETS_DIR="release-assets"
BUNDLE_DIR="apps/client/build/linux/x64/release/bundle"
DEB_DIR="deb-pkg"

mkdir -p "$RELEASE_ASSETS_DIR"

VERSION_CLEAN="${GITHUB_REF_NAME#v}"
if [ -z "$VERSION_CLEAN" ] || [ "$VERSION_CLEAN" = "main" ] || [ "$VERSION_CLEAN" = "dev" ]; then
  VERSION_CLEAN="2.0.0"
fi

# Failsafe: Verify and guarantee data/flutter_assets is present in the release bundle
if [ ! -d "$BUNDLE_DIR/data/flutter_assets" ]; then
  echo "data/flutter_assets missing from bundle; syncing from build/flutter_assets..."
  mkdir -p "$BUNDLE_DIR/data"
  if [ -d "apps/client/build/flutter_assets" ]; then
    cp -rL "apps/client/build/flutter_assets" "$BUNDLE_DIR/data/"
  elif [ -d "build/flutter_assets" ]; then
    cp -rL "build/flutter_assets" "$BUNDLE_DIR/data/"
  fi
fi

# Collect all compiled plugin shared libraries (.so) from build trees into bundle/lib
mkdir -p "$BUNDLE_DIR/lib"
if [ -d "apps/client/build/linux/x64/release" ]; then
  find apps/client/build/linux/x64/release/ -type f -name "*.so*" -exec cp -L {} "$BUNDLE_DIR/lib/" \; 2>/dev/null || true
elif [ -d "build/linux/x64/release" ]; then
  find build/linux/x64/release/ -type f -name "*.so*" -exec cp -L {} "$BUNDLE_DIR/lib/" \; 2>/dev/null || true
fi

# Bundle standalone libsqlite3.so into lib/ if available on build host
for sqlite_path in /usr/lib/x86_64-linux-gnu/libsqlite3.so.0 /usr/lib/libsqlite3.so.0 /lib/x86_64-linux-gnu/libsqlite3.so.0; do
  if [ -f "$sqlite_path" ]; then
    echo "Bundling $sqlite_path into bundle/lib/libsqlite3.so.0..."
    cp -L "$sqlite_path" "$BUNDLE_DIR/lib/libsqlite3.so.0"
    (cd "$BUNDLE_DIR/lib" && ln -sf "libsqlite3.so.0" "libsqlite3.so") || true
    break
  fi
done

# Ensure executable permissions on built bundle and all shared libraries
chmod +x "$BUNDLE_DIR/paperback_reader"
if [ -d "$BUNDLE_DIR/lib" ]; then
  chmod -R 755 "$BUNDLE_DIR/lib"
fi

# 1. Package Portable .tar.gz with Run Launcher (inside a clean root directory)
echo "Packaging portable Linux tarball..."
PORTABLE_STAGING="portable-linux"
PORTABLE_ROOT="$PORTABLE_STAGING/paperback-reader"
rm -rf "$PORTABLE_STAGING"
mkdir -p "$PORTABLE_ROOT"
cp -rL "$BUNDLE_DIR"/* "$PORTABLE_ROOT/"

# Portable runner script
cat > "$PORTABLE_ROOT/run.sh" << 'EOF'
#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="${SCRIPT_DIR}/lib:${LD_LIBRARY_PATH}"
export FLUTTER_ENGINE_SWITCHES="${FLUTTER_ENGINE_SWITCHES:-1}"
export FLUTTER_ENGINE_SWITCH_1="${FLUTTER_ENGINE_SWITCH_1:-enable-impeller=false}"
cd "${SCRIPT_DIR}"
exec "${SCRIPT_DIR}/paperback_reader" "$@"
EOF
chmod 755 "$PORTABLE_ROOT/run.sh"

tar -hczf "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-x64.tar.gz" -C "$PORTABLE_STAGING" paperback-reader
rm -rf "$PORTABLE_STAGING"

# 2. Package Native .deb Package
echo "Packaging native Debian (.deb) package..."

rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/usr/lib/paperback-reader"
mkdir -p "$DEB_DIR/usr/bin"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/512x512/apps"

# Copy binaries and bundle assets (dereference symlinks to ensure physical .so files)
cp -rL "$BUNDLE_DIR"/* "$DEB_DIR/usr/lib/paperback-reader/"

# Ensure proper permissions across the package
find "$DEB_DIR/usr/lib/paperback-reader" -type d -exec chmod 755 {} +
find "$DEB_DIR/usr/lib/paperback-reader" -type f -exec chmod 644 {} +
chmod 755 "$DEB_DIR/usr/lib/paperback-reader/paperback_reader"
if [ -d "$DEB_DIR/usr/lib/paperback-reader/lib" ]; then
  chmod -R 755 "$DEB_DIR/usr/lib/paperback-reader/lib"
fi

# Robust wrapper executable setting LD_LIBRARY_PATH and CWD
cat > "$DEB_DIR/usr/bin/paperback-reader" << 'EOF'
#!/bin/sh
APP_DIR="/usr/lib/paperback-reader"
export LD_LIBRARY_PATH="${APP_DIR}/lib:${LD_LIBRARY_PATH}"
export FLUTTER_ENGINE_SWITCHES="${FLUTTER_ENGINE_SWITCHES:-1}"
export FLUTTER_ENGINE_SWITCH_1="${FLUTTER_ENGINE_SWITCH_1:-enable-impeller=false}"
cd "${APP_DIR}"
exec "${APP_DIR}/paperback_reader" "$@"
EOF
chmod 755 "$DEB_DIR/usr/bin/paperback-reader"

# Desktop entry
cat > "$DEB_DIR/usr/share/applications/paperback-reader.desktop" << 'EOF'
[Desktop Entry]
Name=Paperback Reader
Comment=A tactile, offline-first reading ledger for novels, light novels, and web serials
Exec=/usr/bin/paperback-reader %u
Icon=paperback-reader
Terminal=false
Type=Application
Categories=Utility;Office;Literature;
StartupWMClass=com.readingtracker.app
EOF
chmod 644 "$DEB_DIR/usr/share/applications/paperback-reader.desktop"

# App icon
if [ -f apps/client/assets/icon.png ]; then
  cp apps/client/assets/icon.png "$DEB_DIR/usr/share/icons/hicolor/512x512/apps/paperback-reader.png"
  chmod 644 "$DEB_DIR/usr/share/icons/hicolor/512x512/apps/paperback-reader.png"
fi

# Debian control metadata with modern Ubuntu 24.04 (t64) & Debian compatibility
cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: paperback-reader
Version: $VERSION_CLEAN
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Paperback Reader <noreply@github.com>
Depends: libgtk-3-0 (>= 3.0.0) | libgtk-3-0t64, libsqlite3-0 | libsqlite3-0t64, liblzma5, libglib2.0-0 | libglib2.0-0t64, libepoxy0
Description: Paperback Reader
 A tactile, offline-first reading ledger for novels, light novels, and web serials.
EOF
chmod 644 "$DEB_DIR/DEBIAN/control"

dpkg-deb --build --root-owner-group "$DEB_DIR" "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-amd64.deb"
rm -rf "$DEB_DIR"

# 3. Package Standalone Universal AppImage (.AppImage)
echo "Packaging standalone universal AppImage..."
APPDIR="AppDir"
rm -rf "$APPDIR"
mkdir -p "$APPDIR"
cp -rL "$BUNDLE_DIR"/* "$APPDIR/"

# AppRun entrypoint
cat > "$APPDIR/AppRun" << 'EOF'
#!/bin/sh
APPDIR="$(dirname "$(readlink -f "$0")")"
export LD_LIBRARY_PATH="${APPDIR}/lib:${LD_LIBRARY_PATH}"
export FLUTTER_ENGINE_SWITCHES="${FLUTTER_ENGINE_SWITCHES:-1}"
export FLUTTER_ENGINE_SWITCH_1="${FLUTTER_ENGINE_SWITCH_1:-enable-impeller=false}"
cd "${APPDIR}"
exec "${APPDIR}/paperback_reader" "$@"
EOF
chmod 755 "$APPDIR/AppRun"

# AppImage root desktop entry and icons
if [ -f apps/client/assets/icon.png ]; then
  cp apps/client/assets/icon.png "$APPDIR/paperback-reader.png"
  (cd "$APPDIR" && ln -sf paperback-reader.png .DirIcon) || true
fi

cat > "$APPDIR/paperback-reader.desktop" << 'EOF'
[Desktop Entry]
Name=Paperback Reader
Comment=A tactile, offline-first reading ledger for novels, light novels, and web serials
Exec=paperback_reader %u
Icon=paperback-reader
Terminal=false
Type=Application
Categories=Utility;Office;Literature;
StartupWMClass=com.readingtracker.app
EOF
chmod 644 "$APPDIR/paperback-reader.desktop"

# Download and invoke appimagetool (using extract-and-run for non-FUSE CI compatibility)
if [ ! -f "appimagetool" ]; then
  echo "Downloading appimagetool..."
  curl -sSL -o appimagetool "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" || true
  chmod +x appimagetool 2>/dev/null || true
fi

if [ -x "appimagetool" ]; then
  echo "Building AppImage binary..."
  ARCH=x86_64 ./appimagetool --appimage-extract-and-run "$APPDIR" "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-x86_64.AppImage" || true
  if [ -f "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-x86_64.AppImage" ]; then
    chmod +x "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-x86_64.AppImage"
    echo "AppImage created successfully!"
  fi
fi
rm -rf "$APPDIR"

echo "Linux packages created successfully in $RELEASE_ASSETS_DIR:"
ls -lh "$RELEASE_ASSETS_DIR"
