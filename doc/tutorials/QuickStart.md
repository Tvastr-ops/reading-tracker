# Quickstart Guide

Get the Paperback Reading Tracker running locally and log your first reading entry.

---

## Prerequisites

* **Node.js** `>= 20.0.0`
* **pnpm** `>= 9.0.0` (or `npm` / `bun`)
* **Git**
* *(Optional)* **Flutter SDK** `>= 3.19.0` (for mobile or desktop client development)

---

## Step 1: Clone Repository

```bash
git clone https://github.com/Tvastr-ops/reading-tracker.git
cd reading-tracker
```

---

## Step 2: Install Dependencies & Run

The monorepo supports **`pnpm`**, **`npm`**, and **`bun`** directly from the root repository directory:

### Option A: Using `pnpm` (Recommended)
```bash
# Install workspace dependencies
pnpm install

# Start Web Dashboard (http://localhost:3000)
pnpm run dev:web

# Start Flutter Client (in a separate terminal)
pnpm run dev:client
```

> [!TIP]
> `pnpm` deduplicates packages across the monorepo, saving disk space and speeding up local builds.

---

### Option B: Using `bun`
```bash
# Install workspace dependencies
bun install

# Start Web Dashboard
bun --filter web dev

# Start Flutter Client
cd apps/client && flutter run
```

---

### Option C: Using standard `npm`
```bash
# Install workspace dependencies
npm install

# Start Web Dashboard
npm run dev --workspace=web

# Start Flutter Client
cd apps/client && flutter run
```

---

## Step 3: Configure Environment

Copy the example environment configuration:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your configuration:

```env
APP_PASSWORD=your_secure_password
SESSION_SECRET=a_random_32_character_secret_string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

*(To provision a cloud database, see [Deploy to Vercel & Supabase](../how-to/DeployVercelSupabase.md)).*

---

## Step 4: Add Your First Book

1. Open `http://localhost:3000` in your browser.
2. Enter the configured `APP_PASSWORD`.
3. Press `N` (or click **Add Entry**).
4. Enter a title (e.g. *The King in Yellow*), select **Novel**, set total units to `203 pages`, and submit.
5. Click the book card to open the quick-log modal and increment progress.

---

## Next Steps
* [Deploy to Vercel & Supabase](../how-to/DeployVercelSupabase.md)
* [Compile Android APKs](../how-to/BuildAndroidWindows.md)
* [REST API Reference](../reference/ApiEndpoints.md)
