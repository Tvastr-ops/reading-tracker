# Reading Tracker

A minimal, self-hosted tracker for web novels, light novels, novels,
essays, short stories, fanfiction, and more. Add entries, track progress,
rate with switchable half-star or decimal ratings, filter and search, and
export to CSV any time.

## Features

- Title, type, author, status, rating, progress, genre/tags, source link,
  cover image, dates, and notes
- Live-computed % complete (never goes out of sync with progress)
- Half-star or decimal rating display, switchable per user
- Sortable columns, status filtering, text searches
- Summary dashboard: per-status counts, average rating, completed-per-month
  and rating-distribution charts, and a yearly reading goal with progress bar
- Per-book reading log — timestamped progress entries, not just one number
- Soft-delete with a Trash view (restore or permanently delete)
- Cover image search (Open Library) — stores only the image URL, not the file
- CSV export and bulk CSV import for backups / migration
- Installable as a home-screen app (PWA)
- Password-protected, single-user by design

## Stack

- **Web App**: [Next.js](https://nextjs.org/) (App Router, React 19, Tailwind CSS, TypeScript)
- **Cross-Platform Client App**: [Flutter](https://flutter.dev/) (Dart 3, SQLite offline-first, targeting Mobile (Android/iOS), Web, Windows, and Linux)
- **Backend & Database**: [Supabase](https://supabase.com) Postgres or Self-Hosted REST API (two-way sync)
- **Auth**: App password gated access via signed HttpOnly session cookie (`jose`) with proxy routing and route-level validation (`lib/auth.ts`)

## Getting started

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for a complete walkthrough.

### Quick Start

```bash
# Install dependencies
pnpm install

# Run web app
pnpm run dev:web

# Run cross-platform Flutter client app (Android, iOS, Web, Windows, Linux)
pnpm run dev:client
# (or: cd apps/client && flutter run)

# Run web tests
pnpm run test:web

# Code linting & formatting checks
pnpm run lint
pnpm run format
```

## License

MIT — see [`LICENSE`](./LICENSE).
