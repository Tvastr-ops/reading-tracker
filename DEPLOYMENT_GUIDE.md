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
into Vercel in the next step, labeled `SESSION_SECRET`.

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
5. You'll land on a configuration screen. Before clicking Deploy, expand
   **Environment Variables** and add these four, one at a time (Name on the
   left, Value on the right, click **Add** after each):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL you copied in Part 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key you copied in Part 2 |
   | `APP_PASSWORD` | the login password you picked in Part 4 |
   | `SESSION_SECRET` | the random string you generated in Part 4 |

6. Double-check there are no extra spaces before/after any pasted value.
7. Click **Deploy**.
8. Wait 1–2 minutes while Vercel builds your app. You'll see a progress log;
   when it's done you'll see a "Congratulations" screen with a preview image.
9. Click the preview image or the domain link (something like
   `reading-tracker-yourname.vercel.app`) to open your live app.

---

## Part 6: First login

1. You should see a login screen. Enter the `APP_PASSWORD` you set in Part 4.
2. You're in — you should see an empty tracker with "+ Add entry" available.
3. Add a book to confirm everything works end to end.

**Bookmark your Vercel URL** — that's your permanent app address. You can
open it from your phone too, it'll work the same way.

---

## Troubleshooting

**"Deploy failed" on Vercel with a red error log:**
Click the failed deployment to read the error. The most common cause is a
typo in one of the environment variable names or values — go to your
Vercel project → **Settings → Environment Variables**, fix it, then go to
the **Deployments** tab and click the **⋯** menu on the latest one →
**Redeploy**.

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
