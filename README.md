# Reading Tracker

A minimal, self-hosted tracker for web novels, light novels, novels,
essays, short stories, fanfiction, and more. Add entries, track progress,
rate with switchable half-star or decimal ratings, filter and search, and
export to CSV any time.

## Features

- Title, type, author, status, rating, progress, genre/tags, source link,
  dates, and notes
- Live-computed % complete (never goes out of sync with progress)
- Half-star or decimal rating display, switchable per user
- Status filtering, text search, and a summary dashboard
- CSV export for backups / portability
- Password-protected, single-user by design

## Stack

- [Next.js](https://nextjs.org/) (App Router) — deploys free on
  [Vercel](https://vercel.com)
- [Supabase](https://supabase.com) Postgres — free tier, no persistent
  disk needed since it's serverless
- No third-party auth — a single app password gates access via a signed,
  HttpOnly session cookie

## Getting started

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for a complete,
beginner-friendly walkthrough (Supabase setup, GitHub, Vercel, env vars).

Quick version, if you've done this before:

```bash
# 1. Run supabase/schema.sql in your Supabase project's SQL editor
# 2. Copy .env.example -> .env.local and fill in your values
npm install
npm run dev
```

## License

MIT — see [`LICENSE`](./LICENSE).
