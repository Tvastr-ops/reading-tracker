# Deploying Reading Tracker — Complete Beginner's Guide

This assumes you've never used GitHub, Vercel, or Supabase before. Follow every
step in order. It takes about 20–30 minutes.

You'll need: the `reading-tracker.zip` file, an email address, and a web browser.
No coding, no terminal required (one optional terminal step has a no-terminal
alternative).

---

## Part 1: Unzip the project

1. Find `reading-tracker.zip` wherever you downloaded it.
2. Unzip it:
   - **Windows**: right-click the file → "Extract All" → Extract.
   - **Mac**: double-click the file — it unzips automatically.
3. You should now have a folder called `reading-tracker` containing files like
   `package.json`, a `app` folder, etc. Keep this folder — you'll upload it in
   Part 3.

---

## Part 2: Create a Supabase account and database

Supabase is where your book data will actually live (free forever at this scale).

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up (using GitHub or email — either works).
3. Click **New project**.
   - **Name**: anything, e.g. `reading-tracker`.
   - **Database password**: click "Generate a password" and **copy it
     somewhere safe** (a notes app is fine — you won't need it again for this
     app, but don't lose it in general).
   - **Region**: pick the one closest to you.
   - Click **Create new project**. Wait 1–2 minutes while it sets up.
4. Once it's ready, click the **SQL Editor** icon in the left sidebar (looks
   like `</>`).
5. Click **New query**.
6. Open the file `reading-tracker/supabase/schema.sql` from your unzipped
   folder in any text editor (Notepad, TextEdit, VS Code — anything). Select
   all the text, copy it.
7. Paste it into the Supabase SQL editor box.
8. Click **Run** (bottom right, or press Ctrl/Cmd+Enter).
9. You should see "Success. No rows returned." That means your database table
   was created.

### Get your two Supabase keys

1. Click the **Settings** (gear icon) in the left sidebar → **API**.
2. You'll see a page with two things you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`. Copy it.
   - **Project API keys** → find the one labeled **`service_role`** (NOT
     `anon` / `public` — those look similar but are different keys). Click
     **Reveal** and copy it.
3. Paste both somewhere temporary (a notes app) — you'll need them in Part 4.
   Keep this note private; don't share or post the `service_role` key anywhere.

---

## Part 3: Put the project on GitHub

GitHub is just a place to store your project's code so Vercel can find it.
This uses GitHub's website only — no software to install.

1. Go to **https://github.com** and sign up for a free account if you don't
   have one.
2. Once logged in, click the **+** icon (top right) → **New repository**.
3. **Repository name**: `reading-tracker`.
4. Set it to **Private** (recommended, since this will hold your personal
   data and configuration).
5. Leave everything else as default. Click **Create repository**.
6. On the next page, look for a link that says **"uploading an existing
   file"** (it's in the quick-setup text near the top). Click it.
7. Open your unzipped `reading-tracker` folder on your computer, select
   **everything inside it** (all files and folders — not the outer folder
   itself), and drag them into the browser upload area.
   - Tip: open the folder, press Ctrl+A (Windows) or Cmd+A (Mac) to select
     all, then drag.
8. Wait for the upload to finish (progress bars will show), scroll down, and
   click **Commit changes**.
9. Your code is now on GitHub. You won't need to touch GitHub again after
   this unless you want to update the app later.

---

## Part 4: Generate a session secret

This is just a long random password used internally to keep you logged in
securely. Pick **one** of these two options:

**Option A — no terminal needed:**
Go to **https://1password.com/password-generator** (or any password
generator site), set length to 40+, generate, and copy the result.

**Option B — if you're comfortable with Terminal (Mac) / PowerShell (Windows):**
Run:
```
openssl rand -base64 32
```
and copy the output.

Either way, save this random string somewhere temporary — you'll paste it
into Vercel in the next step, labeled `SESSION_SECRET`. *(Note: `SESSION_SECRET` must be at least 32 characters long or the app server will throw an error at startup).*

Also now is a good time to **pick your app password** — the password you'll
type to log into your reading tracker. Make it something only you know
(doesn't need to be the same as anything above).

---

## Part 5: Deploy to Vercel

1. Go to **https://vercel.com** and click **Sign Up**.
2. Choose **Continue with GitHub** and authorize it — this lets Vercel see
   your repositories.
3. Once logged in, click **Add New** → **Project**.
4. Find `reading-tracker` in the list of repositories and click **Import**.
5. You'll land on a configuration screen.
   - Set **Root Directory** to `apps/web` (click **Edit** next to Root Directory, type `apps/web`, and click Save).
   - Before clicking Deploy, expand **Environment Variables** and add these four, one at a time (Name on the left, Value on the right, click **Add** after each):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL you copied in Part 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key you copied in Part 2 |
   | `APP_PASSWORD` | the login password you picked in Part 4 |
   | `SESSION_SECRET` | the random string (32+ chars) you generated in Part 4 |

6. Double-check there are no extra spaces before/after any pasted value.
7. Click **Deploy**.
8. Wait 1–2 minutes while Vercel builds your app. You'll see a progress log;
   when it's done you'll see a "Congratulations" screen with a preview image.
9. Click the preview image or the domain link (something like
   `reading-tracker-yourname.vercel.app`) to open your live app.

---

## Part 6: First login & Home Screen Setup (PWA)

1. You should see a login screen. Enter the `APP_PASSWORD` you set in Part 4.
2. You're in — you should see an empty tracker with "+ Add entry" available.
3. Add a book to confirm everything works end to end.

### Install on Mobile (PWA)

- **iPhone / iPad (Safari)**: Open your Vercel URL in Safari → tap the **Share** icon (square with arrow up) → tap **Add to Home Screen**.
- **Android (Chrome)**: Open your Vercel URL in Chrome → tap the **⋮** menu (top right) → tap **Add to Home Screen** / **Install app**.

Bookmark your Vercel URL or install it to your home screen — that's your permanent app address.

---

## Part 6: Setting up the Mobile & Desktop Client App

The Flutter client app (`apps/client`) runs on **Android, iOS, Web, Windows, and Linux** and supports 3 sync modes:

### Option A: Direct Supabase Cloud Sync (Serverless / No Web App Required)
1. In your Supabase Dashboard, open **SQL Editor** → **New Query**.
2. Copy and paste the contents of `supabase/migration_v08_rls.sql` and click **Run**.
3. In the client app, go to **Settings (⚙️) → Remote Sync**:
   - Set **Backend Type** to `Supabase`.
   - Enter your **Project URL** (e.g. `https://your-project.supabase.co`).
   - Enter your public **anon key**.
   - Tap **Save & Reconnect** and **Sync Now**.

### Option B: Unified Web App REST API Sync
1. In the client app, go to **Settings (⚙️) → Remote Sync**:
   - Set **Backend Type** to `Self-Hosted REST`.
   - Enter your deployed web app URL (e.g. `https://reading-tracker-yourname.vercel.app`).
   - Enter your **App Password** as the API key.
   - Tap **Save & Reconnect** and **Sync Now**.

### Option C: Offline-Only Mode
- In **Settings → Preferences**, toggle **Offline-Only Mode** to `ON`.
- The client app runs 100% locally on device SQLite storage with zero internet connection required.

---

## Upgrading an Existing Deployment

If you deployed an earlier version of Reading Tracker, run the migration scripts in your Supabase SQL Editor:

1. Open **Supabase Dashboard** → **SQL Editor** → **New Query**.
2. If upgrading from **v1**: Open `supabase/migration_v02.sql`, copy all text, paste into Supabase, and click **Run**. Next, open `supabase/migration_v03.sql`, copy all text, paste into Supabase, and click **Run**.
3. If upgrading from **v2**: Open `supabase/migration_v03.sql`, copy all text, paste into Supabase, and click **Run**.
4. To enable direct mobile client Supabase sync: Open `supabase/migration_v08_rls.sql`, copy all text, paste into Supabase, and click **Run**.

---

## Troubleshooting

**"Deploy failed" on Vercel with a red error log:**
Click the failed deployment to read the error. The most common cause is a
typo in one of the environment variable names or values — go to your
Vercel project → **Settings → Environment Variables**, fix it, then go to
the **Deployments** tab and click the **⋯** menu on the latest one →
**Redeploy**.

**"500 Internal Server Error" when adding a reading log entry:**
This means your Supabase database is missing the `reading_pace` column added in v3. Go to Supabase **SQL Editor** → **New Query**, copy the contents of `supabase/migration_v03.sql` (`ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_pace numeric;`), and click **Run**.

**Login page says "Incorrect password":**
Double check `APP_PASSWORD` in Vercel's environment variables has no extra
spaces, then redeploy (env var changes require a redeploy to take effect).

**App loads but adding a book gives an error:**
Almost always means `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is wrong,
or the SQL from Part 2 step 6–9 wasn't run. Go back and confirm the `books`
table exists: in Supabase, click **Table Editor** in the sidebar — you
should see a `books` table listed.

**I want to change my password later:**
Vercel → your project → **Settings → Environment Variables** → edit
`APP_PASSWORD` → then **Deployments** tab → redeploy.

**My Supabase project says "paused":**
Free Supabase projects pause after 7 days with zero activity. Just click
**Restore project** in the Supabase dashboard — takes under a minute, and
your data is untouched.

---

## You're done

From now on, using the app is just: open your Vercel URL, log in, use it.
No further setup needed, and it costs nothing at this scale.
