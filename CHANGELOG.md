# Changelog

All notable changes to the Paperback Reading Tracker ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to the [Project Release Versioning Specification](.gemini/rules/versioning.md).

---

## [1.7.0b] - 2026-08-18

### Added
- **Tactile Paper Texture & Stationery Canvas Engine**: Hardware-accelerated procedural patterns (architectural dot-grid, Japanese washi fibers, book paper grain, manuscript grid, and halftone speckles) across all 16 theme variants.
- **Paper Texture Setting**: Toggle switch in Display & Layout preferences to enable or disable tactile canvas textures.

---

## [1.7.0a] - 2026-08-18

### Changed
- **Settings Theme Selector UX**: Removed intrusive hover tooltips over theme swatches and added a clean, tactile footer description container inside the palette section.
- **Universal Monorepo Support**: Added root `workspaces` in `package.json` for seamless `pnpm`, `bun`, and `npm` local development.
- **Diátaxis Documentation Suite**: Restructured technical documentation into PascalCase directories (`tutorials`, `how-to`, `reference`, `explanation`, `roadmap`) with visual callouts and Docker self-hosting guides.

---

## [1.7.0] - 2026-08-18

### Added
- **8 Symmetrical Thematic Pairs (16 Themes Total)**: Complete overhaul of the theme system in the Flutter companion app, pairing every light theme with its exact dark twin.
- **Crumpled Kraft & Charred Papyrus**: Brand new 8th theme pair featuring tactile unbleached paper and black papyrus slate with terracotta wax seal accents.
- **Responsive Theme Swatch Grid**: Replaced vertical theme selection cards with a responsive 2-column (mobile) / 4-column (tablet & desktop) swatch grid with triple-color live previews (`[ Canvas ] [ Card ] [ Accent ]`).
- **Dynamic Versioning via `package_info_plus`**: Automated runtime app version resolution from `pubspec.yaml`, removing all hardcoded version strings.
- **GitHub Release Update Checker**: Built-in `UpdateService` that checks the GitHub API for newer releases and flags updates in the About section.
- **Migration v11 (`migration_v11_smart_updated_at.sql`)**: Smart PostgreSQL trigger that preserves book shelf ordering when toggling favorites and respects explicitly passed historical timestamps.
- **Animated Vector Header Banner**: W3C SMIL-animated SVG banner with floating book iconography and live blinking terminal cursor.

### Changed
- **Shelf Order Preservation on Favorites**: Toggling the favorite heart in both the Next.js Web App and Flutter Client now keeps books in their exact shelf position without bumping `updated_at`.
- **Theme Color Accents**: Refined signature accents for *Manga Inkpaper* (Deep Cobalt Ink) and *Retro Pulp* (Goldenrod Amber).
- **Migration File Renaming**: Padded all migration filenames to 2-digits (`migration_v02.sql` – `migration_v11_...`) for clean chronological sorting on GitHub.
- **Project-Wide Package Upgrades**: Upgraded `package_info_plus` to `^10.2.1` and `flutter_displaymode` to `^0.7.0`.

### Fixed
- Fixed issue where clicking favorite on an older completed book scrambled the user's "Recently Active" reading shelf.
- Fixed Biome formatting across Web API routes and hooks.

---

## [1.6.0] - 2026-08-16

### Added
- **Multi-Tier Progression System**: Complete support for Volume ➔ Chapter hierarchies, continuous chapter tracking, and per-volume chapter resets.
- **Ongoing Serializations**: Catching up tracking with dynamic *"Caught Up"* and *"Chapters Behind"* indicators for ongoing web novels and manga.
- **Atomic Progress RPC (`record_progress`)**: PostgreSQL function in `migration_v09_progress_rpc.sql` performing atomic progress updates, log insertions, and velocity calculations in a single transaction.
- **Progression Metric Constraints**: Database-level check constraints (`migration_v10_progression_checks.sql`) preventing negative progress, negative totals, and progress exceeding boundaries.

### Changed
- Refactored Web progress dialog to intelligently adapt input fields based on unit type and publication structure.
- Enhanced Flutter reading log dialog with quick progress chips (`+1`, `+5`, `+10`, `+25`).

---

## [1.5.0] - 2026-08-10

### Added
- **Reading Pace & Velocity Engine**: Live calculation of reading speed (`chapters/day` or `pages/day`) based on timestamped reading log history.
- **Annual Goal & Pace Forecasting**: Visual annual reading goal tracker with dynamic monthly target pace calculations.
- **Rating Distribution Charts**: Visual breakdowns for 5-star half-step and decimal ratings.

---

## [1.4.0] - 2026-08-01

### Added
- **Two-Way Offline Sync Engine**: Background `SyncManager` in Flutter with SQLite mutation queue (`sync_queue`) supporting automatic retry, offline queueing, and last-write-wins resolution.
- **Direct Supabase Cloud Sync**: Direct mobile-to-cloud synchronization bypassing the web server via Row Level Security (`migration_v08_rls.sql`).

---

## [1.0.0] - 2026-07-24

### Added
- **Initial Release of Paperback Reading Tracker**:
  - Next.js 16 Web Dashboard with Serverless API routes and Tailwind CSS.
  - Cross-platform Flutter companion client app for Android, Windows, and Linux.
  - PostgreSQL database schema with `books`, `reading_log`, and `app_settings` tables.
  - Open Library cover image search integration.
  - CSV bulk import and export with formula injection sanitization.
  - Session authentication with HttpOnly JWT cookies (`jose`).
