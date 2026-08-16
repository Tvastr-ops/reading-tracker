#!/usr/bin/env bash
set -e

# Target directories
RELEASE_ASSETS_DIR="release-assets"
BUNDLE_DIR="apps/client/build/linux/x64/release/bundle"
DEB_DIR="deb-pkg"

mkdir -p "$RELEASE_ASSETS_DIR"

# 1. Package Portable .tar.gz
echo "Packaging portable Linux tarball..."
tar -czf "$RELEASE_ASSETS_DIR/reading-tracker-linux-x64.tar.gz" -C "$BUNDLE_DIR" .

# 2. Package Native .deb Package
echo "Packaging native Debian (.deb) package..."
VERSION_CLEAN="${GITHUB_REF_NAME#v}"
if [ -z "$VERSION_CLEAN" ] || [ "$VERSION_CLEAN" = "main" ] || [ "$VERSION_CLEAN" = "dev" ]; then
  VERSION_CLEAN="1.1.0"
fi

rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/usr/lib/paperback-reader"
mkdir -p "$DEB_DIR/usr/bin"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/512x512/apps"

# Copy binaries and bundle assets
cp -r "$BUNDLE_DIR"/* "$DEB_DIR/usr/lib/paperback-reader/"
chmod +x "$DEB_DIR/usr/lib/paperback-reader/paperback_reader"

# Wrapper executable
cat > "$DEB_DIR/usr/bin/paperback-reader" << 'EOF'
#!/bin/sh
exec /usr/lib/paperback-reader/paperback_reader "$@"
EOF
chmod 755 "$DEB_DIR/usr/bin/paperback-reader"

# Desktop entry
cat > "$DEB_DIR/usr/share/applications/paperback-reader.desktop" << 'EOF'
[Desktop Entry]
Name=Paperback Reader
Comment=A tactile, offline-first reading ledger for novels, light novels, and web serials
Exec=paperback-reader %u
Icon=paperback-reader
Terminal=false
Type=Application
Categories=Utility;Office;Literature;
StartupWMClass=paperback_reader
EOF
chmod 644 "$DEB_DIR/usr/share/applications/paperback-reader.desktop"

# App icon
cp apps/client/assets/icon.png "$DEB_DIR/usr/share/icons/hicolor/512x512/apps/paperback-reader.png"

# Debian control metadata
cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: paperback-reader
Version: $VERSION_CLEAN
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Paperback Reader <noreply@github.com>
Depends: libgtk-3-0, libsqlite3-0
Description: Paperback Reader
 A tactile, offline-first reading ledger for novels, light novels, and web serials.
EOF

dpkg-deb --build --root-owner-group "$DEB_DIR" "$RELEASE_ASSETS_DIR/reading-tracker-linux-amd64.deb"
echo "Linux packages created successfully in $RELEASE_ASSETS_DIR:"
ls -lh "$RELEASE_ASSETS_DIR"
