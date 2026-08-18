# How-To: Deploy to Vercel & Supabase

This guide provides a comprehensive, step-by-step walkthrough for deploying the Paperback Web Application to **Vercel** and connecting it to a free **Supabase PostgreSQL** cloud database.

---

## 📋 Prerequisites
* A [GitHub](https://github.com/) account.
* A free [Supabase](https://supabase.com/) account.
* A free [Vercel](https://vercel.com/) account.

---

## 🗄️ Part 1: Set Up Supabase Database

1. Log in to [Supabase](https://app.supabase.com/) and click **New Project**.
2. Give your project a name (e.g. `reading-tracker`) and choose a database region close to you.
3. Once the project is created, navigate to **SQL Editor** in the left sidebar (`</>`).
4. Click **New Query**.
5. Copy the entire contents of [`supabase/schema.sql`](../../supabase/schema.sql) and paste it into the editor.
6. Click **Run** (Ctrl/Cmd+Enter). You should see *"Success. No rows returned."*
7. Navigate to **Project Settings (⚙️) ➔ API**:
   - Copy your **Project URL** (e.g. `https://abcdefgh.supabase.co`).
   - Copy your **`service_role` secret key** (revealed under Project API keys).
   - Copy your **`anon` public key** (used for direct mobile sync).

---

## 🌐 Part 2: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New ➔ Project**.
2. Select your imported or forked `reading-tracker` GitHub repository.
3. In the **Configure Project** screen:
   - **Root Directory**: Click edit and select `apps/web`.
   - **Framework Preset**: `Next.js` (automatically detected).
4. Expand **Environment Variables** and add the following 4 keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `APP_PASSWORD` | `YourSecretPassword123!` | Password required to log into the web app |
| `SESSION_SECRET` | *(Random 32-char string)* | Key used to sign JWT session cookies (`openssl rand -base64 32`) |
| `SUPABASE_URL` | `https://abcdefgh.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Your Supabase service role secret key |

5. Click **Deploy**. Vercel will build your web application in ~1 minute and provide your live URL (e.g. `https://reading-tracker-yourname.vercel.app`).

---

## 📱 Part 3: Connect the Mobile Companion App

The Flutter client app (`apps/client`) runs on Android, Windows, and Linux, supporting 3 sync modes:

### Option A: Direct Supabase Cloud Sync (Serverless)
1. In your Supabase Dashboard, open **SQL Editor ➔ New Query**.
2. Paste the contents of [`supabase/migration_v08_rls.sql`](../../supabase/migration_v08_rls.sql) and click **Run**.
3. In the Flutter client app, go to **Settings (⚙️) ➔ Remote Sync**:
   - Set **Backend Type** to `Supabase`.
   - Enter your **Project URL** and public **`anon` key**.
   - Tap **Save & Reconnect** and **Sync Now**.

### Option B: Unified Web App REST API Sync
1. In the Flutter client app, go to **Settings (⚙️) ➔ Remote Sync**:
   - Set **Backend Type** to `Self-Hosted REST`.
   - Enter your deployed Vercel URL (e.g. `https://reading-tracker-yourname.vercel.app`).
   - Enter your `APP_PASSWORD` as the API key.
   - Tap **Save & Reconnect** and **Sync Now**.

---

## 🛠️ Upgrading an Existing Deployment

When updating to new versions, execute migration scripts in your Supabase SQL Editor in chronological order:
1. Open **Supabase Dashboard ➔ SQL Editor ➔ New Query**.
2. Run any unapplied scripts from the `supabase/` folder:
   - [`migration_v08_rls.sql`](../../supabase/migration_v08_rls.sql) — Direct mobile sync.
   - [`migration_v09_progress_rpc.sql`](../../supabase/migration_v09_progress_rpc.sql) — Atomic progress logging RPC.
   - [`migration_v10_progression_checks.sql`](../../supabase/migration_v10_progression_checks.sql) — Metric constraints.
   - [`migration_v11_smart_updated_at.sql`](../../supabase/migration_v11_smart_updated_at.sql) — Shelf order preservation.

---

## ❓ Troubleshooting

* **"Deploy failed" on Vercel**: Check your Vercel deployment logs. Usually caused by a typo in `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` environment variables.
* **"Incorrect password" on Login**: Verify `APP_PASSWORD` has no trailing whitespace in Vercel settings, then redeploy.
* **App loads but adding a book fails**: Confirm `schema.sql` was executed in Supabase SQL editor and the `books` table exists.
* **Supabase says "Project paused"**: Free Supabase projects pause after 7 days of inactivity. Click **Restore Project** in the Supabase dashboard (takes ~1 minute with 0 data loss).
