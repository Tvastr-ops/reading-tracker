# Tutorial: Quickstart Guide

This tutorial guides you through setting up the Paperback Reading Tracker monorepo locally, launching the development server, and logging your first book in under 5 minutes.

---

## 🎯 What You Will Learn
1. How to clone and install the monorepo workspace dependencies.
2. How to run the Next.js Web dashboard locally.
3. How to add a new book and log reading progress.
4. How to run the Flutter client app.

---

## 📋 Prerequisites
Before starting, ensure you have the following installed on your machine:
* **Node.js** `>= 20.0.0` ([Download Node.js](https://nodejs.org/))
* **pnpm** `>= 9.0.0` (`npm install -g pnpm`)
* **Git** ([Download Git](https://git-scm.com/))
* *(Optional)* **Flutter SDK** `>= 3.19.0` (if running the mobile/desktop app)

---

## 🚀 Step 1: Clone the Repository

Open your terminal and clone the repository:

```bash
git clone https://github.com/Tvastr-ops/reading-tracker.git
cd reading-tracker
```

---

## 📦 Step 2: Choose Your Development Track

### 🌟 Track A: Full Monorepo Setup (`pnpm` — Recommended)
Install dependencies across all workspaces and launch both services:

```bash
# Install all packages
pnpm install

# Run Web Dashboard (http://localhost:3000)
pnpm run dev:web

# Run Flutter Client (in a separate terminal)
pnpm run dev:client
```

---

### 🌐 Track B: Standalone Web Dashboard (`npm` / `bun`)
If you only want to work on the Next.js web application:

```bash
# Navigate to web app
cd apps/web

# Using npm:
npm install
npm run dev

# Or using Bun:
bun install
bun dev
```

---

### 📱 Track C: Standalone Flutter Client (`flutter`)
If you only want to develop on the native Android, Windows, or Linux app:

```bash
# Navigate to client app
cd apps/client

# Resolve Dart dependencies
flutter pub get

# Launch on connected phone, emulator, or desktop
flutter run
```

---

## ⚙️ Step 3: Configure Local Environment

Copy the example environment file for the web application:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Open `apps/web/.env.local` in your editor and configure your secrets:

```env
APP_PASSWORD=your_secure_password
SESSION_SECRET=a_random_32_character_secret_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

*(If you don't have a Supabase database yet, see the [Deploy to Vercel & Supabase Guide](../how-to/DeployVercelSupabase.md) to set one up in 2 minutes).*

---

## 📖 Step 4: Add Your First Book

1. Open your browser and navigate to **`http://localhost:3000`**.
2. Enter the `APP_PASSWORD` you configured in `.env.local`.
3. Click **Add Entry (`N`)** in the top bar.
4. Enter a book title (e.g. *The King in Yellow*), select **Novel**, set total pages to `203`, and click **Add Book**.
5. Click the book card to open the quick-log dialog and advance your progress by `30 pages`.
6. Observe the live progress bar, reading velocity calculation, and dashboard chart updates!

---

## 🎓 Next Steps
* Learn how to deploy to the cloud: **[`DeployVercelSupabase.md`](../how-to/DeployVercelSupabase.md)**
* Learn how to track complex multi-tier Light Novels: **[`ProgressionMath.md`](../explanation/ProgressionMath.md)**
* Browse available API endpoints: **[`ApiEndpoints.md`](../reference/ApiEndpoints.md)**
