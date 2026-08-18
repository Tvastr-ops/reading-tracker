# Documentation

Technical documentation and guides for the Paperback Reading Tracker ecosystem.

---

## Overview

### Tutorials
* **[`QuickStart.md`](./tutorials/QuickStart.md)** — Local development setup and logging a first reading entry.

### How-To Guides
* **[`DeployVercelSupabase.md`](./how-to/DeployVercelSupabase.md)** — Production deployment on Vercel and Supabase.
* **[`SelfHostDockerPostgres.md`](./how-to/SelfHostDockerPostgres.md)** — Self-hosting with Docker Compose or custom PostgreSQL (Neon, Railway, AWS RDS).
* **[`BuildAndroidWindows.md`](./how-to/BuildAndroidWindows.md)** — Compiling native Android APKs and Windows binaries.
* **[`ImportExportCsv.md`](./how-to/ImportExportCsv.md)** — Library backup, restore, and CSV migration.

### Reference
* **[`ApiEndpoints.md`](./reference/ApiEndpoints.md)** — REST API routes, authentication headers, and payload schemas.
* **[`DatabaseSchema.md`](./reference/DatabaseSchema.md)** — PostgreSQL tables, triggers, RPC functions, and constraints.
* **[`ThemePalettes.md`](./reference/ThemePalettes.md)** — Color tokens and hex values for all 16 client themes.

### Architecture & Concepts
* **[`SyncArchitecture.md`](./explanation/SyncArchitecture.md)** — Offline-first SQLite mutation queue and conflict resolution.
* **[`ProgressionMath.md`](./explanation/ProgressionMath.md)** — Multi-tier volume/chapter math and reading velocity formulas.
* **[`VersioningLifecycle.md`](./explanation/VersioningLifecycle.md)** — Decimal SemVer release rules and update detection.

### Project
* **[`roadmap/README.md`](./roadmap/README.md)** — Planned milestones and roadmap goals.
