# Architecture Material Library

A personal workspace for managing architectural materials, cost schedules, and project specs. Built as a static single-page app backed by Supabase for cloud sync.

## Running locally

No build step or npm install required. Serve the directory with any static HTTP server and open it in a browser.

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

> **Do not open `index.html` directly as a `file://` URL.** The browser blocks the fetch requests Babel needs to load `.jsx` modules.

## Authentication

The credentials in `src/cloud-config.jsx` point to the owner's private Supabase workspace. Self-signup is disabled and access is restricted to an email allowlist, so a fresh clone will show a login screen you cannot get past.

You have two options:

**Option A — join the existing workspace:**  
Ask the owner to invite you (Supabase dashboard → Authentication → Users → Invite user) and add your email to the `allowed_emails` table.

**Option B — run your own instance:**  
Follow the steps below to set up a separate Supabase project.

## Setting up your own Supabase instance

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor (Project → SQL Editor → New query), paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Authentication → Providers → Email** and disable _Enable new user signups_ (do this after creating accounts).
4. Go to **Authentication → URL Configuration** and set the Site URL to where you'll serve the app (e.g. `http://localhost:8080` for local dev).
5. In `src/cloud-config.jsx`, replace the URL and anon key with your project's values (Project Settings → API):
   ```js
   window.CLOUD_CONFIG = {
     SUPABASE_URL:      'https://your-project-ref.supabase.co',
     SUPABASE_ANON_KEY: 'your-anon-key',
   };
   ```
6. Invite yourself: Authentication → Users → **Invite user** → enter your email. You'll receive a link to set a password.
7. Add your email to the access allowlist in the SQL editor:
   ```sql
   insert into allowed_emails (email) values ('you@example.com');
   ```

## Deploying

Push the repo to GitHub and enable GitHub Pages (Settings → Pages → source: `main` branch, root `/`). After deploying, update the Site URL in Supabase (Authentication → URL Configuration) to your Pages URL.

## Tech notes

- **No build tooling.** React 18 and Babel load from CDN; JSX files are transpiled in the browser.
- **Hard-refresh after pulling.** Browsers cache `.jsx` files aggressively — use `Cmd+Shift+R` / `Ctrl+Shift+R` to bust the cache.
- **Supabase schema** is in `supabase/schema.sql`. The `supabase/README.md` is a runbook for managing collaborators on an existing instance.
