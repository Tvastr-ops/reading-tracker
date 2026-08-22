# Changelog

All notable changes to the Paperback Reading Tracker ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to the [Project Release Versioning Specification](.gemini/rules/versioning.md).

## [1.9.0d] - 2026-08-22

### Added
- **Universal Standalone Linux AppImage (`.AppImage`)**: Added single-file executable AppImage distribution bundled with `appimagetool` and zero-dependency execution across any Linux distribution without installation.
- **Standalone `libsqlite3.so` Bundling**: Embedded standalone SQLite database engine directly into Linux `lib/` directory for resilient offline local storage without requiring host OS packages.
- **Universal Plugin `.so` Library Harvest**: Automated scanning and bundling of all compiled plugin shared libraries (`dynamic_color`, `window_manager`, `url_launcher`) into release bundles.
- **Dedicated Reading Volume by Unit Breakdown**: Added a dedicated Stats section dynamically rendering exact volumes read for **Pages**, **Chapters**, **Volumes**, and **Words** queried entirely from local SQLite log history.
- **Theme-Adaptive On-Track Indicator & Trend Badges**: Upgraded Goal Card with high-contrast tactile stamp badges, trend icons (`▲ +X AHEAD`, `● ON TRACK`, `▼ X BEHIND`, `🏆 GOAL ACHIEVED`), and full theme color synchronization.
- **Dual-Metric Reading Velocity & Forecast Dashboard**: Redesigned velocity card into a dual rate meter displaying Monthly completion rate, Weekly pace, and year-end projections.

### Fixed
- **Linux `flutter_assets` Runtime Bundle**: Added missing CMake install directive in `runner/CMakeLists.txt` and packaging failsafe to ensure all fonts, asset manifests, Dart bytecode, and UI assets are fully bundled into Linux `.deb`, `.tar.gz`, and `.AppImage` packages.
- **Portable Tarball Directory Hierarchy**: Enclosed portable Linux `.tar.gz` archive in a root `paperback-reader/` directory to prevent in-place extraction clutter.

---

## [1.9.0c] - 2026-08-22

### Added
- **12-Month Neo-Brutalist Activity Bar Chart**: Added visual completion history across all 12 months with proportional pillars, dynamic scaling to peak reading months, active month highlights, and interactive tap inspection.
- **3-Way Stacked Metric Distribution**: Added switchable minimal stamp tabs on Stats screen supporting **Formats**, **Genres** (dynamically aggregated from `genre_tags`), and **Ratings** (5★ to 1★ spectrum breakdown).
- **Cumulative Units Read Metric**: Added high-level analytics tracking total volume logged (`pages`/`chapters`) from SQLite `reading_log` history.
- **Goal Health Pace Status**: Added instant status badges (`ON TRACK`, `+X AHEAD`, `X BEHIND`, `GOAL ACHIEVED! 🏆`).
- **Tactile `BrutalistSwitch` Control**: Replaced all generic Material round switches across Settings with custom rectangular mechanical sliding blocks featuring solid ink borders and hard brutalist drop-shadows.
- **Dynamic Library Genre Suggestions**: Added real-time genre tag suggestions in `BookEditDialog` queried directly from local SQLite database ordered by usage frequency, falling back to 21 curated canonical genre seeds.
- **Canonical Genre Normalization & Synonym Mapping**: Added `normalizeGenreTag` in Dart and TypeScript to automatically merge genre synonyms (e.g., `Science Fiction` / `scifi` $\rightarrow$ `Sci-Fi`, `lit-rpg` $\rightarrow$ `LitRPG`, `sol` $\rightarrow$ `Slice of Life`, `xianxia` $\rightarrow$ `Cultivation`) across both stats distribution and editing dialogs.
- **Extended Book Edit Form Sections**: Added explicit form fields in `BookEditDialog` for **Section 5: GENRES & TAGS** and **Section 6: NOTES & SOURCE LINK**.

---

## [1.9.0b] - 2026-08-22

### Added
- **Dynamic Color 2.1.0 & Dependency Refresh**: Upgraded `dynamic_color` to `^2.1.0`, `sqlite3` to `3.5.2`, `path_provider_foundation` to `2.6.0`, `archive` to `4.1.0`, `image` to `4.9.2`, and `vm_service` to `15.3.0`.
- **Desktop Smooth Inertial Scroll Physics**: Configured custom desktop scroll behavior with smooth continuous deceleration and multi-pointer drag capabilities (`mouse`, `touch`, `trackpad`, `stylus`).
- **Downscaled Image Decode Caching**: Added bounded `cacheWidth` across all book cards, cover views, carousels, detail panels, and table rows, reducing GPU texture memory usage by over 80% and eliminating scroll stutter on high refresh rate monitors.

### Fixed
- **Instant Desktop Sync Reloads**: Registered `SyncManager` listeners on `LibraryScreen` and `StatsScreen` so changes synced from Web or background heartbeats render on screen immediately without requiring an app restart.
- **Unpolluted Reading Log Notes**: Cleaned up Web API `/api/books/[id]` and inspector handlers to avoid injecting redundant auto-generated text notes, preserving unified numerical transitions across Web and Client.
- **Sync Safety & Wipe Protection**: Guarded `cleanupMissingRemoteBooks` against transient empty network responses and enabled error stack logging on sync interruptions.
- **Cross-Device Pace Synchronization**: Added `recalculatePaceForBooks` to keep reading velocities accurate across multiple devices upon receiving remote logs.

---

## [1.9.0a] - 2026-08-22

### Added
- **Pure Progression Domain Engine (`progression_logic.dart`)**: Established 1:1 progression domain parity with the Web application, automating lifecycle status normalization (`dateStarted`, `dateFinished`, auto-filling completed progress, and clearing `isOngoing`).
- **Offline Reading Pace Computation**: Calculates weekly reading velocity (`units/week`) directly from SQLite log history matching PostgreSQL RPC formulas.
- **Max 3-Letter Format Tags & Ultra-Compact Units**: Optimized format badges to strictly $\le 3$ characters in compact mode (`NOV`, `NVL`, `NVT`, `LN`, `WN`, `SS`, `COL`, `ANT`, `ESY`, `FF`, `OTH`), retained full labels in comfortable mode, and standardized volume prefix notation (`Vol. 0 / 17` / `V.0/17`) and `pg` unit shorthand (`120/350 pg`).

### Fixed
- **Web API Idempotent Log Upsert**: Updated `POST /api/books/[id]/log` to respect client-provided UUIDs, eliminating duplicate reading log generation and timeline duplication across Generic REST connections.
- **SQLite Self-Healing Deduplication**: Added time-window reconciliation in `DatabaseHelper.upsertRemoteReadingLog` to automatically purge legacy duplicate records upon cloud sync.
- **Linux Desktop Launch Wrapper & Dependencies**: Fixed Linux installation execution failure by adding working directory and `LD_LIBRARY_PATH` configuration to the `/usr/bin/paperback-reader` wrapper script, updating `.deb` metadata to support modern Ubuntu 24.04 (`t64`) / Debian transitions, and including a standalone `run.sh` launcher in the portable `.tar.gz`.

---

## [1.9.0] - 2026-08-19

### Added
- **Compact Cover View Shorthands**: Implemented uniform neo-brutalist acronyms for all 11 publication formats (`NOV`, `NVLA`, `NVLT`, `LN`, `WN`, `SS`, `COLL`, `ANTH`, `ESY`, `FF`, `OTH`).
- **Compact Progress Formatting**: Added streamlined progress text on compact cover cards (`Ch. 1450 • Up`, `V.14 • Ch. 42/50`, `0 / 300 p`), micro-padding adjustments, and proportional typography.

### Fixed
- **Mobile Edit Dialog Overflow**: Added `clipBehavior: Clip.antiAlias` to the dialog container and responsive padding / sizing to the action footer buttons (`TRASH`, `CANCEL`, `SAVE CHANGES`), ensuring the modal never overflows on narrow mobile screens.

---

## [1.8.0f] - 2026-08-19

### Fixed
- **Client-Side Permanent Deletion Execution**: Added immediate `SyncManager.instance.syncNow()` invocation upon clicking permanent delete / restore in `TrashScreen`, ensuring durable deletion tombstones are immediately sent to the cloud backend.
- **Web API Permanent Deletion Handler**: Fixed `DELETE /api/books/[id]` treating `?permanent=true` as soft-delete, and ensured child `reading_log` entries are purged before deleting the parent book row.
- **Supabase Direct Delete Headers**: Removed `Prefer: resolution=merge-duplicates` conflict header on Supabase direct `DELETE` requests, and ensured child reading logs are purged.
- **Broad Duplicate Title Reconciliation**: Updated SQLite `upsertRemoteBook` to proactively delete any duplicate local records with matching titles upon cloud receipt.

---

## [1.8.0e] - 2026-08-19

### Added
- **5-Minute Periodic Auto-Sync Heartbeat**: Added background heartbeat timer in `SyncManager` ensuring long-running desktop and mobile sessions automatically pull external updates without requiring window focus or manual interaction.

---

## [1.8.0d] - 2026-08-19

### Fixed
- **Cross-Client Soft Delete Synchronization**: Removed `deleted_at=is.null` query filters on remote book fetches in `SupabaseSyncProvider` and `GenericRestSyncProvider`, ensuring soft-deleted / trash books update their `deleted_at` timestamp across all connected clients.
- **Permanent Deletion Remote Cleanup**: Added `cleanupMissingRemoteBooks` in `DatabaseHelper` and `SyncManager` to automatically purge local synced records when they are permanently removed from the remote database or web trash.

---

## [1.8.0c] - 2026-08-19

### Fixed
- **Mobile Table View Streamlining**: Overhauled `BookTableRow` on mobile to a clean 2-line layout with full $252\text{px}$ title width, inline format + author/progress sentence, full-width progress bar, and large tactile `+$quickAmt` stepper, eliminating button clutter and badge pileup on 360px–410px devices.
- **Cards View Progress Overflow**: Protected progress counter text in `BookCard` with responsive `Expanded` and ellipsis handling.
- **Sync Duplicate & ID Preservation**: Fixed REST API `/api/books` stripping client UUIDs during creation, which previously led to duplicate entries upon sync. Added client-side ID remapping and automatic duplicate cleanup.
- **Direct Supabase Sync Constraint Compliance**: Added safe defaults and rating sanitization in `Book.toRemoteMap()` so new book insertions strictly comply with PostgreSQL check constraints and `NOT NULL` requirements.

---

## [1.8.0b] - 2026-08-19

### Fixed
- **Cover View 100% Progress Text Width**: Granted 100% of horizontal overlay width to the chapter/page counter in `BookCoverCard` by relying on the brutalist progress bar for completion percentage, preventing any text truncation on 3-column mobile screens.

---

## [1.8.0a] - 2026-08-19

### Changed
- **Paper Texture Opacity & Hairlines**: Tuned pattern opacities to a balanced $10\% - 12\%$ with crisp $0.75\text{px}-1.15\text{px}$ strokes for an elegant tactile stationery look without visual clutter.
- **Desktop Covers Grid Density**: Set widescreen covers extent to $140\text{px}$ ($\sim 8-9$ columns) for comfortable cover art breathing room and un-truncated progress text, while keeping $120\text{px}$ ($3$ columns) on mobile devices.

---

## [1.8.0] - 2026-08-19

### Added
- **Architectural & Authentic Paper Texture Engine**: Overhauled procedural canvas textures with enhanced visibility ($13\% - 22\%$ opacity) and heritage-accurate stationery mapping across all 16 theme variants (including authentic Manga screentone newsprint, Japanese *Genkō Yōshi* manuscript grid, Blueprint drafting grid, accounting ledger lines, and mulberry washi fibers).

### Fixed
- **Mobile Table View Title Truncation**: Relocated format & rating badges off the title line so book titles receive 100% full column width without truncation or missing titles.
- **Cover View Progress & Stepper Collision**: Restructured cover bottom overlay to give full width to title, progress display strings, and completion percentage; repositioned quick stepper chip to prevent text clipping.
- **Desktop Cards Vertical Alignment**: Optimized card vertical distribution with bottom-docked action clusters and refined grid extents to eliminate bottom voids on single-badge cards while gracefully housing 4-badge entries.

---

## [1.7.0c] - 2026-08-18

### Fixed
- **Desktop Card Button Clipping**: Expanded grid cell extent to prevent button slicing and hanging footers on books with multi-line titles and multiple badges.
- **Mobile 3-Column Compact Covers**: Resolved 2-column lock on mobile devices, unlocking 3 covers per row in compact mode.
- **Live Theme & Texture Reactivity**: Connected listeners in `MainNavigationScreen` and `LibraryScreen` so compact mode and paper texture toggles take effect instantly.
- **Tactile Paper Texture Visibility**: Tuned vector pattern opacity and stroke widths for crisp, tangible stationery textures.
- **Desktop Reading Carousel Proportions**: Constrained widescreen width to eliminate 1400px empty voids.
- **Table View Alignment & Metadata**: Added structured desktop columnar alignment, header bar, author/ongoing metadata, and mobile compact scaling.

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
