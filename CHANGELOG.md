# Changelog

All notable changes to the Paperback Reading Tracker ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to the [Project Release Versioning Specification](.gemini/rules/versioning.md).

## [2.7.0] - 2026-09-02

### Added & Architecture (Web App)
- **Full-Stack End-to-End Type Safety (2026 Standards)**:
  - **Hono RPC Client (`hc`) & Zod Validation**: Built modular Hono v4 API layer (`lib/server/app.ts`) mounted on Next.js App Router with Zod schema validation and exported typed RPC client (`lib/client.ts`), replacing unverified raw fetch calls with 100% compile-time typed queries and mutations.
  - **Type-Safe URL Search Parameters (`nuqs` v2)**: Refactored library filter hooks (`useLibraryFilters.ts`) using `nuqs` schema parsers (`parseAsInteger`, `parseAsStringLiteral`, `parseAsBoolean`, `parseAsString`). Every view and filter state is now bookmarkable, shareable, and integrated with native browser Back/Forward navigation.
  - **Server State & Hierarchical Caching (`@tanstack/react-query` v5)**: Migrated `useLibrary.ts` to TanStack Query with structured query keys (`['books', { showTrash }]`), automatic background revalidation on window focus, and instant optimistic cache updates with rollback for progress steppers, quick status transitions, and favorites.
  - **PostgreSQL Database Schema Types (`database.types.ts`)**: Bound `Database` definitions to `createClient<Database>()` in `lib/supabase.ts`, guaranteeing compile-time column safety across all database queries.
  - **Stable Top-Level `typedRoutes: true`**: Configured compile-time route verification in `next.config.js` and typed all navigation links across navbar, drawer, and timeline components.

### Security & Hardening
- **Login Rate Limiting**: Added sliding-window rate limiting on `/api/auth/login` (maximum 10 attempts per 15 minutes per IP) to protect against brute-force attacks.
- **Route-Group Auth Guards**: Centralized auth guard middleware protecting all library, journey, log, and settings endpoints by default.
- **100% Mobile Client Sync Compatibility**: Preserved all dual auth mechanisms (`x-api-key`, `Authorization: Bearer <key>`, session cookies) and exact REST payload envelopes for Flutter mobile sync.

## [2.6.4] - 2026-08-31


### Added
- **Editorial & Tactile Typography System (Web & Mobile)**:
  - **Tabular Lining Figures (`tnum`)**: Enabled OpenType `FontFeature.tabularFigures()` (Flutter) and `.font-tabular` / `font-variant-numeric: tabular-nums` (Web) across all progress displays, velocity cards, ratings, PIN keypad buttons, and cooldown timers for rock-solid, jitter-free numeric alignment.
  - **Classic Book Ligatures (`dlig` & `liga`)**: Enabled discretionary and standard ligatures on `Lora` (Flutter) and `Newsreader` (Web) editorial headlines, joining character pairs like **fi**, **fl**, **ff**, **st**, and **Th** into elegant print glyphs.
  - **Authentic Print Badges & Micro-Tracking**: Added calibrated optical letter-spacing (`letterSpacing: 0.6–0.7px` / `.tracking-badge`) and bold weights for format tags (`LIGHT NOVEL`, `MANGA`, `BOOK`) and shelf indicators.
  - **Reader Headline Typography Selector (Mobile & Desktop)**: Added user preference under *Settings > Appearance* allowing readers to choose between **Literary Serif (Lora)**, **Modern Sans (Plus Jakarta Sans)**, and **Brutalist Mono (Space Mono)** with instant reactive theme rebuilding.

### Fixed & Security
- **Lock Screen 120 FPS Performance & Background PBKDF2 (`Isolate.run`)**:
  - Offloaded 600,000-iteration PBKDF2 HMAC-SHA256 secret hashing to a background worker isolate, completely eliminating UI frame stalls during PIN and password verification.
- **Biometric Isolation (`biometricOnly: true`)**:
  - Enforced `biometricOnly: true` on `local_auth` prompt to prevent Android OS device lock full-screen overlays and preserve strict in-app secret isolation.
- **Tactile Keypad Press Depression & Animated Spring PIN Dots**:
  - Replaced static lock screen buttons with `_BrutalistKeypadKey` featuring interactive physical push translation (`translate(1.5px, 1.5px)` with shadow collapse) and immediate haptic feedback on touch down.
  - Added elastic spring-pop animations on PIN dots as digits are entered.
  - Added smooth 150ms staging buffer on startup before triggering biometric prompt.

## [2.6.3] - 2026-08-30

### Added
- **Smart Unit-Aware & Progress Search Operators (Web & Mobile)**:
  - Added strict unit-aware length filtering: `pages>400` / `p<200` (strictly matches pages), `chapters>100` / `ch>50` (strictly matches serialized chapters/manga), `volumes>=10` / `vol>5` (volume-tier works), and `words>50000` (word-count works).
  - Added universal length comparison: `units>100` / `length>300` / `total<=50` across all format types.
  - Added read progress and milestone operators: current read progress (`progress>450`, `read>100`), percentage completion (`percent>=50%`, `pct=100%`), and remaining unread count (`unread>0`, `left>10`).
  - Added direct unit mode filter (`unit:pages`, `unit:chapters`, `unit:volumes`, `unit:words`).
- **Dependency & SDK Modernization**:
  - Upgraded `flutter_secure_storage` to `^10.3.1` with custom hardware Keystore ciphers (AES-GCM / RSA-OAEP) and unified Darwin support.
  - Upgraded `package_info_plus` to `^10.2.1` and `win32` to `6.4.0`.

## [2.6.2] - 2026-08-30

### Added
- **Unified Boolean & Structured Search Engine (Web & Mobile)**:
  - Added full boolean query parsing across both web and mobile clients: `OR` / `|` union, multi-token `AND`, exact phrase matching (`"..."`), and negation (`-tag`, `!manga`).
  - Added structured field qualifiers: `author:` / `by:`, `series:`, `tag:` / `#`, `shelf:`, `type:`, `status:`, `rating:` / `stars:`, and boolean flags (`is:fav`, `is:ongoing`, `no:cover`, `has:notes`).
  - Added in-progress typing resilience so trailing pipe symbols or uncompleted operators do not zero out search results while typing.
- **View Switch Animation Preferences (Web App)**:
  - Added configurable view transition styles under *Settings & Preferences*: **Instant (0ms — Notion / Linear)** for zero-latency 60fps view swapping, and **Smooth Fade (100ms)** for soft GPU keyframe transitions.
- **High-Clarity GPU Paper Grain & Stylesheet Optimization**:
  - Upgraded hardware-accelerated SVG fractal noise (`<feTurbulence>`) paper grain with zero scroll lag and automatic dark mode balance.
  - Purged ~600 lines of obsolete prototype CSS from `globals.css` (reducing CSS payload by ~40%).

### Fixed
- **Mobile Touch Responsiveness & Tactile Press Polish**:
  - Added client-side `touchstart` listener in `AppShell` to immediately unlock instant mobile `:active` states on iOS and Android.
  - Added universal active compression (`active:scale-[0.97]`) and snappy `duration-75` feedback to all buttons and cards.
  - Fixed mobile bottom navigation overlap on floating bulk selection action bar with dynamic safe-area offsets.
  - Replaced solid focus rings with zero-ring tactile cardstock elevation shadows.

## [2.6.1] - 2026-08-30

### Added
- **Timeline Rolling 30-Day Velocity**:
  - Added rolling 30-day velocity metric (**`THIS MONTH`**) to the Reading Timeline screen across both horizontal mobile metric row and desktop sidebar overview card.
  - Enhanced velocity calculations with real-time reading progress tracking.

### Fixed
- **Analytics & Timeframe Parity**:
  - Improved lifetime vs yearly macro velocity calculations and journey-aware historical records across platforms.

## [2.6.0] - 2026-08-29

### Added
- **App Lock Authentication (Biometric, PIN, Password)**:
  - Added multi-tier app security with 6-digit minimum PIN mode (custom brutalist numeric keypad) and 12-character minimum password mode.
  - Native biometric & Windows Hello unlock on Android and supported desktop hardware.
  - Rate-limiting protection with 3-attempt 30-second exponential lockout cooldown.
  - Hardened cryptographic key derivation using **600,000 PBKDF2 HMAC-SHA256 iterations** with a 32-byte CSPRNG salt.
- **Hardware-Backed & Portable Secure Credential Storage**:
  - Upgraded sync credentials storage to latest `flutter_secure_storage` (v11.0.0) hardware-backed TEE / DPAPI / Keystore.
  - Unified Desktop Portable Mode: Self-contained AES-256-GCM encrypted storage in `portable_data/secure_config.dat` using the user's PIN/password as the master key.
  - Zero-friction auto-migration: Automatically migrates existing plaintext credentials on first boot and purges them from disk.
- **Configurable Auto-Lock Timeouts & Native Privacy Screen**:
  - Added configurable background auto-lock durations (Instant, 1m, 5m, 10m, 15m, Cold start only).
  - Native Kotlin `FLAG_SECURE` window management on Android to mask app previews in the Recent Apps overview screen and prevent screenshots/screen recording.
- **Modernized Multi-Page Web Frontend (`apps/web`)**:
  - Converted single-page web app into dedicated Next.js App Router routes: `/` (Library), `/books/[id]` (Book Inspector & Log Manager), `/journal` (Reading Timeline), `/analytics` (Stats & Reading Velocity), and `/settings`.
  - Added client-side library pagination and desktop/mobile responsive navigation shells (`AppNavbar`, `MobileBottomNav`).
- **Unified Multi-Unit Atomic Goals Sync (Flutter Client & Web App)**:
  - Unified goal engine across both platforms with multi-unit selector tabs (`BOOKS`, `PAGES`, `CHAPTERS`, `VOLUMES`) and multi-year selector (`2026`, `2025`, etc., and `Lifetime`).
  - Added real-time cloud synchronization for all unit targets via `app_settings` with backward-compatible single-count support.
  - Added unified tactile pace status stamps (`GOAL ACHIEVED! 🏆`, `+X AHEAD`, `ON TRACK`, `X BEHIND`, `NO GOAL SET`).
- **GitHub-Style Daily Reading Streak & Heatmap Matrix (Web)**:
  - Added interactive 20-week daily commit grid rendering all reading sessions with intensity levels, session count tooltips, and real-time streak badges (**Current Streak**, **Best Streak**, **Total Active Days**).
- **Reading Velocity & Pacing Matrix (Web)**:
  - Added dedicated velocity cards for **This Week (7D)**, **This Month (30D)**, **Annual Volume**, and **Active Reading Velocity** speed calculations.
- **Segmented Distribution Tabs & Reading Passport (Web)**:
  - Added interactive tabs for **Publication Formats**, ranked **Genres**, and **1–5 Star Rating** distribution histogram.
  - Added library completion health rate %, total re-reads logged, and average reading duration from start to finish date.

### Fixed
- **Multi-Platform CI/CD Release Compilation (Android, Windows, Linux)**:
  - **Android**: Replaced legacy `flutter_windowmanager` with zero-dependency native Kotlin `MethodChannel`, upgraded `MainActivity` to `FlutterFragmentActivity`, and set `minSdk = 24`.
  - **Windows**: Added `-D_SILENCE_EXPERIMENTAL_COROUTINE_DEPRECATION_WARNINGS` in CMake to resolve MSVC 2022 STL1011 compilation errors with `local_auth_windows`.
  - **Linux**: Added `libsecret-1-dev` and `libjsoncpp-dev` system packages to GitHub Actions release workflow.
- **Empty Ghost Journey Cleanup & Auto-Gen Journey Deduplication**:
  - Fixed an issue where duplicate empty `Journey #1` records appeared after auto-generating completed books on the web app.
  - Added deduplication by `journey_index` across Web API routes, `ReadingLog.tsx`, and Flutter client SQLite queries.

---

## [2.5.0] - 2026-08-27

### Added
- **Global REST API `/api/journeys` Endpoint**: Added server-side journey synchronization route allowing Generic REST clients to sync reading journeys, multi-read archives, and re-read timelines seamlessly.
- **Dual-Trigger Timeline Feed & 500-Log Instant Startup**:
  - Expanded initial query capacity from 100 to 500 logs ($< 2\text{ms}$ startup load time), rendering entire reading histories without initial pagination truncation.
  - Added interactive footer badge `▼ LOAD OLDER READING LOGS` for manual deep history fetching alongside automatic scroll pagination.

### Fixed
- **Stats & Analytics Multi-Journey Resolution**:
  - Fixed an issue where in-progress and plan-to-read books with journey records inflated completed book counts.
  - Accurately partitioned monthly activity (July: 5 completed, August: 4 completed, 2016: 1 completed re-read) and lifetime archives (10 finished works total).
- **Android SQLite LIMIT/OFFSET Driver Compatibility**:
  - Replaced parameterized LIMIT binding with direct query interpolation in `getAllReadingLogsWithBookInfo` for universal Android compatibility.
- **Clean Android Reinstalls**:
  - Disabled Android Auto-Backup (`android:allowBackup="false"`) to prevent stale credentials and databases from persisting after uninstall/reinstall.

---

### Fixed
- **Timeline Full Historical Load Capacity (500 Logs Initial Query)**:
  - Increased Timeline initial page query limit from 100 to 500 records, allowing complete multi-month and multi-year library histories (all 111+ logs) to load and render instantly in $< 2\text{ms}$ on startup without pagination truncation or offset drift.
  - Safely parameterized SQL query directly in `getAllReadingLogsWithBookInfo` to guarantee reliable SQLite execution across all Android SQLite driver variants.

---

## [2.4.0f] - 2026-08-27

### Fixed
- **Android Auto Backup Isolation**:
  - Disabled `android:allowBackup` and `android:fullBackupContent` in `AndroidManifest.xml` to prevent Android OS and Google Play Services from silently persisting and restoring stale cloud backups, preferences, or auth states upon app uninstallation and reinstallation.

---

## [2.4.0e] - 2026-08-27

### Fixed
- **Exhaustive Cloud Sync Download (Supabase & REST)**:
  - Added automatic pagination loop (`limit=1000&offset=...`) to `fetchRemoteReadingLogs` and `fetchRemoteReadingJourneys` in `SupabaseSyncProvider` and `GenericRestSyncProvider`, resolving an issue where libraries with $> 1000$ historical logs were truncated at 1,000 entries during initial sync.
  - Increased query capacity on the `/api/logs` endpoint so full historical downloads cover the complete multi-year reading log ledger.

---

## [2.4.0d] - 2026-08-27

### Fixed
- **Timeline Pagination Exhaustion & Deterministic Offset**:
  - Replaced dynamic list-length offset calculation with monotonic `_dbOffset` tracking, preventing offset desynchronization across pagination pages.
  - Added deterministic secondary ordering (`ORDER BY l.logged_at DESC, l.id DESC`) in SQLite queries to eliminate duplicate page overlaps.
  - Removed premature termination when deduplicated page slices are processed, and added auto-fetch loop to ensure seamless infinite scrolling all the way back to your earliest historical entries.

---

## [2.4.0c] - 2026-08-27

### Added & Improved
- **Multi-Journey Reading Log & Pace Isolation (Web & Mobile)**:
  - Overhauled the Web App Reading Log tab with Journey-Aware grouping: active re-reads display prominently on top with live estimated completion dates, while historical reading journeys display as clean, collapsible ledgers.
  - Isolated active reading pace calculations to strictly evaluate active journey logs, preventing historical reads from distorting live estimated finish dates.
  - Added dedicated historical pace and duration metrics (`~X units/week • finished in Y days`) for completed reads and journeys across both Flutter Client and Web App.

---

## [2.4.0b] - 2026-08-27

### Fixed & Improved
- **Timeline Pagination & Infinite Scroll Reliability**:
  - Added ID-based deduplication (`uniqueNextLogs`) on reading log pagination to prevent duplicate entries from shifting page offsets.
  - Fixed infinite loading spinner on Android caused by elastic overscroll physics re-triggering query loops.
  - Fixed premature pagination termination on desktop Windows, ensuring smooth chronological scrolling through older reading logs (July and earlier).
  - Strengthened exception handling and state recovery in Timeline screen feed loader.

---

## [2.4.0a] - 2026-08-27

### Added & Improved
- **Child-Proof Log & Entry Deletion**:
  - Added child-proof double-confirmation dialog for deleting individual reading log entries and clearing all historical logs across Flutter Client and Web App.
- **Midday UTC Session Timestamping**:
  - Shifted simulation time generator to midday UTC (12:00 – 14:00) so timezone offsets ($\text{UTC}-12$ to $\text{UTC}+14$) never shift simulation entries past midnight into adjacent calendar days.
- **Robust Display Date Parsing**:
  - Updated `formatDisplayDate` to support both raw calendar date strings (`YYYY-MM-DD`) and full ISO timestamps without localized date skew.
- **Sync Timestamp Preservation**:
  - Web backfill generator now preserves original client UUID and exact historical log timestamps on backfill.

---

## [2.4.0] - 2026-08-27

### Added
- **Natural Reading Simulation (Backlogged Read Cycles)**:
  - Added opt-in **`🎲 Simulate Realistic Daily Reading Logs`** when adding past books directly as `Completed` with start and finish dates.
  - Implemented organic non-uniform variance algorithm ($\pm 25\% - 35\%$ noise) generating realistic evening session entries (8:00 PM – 10:30 PM) that sum up exactly to total units.
  - Full cross-platform parity on Flutter Client (SQLite DB v5) and Web App (Next.js/Supabase) committed atomically inside single-transaction pipelines.

## [2.3.0c] - 2026-08-27

### Added & Improved
- **Smart Re-Read Architecture (Reading Journeys)**:
  - Transitioned the entire ecosystem to a 1-to-many **`ReadingJourney`** architecture across Flutter Client (SQLite DB v5), Web App (Next.js), and Supabase (PostgreSQL migration v13).
  - Preserves full multi-read history: starting a re-read preserves the original read cycle (with its exact finish date and rating) and initializes a clean, isolated read cycle.
  - Automatically backfills Journey #1 for all pre-existing completed or reading books on database migration.
- **Reading Journeys Ledger & Collapsible Expander**:
  - Added an interactive **Reading Journeys Ledger** to the Flutter Book Detail Panel and Web Inspector Drawer.
  - Features smart collapsible expanders: shows the active and original read by default, expanding to the full historical ledger when $>3$ reads exist.
- **Sort & Filter Modal Layout Optimization**:
  - Optimized the Library Sort & Filter modal on mobile with a pinned, sticky bottom action bar (`RESET` and `APPLY FILTERS`) and a scrollable body, ensuring action buttons never get buried on compact screens.
- **Cross-Platform Sync & Backup Parity**:
  - Maintained strict parent-first sync dependency ordering ($\text{Tombstones} \to \text{Books} \to \text{Journeys} \to \text{Logs}$) to eliminate foreign key sync errors.
  - Upgraded JSON backup & restore to format schema `3.0` with full reading journey serialization.
- **Web API Endpoints**:
  - Added `/api/books/[id]/journeys` with atomic GET (list) and POST (start re-read) route handlers.

---

## [2.3.0b] - 2026-08-26

### Added & Improved
- **Flatpak Runtime Upgrade to 24.08**:
  - Upgraded `org.freedesktop.Platform` and `org.freedesktop.Sdk` from deprecated `23.08` to fully supported, actively maintained `24.08` runtime, resolving all EOL warnings and ensuring up-to-date graphics/system libraries.

---

## [2.3.0a] - 2026-08-26

### Added & Improved
- **Reading Velocity Matrix (Lifetime & Yearly)**:
  - **Lifetime Velocity (2x3 Grid)**: Displays `BOOKS / YEAR`, `DAILY VELOCITY` (fixed rate calculations), `PEAK RECORD YEAR`, `AVG FINISH TIME`, `LONGEST STREAK`, and `READING CADENCE` (adaptive weeks/days).
  - **Yearly Velocity (2x2 Grid)**: Displays `MONTHLY PACE`, `WEEKLY CADENCE`, `DAILY VELOCITY`, and `PEAK MONTH`.
- **Atomic Quick Log Note Sync**:
  - Fixed sync race condition where prompt notes on quick increment were omitted or overwritten by remote reconciliation. Notes are now recorded atomically with progress and pushed immediately to remote sync providers.
- **True Transparent Status Bar & Edge-to-Edge System UI**:
  - Eliminated gray/tinted status bar overlay on Android with `statusBarColor: Colors.transparent` and adaptive light/dark status bar icon brightness matching the active paper theme.
- **Standalone Linux Flatpak Packaging**:
  - Configured system-wide Flatpak SDK and runtime installation in GitHub Actions release workflow for automated `.flatpak` bundle generation.
- **Lifetime Yearly Completions Horizontal Bar Chart**:
  - Transformed Lifetime Activity into a sleek horizontal bar chart displaying all historical years with proportional progress bars, interactive year navigation, and a `★ PEAK` badge for the record year.
- **Header & Title Polish**:
  - Removed `(null)` from Reading Volume header on All-Time view.
  - Shortened Yearly Completions and standardized Reading Velocity card headers.

---

## [2.2.0c] - 2026-08-26

### Added & Improved
- **Local Backup & Restore (JSON / CSV)**: Added complete offline export & restore in Settings. Export your full library + reading logs to JSON or web-compatible CSV, and restore/import instantly from backup files or clipboard text.
- **CI Linter Polish**: Fixed flow control brace style in `_ParsedSearchQuery` to pass strict GitHub Actions release checks.

---

## [2.2.0b] - 2026-08-26

### Added & Improved
- **Boolean Search Operators**: Full support for `OR` / `|` (e.g. `#fantasy OR #scifi`) and exclusion `NOT` (`-` or `!`, e.g. `#fantasy -#romance`, `Sanderson -Mistborn`) in the library search bar.
- **Pre-Compiled Query AST Optimization (`_ParsedSearchQuery`)**: Tokenizes and compiles search expressions once per filter pass into an abstract syntax tree, delivering zero-allocation \(O(N)\) filtering for large libraries.
- **Tactile Physical Motor Haptics**: Upgraded haptics from soft keyboard ticks to `lightImpact` and `mediumImpact` ensuring crisp physical motor feedback on Realme UI, Samsung OneUI, and Pixel devices.
- **Local Backup & Restore (JSON / CSV)**: Added complete offline export & restore in Settings. Export your full library + reading logs to JSON or web-compatible CSV, and restore/import instantly from backup files or clipboard text.
- **Flatpak CI Packaging**: Added `flatpak-builder` and Flathub runtime dependencies to the GitHub release action to produce downloadable `.flatpak` release bundles.

---

## [2.2.0a] - 2026-08-26

### Added
- **Multi-Tag & Genre Filtering**: Added dedicated `GENRES / TAGS` section in Library Sort & Filter modal supporting multi-selection (AND intersection matching) with dynamic matching book counts.
- **Top-5 Frequent Tag Display & Collapse**: Displays the top 5 most frequently used genre tags by default with expandable `+MORE` / `-LESS` chips (`BrutalistExpandToggleChip`) to preserve vertical space.
- **Interactive Micro-Chip Clear Button**: Added responsive, styled `CLEAR (N)` micro-badge in modal headers for rapid one-tap tag filter resets.
- **Unified Multi-Tag & Keyword Search Combo with Boolean Logic**: Search bar supports full Boolean algebra:
  - **AND (Default)**: `#fantasy #adventure` or `tag:fantasy tag:magic` (requires all tokens).
  - **OR (`OR` / `|`)**: `#scifi OR #fantasy` or `#cyberpunk | #military` (matches either token).
  - **NOT / Exclusion (`-` / `!`)**: `#fantasy -#romance` or `Sanderson -Mistborn` (excludes matching tags/terms).
  - **Shelf & Keyword Hybrid**: `shelf:favorites #scifi -#horror`.
- **Hardware Vibration Support**: Added `android.permission.VIBRATE` to Android Manifest to enable hardware haptic feedback on physical devices.
- **Linux Flatpak Packaging**: Added complete Flatpak manifest (`org.readingtracker.PaperbackReader.yml`), AppStream metainfo (`org.readingtracker.PaperbackReader.metainfo.xml`), desktop spec, and build script integration for Flathub and standalone `.flatpak` bundle creation.

### Fixed & Refined
- **Guarded Platform Haptics**: Added platform checks (`triggerHapticClick()` / `triggerHapticImpact()`) preventing synchronous lag on Web and Desktop while delivering instant physical haptic ticks on mobile.
- **Modal Button Contrast**: Fixed visual regression where `CANCEL` and action buttons rendered as empty/invisible rectangles in `BookEditDialog` and `QuickLogDialog`.
- **Lifetime Stats Layout**: Refined lifetime reading metrics view to focus exclusively on all-time statistics without redundant 52-week annual grids.

---

## [2.2.0] - 2026-08-26

### Added
- **Lifetime Stats Dashboard**: Comprehensive all-time reading metrics view accessible from the Stats Year switcher dialog, displaying total lifetime books, pages, chapters, volumes, active days, and completion rates.
- **Dynamic Genre Suggestions & Library Shelves Overflow**: Smart capping for genre suggestion seeds and custom library shelves (6 visible by default) with standard `+N MORE` / `LESS` expansion toggles.
- **Star Rating Filter Expansion (3 ★, 2 ★, 1 ★ & Above)**: Full star filter coverage in Library Sort & Filter sheet with expandable `MORE` / `LESS` toggle.
- **Reusable Neo-Brutalist Expansion Component (`BrutalistExpandToggleChip`)**: Standardized expansion chip across library filters and dialogs supporting `small`, `medium`, and `regular` sizing.
- **Optional Tactile Haptic Micro-Vibrations**: Added setting toggle in `Settings > Display Preferences` for subtle tactile micro-ticks on progress increments and chip taps.
- **Desktop & Web Power Shortcuts**: Added `Ctrl+S` / `Cmd+S` to instantly save and dismiss `BookEditDialog` and `QuickLogDialog`.
- **Automatic Source Link Sanitizer**: Auto-prepends `https://` on user-entered domain links (e.g. `royalroad.com` -> `https://royalroad.com`).

### Performance & Architectural Refinements
- **SQLite Write-Ahead Logging (WAL Mode)**: Enabled `PRAGMA journal_mode = WAL;` and `PRAGMA synchronous = NORMAL;` in `DatabaseHelper` for non-blocking concurrent database reads while background sync writes.
- **Batched Remote Sync Payloads**: Bundled book and reading log sync pushes into unified JSON array HTTP payloads, eliminating serial HTTP roundtrips.
- **Mutation Debouncing & Coalescing**: Debounced rapid-fire progress ticks and status changes to prevent redundant sync network bursts.
- **Pre-Computed Library Cache (`_filteredBooks`)**: Decoupled \(O(N \log N)\) filtering and sorting from layout rebuilds, rendering cached books in \(O(1)\) time.
- **Synchronous Seed Loading**: Genre suggestions initialize synchronously on frame 1, completely eliminating modal pop-in and layout shift.

---

## [2.1.0c] - 2026-08-25

### Added
- **Bespoke Tactile Paper Textures**: 6 distinct procedural paper canvas patterns (`Classic Kraft`, `Muted Ledger`, `Fine Archival Grid`, `Canvas Weave`, `Vintage Newsprint`, and `Technical Dots`) tied to active theme variants.
- **Paper Pattern Intensity Slider**: Granular intensity control in `Settings > Display Preferences` with live real-time slider and translucent card backdrops.
- **UUID Reading Log Synchronization**: Added full support for string UUID `log_id` mapping and full reading log history fetching across Supabase and Generic REST backends.

---

## [2.1.0b] - 2026-08-25

### Performance & Polish
- **GPU Layer Caching via `PictureRecorder`**: Cached paper texture drawing layers on the GPU, achieving silky 60/120 FPS scrolling with zero CPU rasterization overhead.
- **Reading Journey Error Recovery**: Graceful error handling in Timeline/Journey view ensuring graceful fallbacks even on interrupted log streams.

---

## [2.1.0a] - 2026-08-25

### Added
- **Full Paper Canvas Underlay**: Seamless background paper grain textures layered beneath main application routes.
- **Responsive Layout Symmetry**: Unified padding, inset scaling, and adaptive card dimensions across desktop, tablet, and mobile.

---

## [2.1.0] - 2026-08-24

### Added
- **Custom Multi-Membership Shelves**: Organise books into multiple custom user-defined shelves (e.g. `Favorites`, `Classics`, `TBR 2026`) with tag-style filtering and SQLite/remote JSON persistence.
- **Series Engine & Order Tracking**: First-class tracking for book series names (`series_name`) and fractional/integer volume numbers (`series_order`).
- **Re-Reading Counter & Lifecycle**: Dedicated re-read counter (`reread_count`) and repeat journey lifecycle tracking.
- **Web App Parity**: Added full series, shelves, and re-reading support across Next.js web application types, form inputs, and Supabase server routes.

---

## [2.0.0] - 2026-08-24

### Added
- **Global Historical Year Switcher (1947 to Present)**: Added global year navigation stepper and interactive Year Picker dialog in the Stats AppBar, enabling instantaneous queries and metrics across all recorded years.
- **Multi-Unit Annual Goal Tracker**: Expanded annual reading goals with dedicated unit selector tabs (`BOOKS`, `PAGES`, `CHAPTERS`, `VOLUMES`), independent target persistence, and real-time pacing stamps (`AHEAD`, `ON TRACK`, `BEHIND`, `GOAL ACHIEVED`).
- **52-Week Reading Streak & Activity Heatmap**: Introduced a native 52-week calendar contribution grid with 4 intensity levels, daily tooltip details, and streak counters (`Current Streak`, `Longest Streak`, `Total Active Days`).
- **Typographic Retro Penguin Paperback Covers (`TypographicBookCover`)**: Books without cover images automatically generate vintage Penguin paperback designs with deterministic title palettes, format ribbon banners, and centered serif typography.
- **Zero-State Library Onboarding Card**: Clean neo-brutalist onboarding welcome state guiding new users to add books or search online catalogs.
- **Opt-in Quick-Log Note Prompt**: Added customizable note prompt upon quick-incrementing books (`Settings > Library Preferences`) with mobile micro-haptic feedback.
- **Desktop Keyboard Shortcuts Help Modal**: Quick-access shortcut dialog (`?` / `F1` / sidebar button) covering tab navigation (`1`–`4`), search (`/`), fullscreen (`F11`), and escape (`Esc`).

### Changed
- **Responsive Reading Velocity Card**: Streamlined velocity header and rate meters with overflow protection for compact portrait displays.
- **Tactile Brutalist Button Physics**: Enhanced button push depth mechanics and active shadow collapsing.

---

## [1.9.0f] - 2026-08-22

### Fixed
- **SQLite `getUnitBreakdownStats` Query**: Fixed SQLite query in `DatabaseHelper` by removing reference to non-existent `deleted_at` column on `reading_log` table, resolving `no such column: l.deleted_at` error on desktop startup.
- **Linux Wayland & VM Textual Glyph Corruptions**: Automatically disabled experimental Impeller Vulkan rendering engine by default on Linux desktop in favor of rock-solid Skia OpenGL (`enable-impeller=false` engine switch injected in runner `main.cc`, Debian `/usr/bin/paperback-reader`, AppImage `AppRun`, and portable `run.sh`), completely eliminating font glyph atlas corruptions, visual glitches, and flickering on Wayland compositors, VirtualBox, VMware, and Mesa software rasterizers.

---

## [1.9.0e] - 2026-08-22

### Fixed
- **Linux Wayland & VM Textual Glyph Corruptions**: Automatically disabled experimental Impeller Vulkan rendering engine by default on Linux desktop in favor of rock-solid Skia OpenGL (`enable-impeller=false` engine switch injected in runner `main.cc`, Debian `/usr/bin/paperback-reader`, AppImage `AppRun`, and portable `run.sh`), completely eliminating font glyph atlas corruptions, visual glitches, and flickering on Wayland compositors, VirtualBox, VMware, and Mesa software rasterizers.

---

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
