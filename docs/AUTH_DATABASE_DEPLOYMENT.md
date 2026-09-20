# Authentication, Database, and Vercel Setup

This guide is written for a first-time setup. Follow it from top to bottom. The application keeps its existing React + Vite frontend, Vercel `/api` function, Google Identity Services login, Neon PostgreSQL database, and browser-only guest mode.

## What is stored where

| Mode | Profile | Plans and workout history | Works across devices? |
|---|---|---|---|
| Google account | Neon PostgreSQL | Neon PostgreSQL | Yes |
| Guest | This browser's `localStorage` | This browser's `localStorage` | No |
| Judge Demo | Temporary in-memory profile | Temporary, clearly marked sample history | No |

Guest information is never imported into a Google account automatically. A new Google account starts with an empty account profile even when the same browser already has guest data.

## Environment variables

The project uses exactly four environment variables:

| Name | Used by | Where the value comes from | Secret? |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Browser Google button | Google Cloud Web OAuth client ID | Public identifier |
| `GOOGLE_CLIENT_ID` | Server ID-token verification | The same Google Cloud Web OAuth client ID | Public identifier, but keep it in server configuration too |
| `DATABASE_URL` | Server and database setup | Neon connection string | Yes |
| `SESSION_SECRET` | Server cookie signing | `openssl rand -hex 32` | Yes |

Only variables beginning with `VITE_` are included in browser code. Never rename `DATABASE_URL` or `SESSION_SECRET` to begin with `VITE_`.

The real `.env.local` file is ignored by Git. `.env.example` contains placeholders only.

## Local setup

### 1. Install the prerequisites

Install Node.js 20 or newer. Node.js 22 LTS is a good choice. Confirm it is available:

```bash
node --version
npm --version
```

### 2. Open a terminal in the project folder

The correct folder contains `package.json`, `src`, `server`, and `api`.

### 3. Install the locked dependencies

```bash
npm install
```

`package-lock.json` is already present. Do not delete it.

### 4. Create the local environment file

```bash
cp .env.example .env.local
```

Generate a strong session-cookie secret:

```bash
openssl rand -hex 32
```

Copy the generated text into `SESSION_SECRET` in `.env.local`. Do not post that value in screenshots, chat, GitHub, or documentation.

After completing the Neon and Google sections below, `.env.local` should have this shape:

```dotenv
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
DATABASE_URL=YOUR_NEON_POSTGRESQL_CONNECTION_STRING
SESSION_SECRET=YOUR_RANDOM_64_CHARACTER_VALUE
```

Do not put quotes around values unless the value itself requires them. Do not add spaces around `=`.

### 5. Initialize the database

```bash
npm run db:setup
```

This command creates missing tables and indexes and seeds the shared exercise catalogue. It does not drop tables or erase users. Run it once for every new Neon database and again after pulling a version that contains a schema addition.

### 6. Start the application and API together

```bash
npm run dev
```

Open `http://localhost:5173`.

There is no second backend command. During local development, the Vite plugin in `vite.config.js` mounts the same `server/handler.js` code at `/api` that Vercel uses in production.

### 7. Run verification

```bash
npm test
npm run build
npm run preview
```

`npm run preview` serves the already-built frontend for a visual check. For full local account/API testing, use `npm run dev`.

## Neon PostgreSQL setup

Neon's interface can change slightly, but the concepts and names below remain the same. See [Neon's connection guide](https://neon.com/docs/get-started/connect-neon) if a button has moved.

### 1. Create the project and database

1. Open [console.neon.tech](https://console.neon.tech/) and sign in.
2. Select **New Project** or **Create Project**.
3. Choose a project name, a nearby region, and the default supported PostgreSQL version.
4. Neon normally creates a default database named `neondb`. You may use it. If you create a separate database, select **Databases**, choose **New Database**, and name it something such as `bits_in_motion`.
5. Open the project dashboard and select **Connect**.
6. Select the correct branch, database, and role.
7. Copy the PostgreSQL connection string. A pooled connection is appropriate for a serverless Vercel application when Neon offers that choice.
8. Paste the entire connection string after `DATABASE_URL=` in `.env.local`.

A Neon connection string resembles this shape; this is not a real credential:

```text
postgresql://role:password@host/database?sslmode=require
```

Treat the password inside the connection string as a secret.

### 2. Create the schema

From the project folder, run:

```bash
npm run db:setup
```

Expected success message:

```text
BITS in Motion database schema and exercise catalogue are ready.
```

If the command says `DATABASE_URL is required`, check that `.env.local` is in the same folder as `package.json` and that the variable name is spelled exactly.

### 3. Verify tables in Neon SQL Editor

1. In Neon, open **SQL Editor**.
2. Select the same branch and database used in `DATABASE_URL`.
3. Run this safe inspection query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:

- `users`
- `profiles`
- `exercises`
- `workout_plans`
- `plan_items`
- `sessions`
- `exercise_results`

### 4. Safe data inspection queries

These commands only read data:

```sql
SELECT * FROM users ORDER BY created_at DESC;
```

```sql
SELECT * FROM profiles;
```

```sql
SELECT * FROM sessions ORDER BY completed_at DESC;
```

```sql
SELECT * FROM workout_plans ORDER BY created_at DESC;
```

```sql
SELECT * FROM exercise_results;
```

To see which profile belongs to which account without exposing Google subject IDs in the application:

```sql
SELECT
  u.email,
  u.display_name,
  p.age,
  p.height_cm,
  p.weight_kg,
  p.goal,
  p.updated_at
FROM users AS u
LEFT JOIN profiles AS p ON p.user_id = u.id
ORDER BY u.created_at DESC;
```

To inspect session ownership:

```sql
SELECT
  u.email,
  s.id AS session_id,
  s.completed_at,
  s.duration_seconds,
  s.estimated_calories
FROM sessions AS s
JOIN users AS u ON u.id = s.user_id
ORDER BY s.completed_at DESC;
```

Do not use `DROP TABLE`, `TRUNCATE`, or broad `DELETE` commands during normal setup.

## Google Sign-In setup

The application uses Google Identity Services only for identity. It does not request Google Drive, Gmail, Calendar, or other sensitive scopes. Google's default `openid`, `email`, and `profile` identity information is sufficient. See Google's [Web client ID setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

### 1. Configure Google Auth Platform

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select the project for BITS in Motion.
3. Open **Google Auth Platform**.
4. Complete **Branding** with the application name, support email, and developer contact email.
5. Open **Audience**. For a public/student application choose **External**. While developing, leave publishing status as **Testing**.
6. If the application is in Testing, add every Google account that must log in under **Test users**. Account A and Account B used for switching tests must both be listed.
7. Open **Data Access**. Do not add unrelated or sensitive Google API scopes; basic sign-in identity is enough.

### 2. Create the Web OAuth client

1. Open **Clients** in Google Auth Platform (or **APIs & Services → Credentials** if the older interface is shown).
2. Select **Create Client** or **Create Credentials → OAuth client ID**.
3. For **Application type**, select **Web application**.
4. Give the client a clear name such as `BITS in Motion Web`.
5. Under **Authorized JavaScript origins**, add exactly:

```text
http://localhost:5173
```

6. After Vercel provides the stable production domain, add it as another origin:

```text
https://MY-PROJECT.vercel.app
```

Use your real Vercel domain. An origin contains only the scheme and hostname: no path, no `/api`, and no trailing route. Google normally does not require an authorized redirect URI for this callback-based Sign in with Google button.

7. Create the client and copy the client ID ending in `.apps.googleusercontent.com`.
8. Put the same client ID in both variables:

```dotenv
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

The server independently verifies every Google ID token against `GOOGLE_CLIENT_ID`. It never trusts an email or Google user ID sent separately by the browser.

### 3. Fix `origin_mismatch`

If Google shows `origin_mismatch`:

1. Read the exact origin in the browser address bar.
2. Add that exact scheme and hostname to **Authorized JavaScript origins** for the same Web client ID.
3. Confirm there is no path or extra slash in the configured origin.
4. Confirm `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` both use that client.
5. Save the Google configuration, wait a few minutes, restart the local server or redeploy Vercel, and try again.

Every changing Vercel preview URL would need to be registered separately. Prefer testing Google login on localhost and the stable production domain, or register a stable branch preview domain deliberately.

## Database relationships and user isolation

```text
users
├── profiles (one profile per user)
├── workout_plans
│   └── plan_items
└── sessions
    └── exercise_results

exercises (shared definitions referenced by plans and results)
```

Google's verified `sub` value has a unique constraint. The first login creates one internal UUID. Returning logins with the same verified `sub` update basic display information and reuse the same UUID.

The browser never chooses ownership. The API reads the signed HttpOnly cookie, finds its internal user, and applies that user ID to every profile, plan, and session query. A `userId` placed in a query string or JSON request body is ignored.

Workout definitions in `exercises` are global. Profiles, plans, sessions, and results are private. The leaderboard is an explicit opt-in aggregate and does not expose profiles, measurements, email addresses, or private history.

## Vercel deployment

Vercel detects Vite and deploys files under `api/` as Node.js functions. See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) and [environment-variable guide](https://vercel.com/docs/environment-variables).

### 1. Prepare the database first

Use the production Neon connection string in local `.env.local` and run:

```bash
npm run db:setup
```

The production build intentionally does not run schema setup automatically. This prevents every deployment or API cold start from attempting schema changes.

### 2. Import the Git repository

1. Push the project to GitHub using the instructions below.
2. Open [vercel.com/new](https://vercel.com/new).
3. Import the GitHub repository.
4. If the repository contains only this app, leave **Root Directory** at the repository root. Otherwise select the folder containing this `package.json`.
5. Confirm **Framework Preset** is **Vite**.
6. Confirm **Build Command** is `npm run build`.
7. Confirm **Output Directory** is `dist`.
8. Select a supported Node.js version of 20 or newer in Project Settings. The repository declares Node 20+.

`vercel.json` already records the Vite build/output settings and safe browser headers. The `/api` function uses the default Node.js runtime.

### 3. Add environment variables

In the Vercel project, open **Settings → Environment Variables** and add:

```text
VITE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_ID
DATABASE_URL
SESSION_SECRET
```

Use the same Google Web client ID for the first two. Use the production Neon connection string for `DATABASE_URL`. Generate a new production `SESSION_SECRET` with `openssl rand -hex 32`; do not reuse a secret exposed anywhere else.

Apply the variables to **Production**. Apply appropriate values to **Preview** only if preview deployments should use account login and a database. Mark `DATABASE_URL` and `SESSION_SECRET` as sensitive when Vercel offers that option.

Environment-variable changes affect only new deployments, so redeploy after adding or changing them. `VITE_GOOGLE_CLIENT_ID` is included at frontend build time and definitely requires a new build.

### 4. Register and test the production domain

1. Complete the Vercel deployment.
2. Copy the stable production URL, for example `https://my-project.vercel.app`.
3. Add that exact value to Google's **Authorized JavaScript origins**.
4. Save the Google client settings and allow a few minutes for propagation.
5. Redeploy if any Vercel variable changed.
6. Open this safe status URL in a browser:

```text
https://MY-PROJECT.vercel.app/api?action=status
```

It should report `databaseConfigured: true` and `googleConfigured: true`. It never returns secret values.

## Mandatory account-switching acceptance test

Use two real Google test accounts and a separate guest profile.

### Account A

1. Open the application and choose **Continue with Google**.
2. Sign in as Account A.
3. Create a profile with an unmistakable value, such as weight `70`.
4. Generate a plan and finish/save a session.
5. Refresh or close and reopen the app.
6. Confirm Account A's profile, saved plan, and session return.

### Account B

1. Sign out from Account A.
2. Confirm Account A's name/profile disappears immediately.
3. Choose **Continue with Google** and sign in as Account B.
4. Confirm Account B starts empty and cannot see Account A's profile, plan, progress, or session.
5. Create a different profile, such as weight `88`, and save a session.

### Return to Account A

1. Sign out from Account B.
2. Sign in as Account A.
3. Confirm weight `70` and Account A's original records return.
4. Confirm Account B's values do not appear.

### Guest

1. Sign out.
2. Choose **Continue as Guest**.
3. Create a guest profile and save a guest session.
4. Confirm the UI says the data is on-device.
5. Sign in as Account A again.
6. Confirm guest profile/history never replaces or appears in Account A's data.

### Different browser or incognito window

1. Open a clean browser or incognito window.
2. Sign in as Account A.
3. Confirm Account A's database profile, plan, and history load even though that browser has no guest `localStorage`.

If an account database request fails, Progress must show an error and Retry button. Seeing guest history instead is a failure.

## Git and GitHub

This extracted folder may not include the original `.git` history. Check first:

```bash
git status
```

If it is already a Git repository:

```bash
git switch -c feature/google-auth-user-database
git status
git add .
git status
git commit -m "feat: add persistent Google authentication and user data isolation"
git push -u origin feature/google-auth-user-database
```

If `git status` says this is not a Git repository, create a new GitHub repository with no generated README, then run:

```bash
git init
git switch -c feature/google-auth-user-database
git add .
git status
git commit -m "feat: add persistent Google authentication and user data isolation"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin feature/google-auth-user-database
```

Before committing, inspect `git status`. Do not continue if it lists `.env`, `.env.local`, `node_modules`, `dist`, a database credential, or any downloaded private credential file. Those items are ignored by the included `.gitignore`.

## Common problems

### Google button says setup is needed

Check that all four variables exist locally or in Vercel. Both Google variables must use the same Web client ID. Restart `npm run dev` after editing `.env.local`, or redeploy Vercel after editing production variables.

### Account sync says the database is not initialized

Run:

```bash
npm run db:setup
```

Confirm it uses the same `DATABASE_URL` as the deployed Vercel environment.

### Database connection fails

Copy a fresh connection string from Neon's **Connect** dialog. Confirm the selected branch/database are correct and `?sslmode=require` remains present when Neon supplies it.

### Logout or account switching looks wrong

Wait for the sign-out request to finish, then choose Google again. The app calls Google's auto-selection reset so a different account can be chosen. If the network failed during logout, reconnect and press sign out again before switching.

### Progress shows a sync error

Use **Retry**. Signed-in progress intentionally remains empty during the error; it will not borrow guest or Judge Demo history.

## Security summary

- Google ID tokens are verified on the server with `google-auth-library` and the configured audience.
- The server uses Google's verified subject, email, name, and avatar; it does not accept browser-supplied identity ownership.
- Sessions use signed, expiring, HttpOnly, SameSite cookies and Secure cookies on Vercel/production.
- Authenticated mutations require a same-origin browser marker and reject cross-site requests.
- SQL parameters are passed separately from SQL text.
- Request sizes, methods, field types, ranges, dates, and exercise IDs are validated.
- Private SQL reads and writes use the authenticated internal user ID.
- Session retries use a user-scoped client session UUID to avoid duplicate history.
- Database schema setup runs only through `npm run db:setup`, not on every API request.
- Raw stack traces and credentials are never returned by the API.
- Camera frames remain in the browser and are not stored by the account system.
