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

- [Next.js](https://nextjs.org/) (App Router, Node.js >= 20) — deploys free on
  [Vercel](https://vercel.com)
- [Supabase](https://supabase.com) Postgres — free tier, no persistent
  disk needed since it's serverless
- No third-party auth — a single app password gates access via a signed,
  HttpOnly session cookie (`jose`), with proxy routing (`proxy.ts`) and route-level validation (`lib/auth.ts`)

## Getting started

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for a complete,
beginner-friendly walkthrough (Supabase setup, GitHub, Vercel, env vars).

Quick version, if you've done this before:

```bash
# 1. Run supabase/schema.sql in your Supabase project's SQL editor
#    (upgrading an existing database? run supabase/migration_v2.sql and migration_v3.sql)
# 2. Copy .env.example -> .env.local and fill in your values
npm install
npm run dev

# Code formatting & lint checks
npm run lint
npm run format
```

## License

MIT — see [`LICENSE`](./LICENSE).
