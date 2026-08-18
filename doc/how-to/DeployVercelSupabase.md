# Deploy to Vercel & Supabase

Step-by-step guide to deploying the Paperback web application on Vercel and provisioning a Supabase PostgreSQL database.

---

## Prerequisites

* [GitHub](https://github.com/) account
* [Supabase](https://supabase.com/) account
* [Vercel](https://vercel.com/) account

---

## Part 1: Provision Supabase Database

1. In the [Supabase Dashboard](https://app.supabase.com/), click **New Project**.
2. Select a name (e.g. `reading-tracker`), generate a database password, and select your preferred region.
3. Once provisioned, open **SQL Editor** (`</>`) in the left navigation.
4. Click **New Query**, paste the entire contents of [`supabase/schema.sql`](../../supabase/schema.sql), and click **Run**.

> [!NOTE]
> You should see *"Success. No rows returned."* That means your database tables and triggers are created.

5. Navigate to **Project Settings -> API**:
   * Copy the **Project URL** (`https://<project-ref>.supabase.co`).
   * Copy the **`service_role` secret key** (under Project API keys — click **Reveal**).
   * Copy the **`anon` public key** (if using direct client-to-cloud sync).

> [!WARNING]
> Keep your `service_role` key private. Never share it or commit it to public repositories.

---

## Part 2: Deploy to Vercel

1. In the [Vercel Dashboard](https://vercel.com/), click **Add New -> Project**.
2. Import your `reading-tracker` repository.
3. Configure the build settings:
   * **Root Directory**: Click Edit and select `apps/web`.
   * **Framework Preset**: `Next.js` (automatically detected).
4. Add the following environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `APP_PASSWORD` | Access password for web login | `YourSecretPassword123!` |
| `SESSION_SECRET` | Secret key for JWT signing | `openssl rand -base64 32` |
| `SUPABASE_URL` | Supabase project endpoint | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret | `sb_secret_...` |

5. Click **Deploy**. Vercel will build the Next.js bundle and provide your production URL.

---

## Part 3: Connect the Client Companion App

The Flutter client (`apps/client`) runs on Android, Windows, and Linux, supporting two remote synchronization modes:

### Option A: Direct Supabase Sync (Serverless)
1. In the Supabase SQL Editor, run [`supabase/migration_v08_rls.sql`](../../supabase/migration_v08_rls.sql) to enable Row Level Security.
2. In the Flutter client, navigate to **Settings -> Remote Sync**:
   * **Backend**: `Supabase`
   * **URL**: Your Supabase Project URL
   * **Key**: Your public `anon` key
   * Click **Save & Reconnect** -> **Sync Now**.

### Option B: Web Server REST API Sync
1. In the Flutter client, navigate to **Settings -> Remote Sync**:
   * **Backend**: `Self-Hosted REST`
   * **URL**: Your Vercel deployment URL (`https://<app-name>.vercel.app`)
   * **API Key**: Your `APP_PASSWORD`
   * Click **Save & Reconnect** -> **Sync Now**.

---

## Database Migrations

When updating existing deployments, apply versioned SQL scripts in chronological order via the Supabase SQL Editor:
* [`migration_v08_rls.sql`](../../supabase/migration_v08_rls.sql) — Direct mobile sync RLS.
* [`migration_v09_progress_rpc.sql`](../../supabase/migration_v09_progress_rpc.sql) — Atomic progress logging RPC.
* [`migration_v10_progression_checks.sql`](../../supabase/migration_v10_progression_checks.sql) — Metric constraints.
* [`migration_v11_smart_updated_at.sql`](../../supabase/migration_v11_smart_updated_at.sql) — Shelf order preservation on favorite toggles.

---

## Troubleshooting

> [!TIP]
> **Build Failure on Vercel**: Verify that root directory is set to `apps/web` and that all four environment variables are defined.

> [!TIP]
> **Authentication Errors**: Ensure `APP_PASSWORD` in Vercel settings contains no leading or trailing whitespace. Environment variable changes require a project redeployment to take effect.

> [!TIP]
> **Paused Project**: Inactive free-tier Supabase projects pause after 7 days of inactivity. Click **Restore Project** in the Supabase Dashboard to resume with zero data loss.
