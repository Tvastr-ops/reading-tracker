#!/usr/bin/env bash
set -e

# Target directories
RELEASE_ASSETS_DIR="release-assets"
BUNDLE_DIR="apps/client/build/linux/x64/release/bundle"
DEB_DIR="deb-pkg"

mkdir -p "$RELEASE_ASSETS_DIR"

VERSION_CLEAN="${GITHUB_REF_NAME#v}"
if [ -z "$VERSION_CLEAN" ] || [ "$VERSION_CLEAN" = "main" ] || [ "$VERSION_CLEAN" = "dev" ]; then
  VERSION_CLEAN="1.9.0a"
fi

# Ensure executable permissions on built bundle
chmod +x "$BUNDLE_DIR/paperback_reader"
if [ -d "$BUNDLE_DIR/lib" ]; then
  chmod -R 755 "$BUNDLE_DIR/lib"
fi

# 1. Package Portable .tar.gz with Run Launcher
echo "Packaging portable Linux tarball..."
PORTABLE_DIR="portable-linux"
rm -rf "$PORTABLE_DIR"
mkdir -p "$PORTABLE_DIR"
cp -rL "$BUNDLE_DIR"/* "$PORTABLE_DIR/"

# Portable runner script
cat > "$PORTABLE_DIR/run.sh" << 'EOF'
#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="${SCRIPT_DIR}/lib:${LD_LIBRARY_PATH}"
cd "${SCRIPT_DIR}"
exec "${SCRIPT_DIR}/paperback_reader" "$@"
EOF
chmod 755 "$PORTABLE_DIR/run.sh"

tar -hczf "$RELEASE_ASSETS_DIR/paperback-v${VERSION_CLEAN}-linux-x64.tar.gz" -C "$PORTABLE_DIR" .
rm -rf "$PORTABLE_DIR"

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
StartupWMClass=paperback_reader
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

echo "Linux packages created successfully in $RELEASE_ASSETS_DIR:"
ls -lh "$RELEASE_ASSETS_DIR"
