# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BITS in Motion is an existing Smart India Hackathon prototype (Problem Statement 26196): a hostel-friendly fitness companion with camera-based exercise coaching, guest/Google auth, saved plans and a leaderboard. This is an **existing, working application** — inspect current code and Git history before changing anything; do not rebuild from scratch.

## Multi-Agent Protocol (Shared with Codex & Gemini)

This repository is worked on cooperatively by multiple coding agents: **Codex**, **Gemini / Antigravity**, and **Claude Code**.

### START OF SESSION
- Read `PROJECT_STATE.md` first before planning or modifying code. (`PROJECT_STATE.md` is authoritative for project/handoff state).
- Determine the live repository state using Git (Git is authoritative for live HEAD):
  - `git status`
  - `git rev-parse HEAD`
  - `git log -5 --oneline`
- Confirm current HEAD before modifying anything.
- Preserve work from other agents — never overwrite another agent's working implementation simply because it was created by a different agent.

### END OF MEANINGFUL WORK
- Run appropriate tests/build (`npm test`, `npm run build`, and `node scripts/verify-browser.mjs` when navigation/UI flows change).
- Update `PROJECT_STATE.md` with:
  - agent used (`Claude Code`)
  - what changed and files affected
  - meaningful application/deployment checkpoint hash (noting that stored commit hashes describe meaningful checkpoints, not necessarily docs-only commits)
  - verifications performed
  - deployment status
  - known open issues
  - exact recommended next step
- Record exactly what changed and what remains.
- Never claim deployment or verification occurred unless actually verified against the live environment.

### Core Development Rules (from AGENTS.md)
- Preserve working functionality, the visual identity/design system, and responsive/mobile behavior.
- Do not create duplicate screens/components/utilities when an existing implementation can be extended.
- Fix root causes, not cosmetic workarounds. Prefer focused changes over large speculative rewrites.
- Navigation and browser Back must keep working naturally (see Navigation architecture below).
- Never hard-code or expose secrets/credentials/env vars. Be especially careful with auth, database and deployment config.

## Commands

```bash
npm install
cp .env.example .env.local        # fill in GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_ID, DATABASE_URL, SESSION_SECRET
npm run db:setup                  # applies schema + seeds exercises (requires DATABASE_URL)
npm run dev                       # Vite dev server on :5173; the /api handler runs in-process (see vite.config.js)
npm test                          # vitest run — all suites
npm test -- <pattern>             # run a single test file/suite, e.g. npm test -- squatStateMachine
npm run build                     # production build to dist/
npm run preview                   # serve the production build on :4173
node scripts/verify-browser.mjs   # headless-Chrome end-to-end smoke test against a running dev server (mocks API/Google)
```

Node 20+ and a Chromium-based/Safari browser are required. Camera access needs localhost or HTTPS. `SESSION_SECRET` must be ≥32 chars (`openssl rand -hex 32`). Guest mode and the app shell work fully without any Google/database env vars — account sync features degrade gracefully when unconfigured (`api.status()` reports `databaseConfigured`/`googleConfigured`).

## Architecture

### Three persistence modes, one UI
The app runs in exactly one of `visitor` / `guest` / `demo` / `signed-in` auth status at a time (`auth.status` in `src/App.jsx`). This drives which storage backend is used:
- **guest** — profile/plan/sessions read and written only via `src/utils/storage.js` (`localStorage`), never touches the network.
- **demo** (Judge Demo) — an in-memory-only `JUDGE_PROFILE` with fabricated history from `createJudgeDemoHistory()`; nothing persists anywhere, by design (isolates the judging flow from real data).
- **signed-in** — everything goes through `src/services/api.js` → `/api?action=...` → `server/handler.js` → Postgres (Neon). Google accounts never fall back to guest `localStorage`.

`src/App.jsx` is the single stateful root: it owns `screen`, `profile`, `plan`, `sessions`, `auth`, etc., and every screen component is presentation-only, receiving callbacks (`onNavigate`, `onSubmit`, `onStartCoach`, ...) from here. When modifying flows, the branching logic in `App.jsx` (`handleProfileSubmit`, `handleCreatePlan`, `handleEndSession`, `handleSaveResult`) is the place to look — each has parallel guest/demo/signed-in branches that must be kept in sync.

### Navigation
There is no router library. `src/utils/navigation.js` defines the whitelist of screens (`APP_SCREENS`) and `resolveRequestedScreen()`, which decides what a requested hash actually resolves to based on `activeAccount` and `profileComplete` (e.g. an incomplete profile always redirects to `profile`; screens require an active account except `welcome`/`leaderboard`). `App.jsx`'s `routeTo`/`updateLocation` push a custom depth-tracking object onto `window.history.state` (`bitsMotionDepth`) so `goBack()` can call `window.history.back()` only when there's real history, otherwise it replaces to `welcome`. Completing a workout never unlocks additional navigation — screens gate on profile completeness, not workout completion.

### Server API (single handler, action-based routing)
There is one API entry point (`server/handler.js`, mounted at `/api`), dispatched by a single `?action=` query param (`status`, `auth-google`, `me`, `profile`, `plan`, `sessions`, `leaderboard`, `logout`) rather than REST paths. `vite.config.js` wires this same handler into the dev server middleware; `api/index.js` is the Vercel serverless wrapper — both call the identical `handleApiRequest`, so behavior must stay path-agnostic.

Request flow: `validateMutationRequest` (origin/CSRF checks via a custom `X-Bits-Motion-Request` header + `Sec-Fetch-Site` + Origin/Host match) → session cookie lookup (`server/session.js`, HMAC-signed, stateless, no server-side session store) → per-action handler → Postgres via `server/db.js` (`@neondatabase/serverless`, raw SQL, no ORM). Auth is Google Identity Services ID-token verification (`google-auth-library`), not OAuth redirect flow. `server/schema.js` holds both `CREATE TABLE IF NOT EXISTS` DDL and the seed exercise catalogue (`EXERCISE_SEED`); schema changes belong there, and migrations are additive/idempotent (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) rather than versioned migration files.

Workout plans are generated server-side from a profile + the exercise catalogue in `server/recommendation.js` (`buildPlan`) for signed-in users, but client-side in `src/utils/workoutRecommendation.js` (`generateWorkoutPlan`) for guest/demo — these two implementations must be kept behaviorally consistent when recommendation rules change.

### Camera coach / pose vision pipeline
`src/vision/` implements one common interface (`createExerciseDetector` in `exerciseDetectors.js`) over four exercises (squats, push-ups, crunches, jumping-jacks), each configured in `DETECTOR_CONFIGS`. The pipeline per frame is: `poseLandmarker.js` (MediaPipe Pose Landmarker Lite init + GPU→CPU fallback) → `exerciseMeasurements.js` (per-exercise landmark measurements, e.g. joint angles via `angle.js`'s three-point calculation) → a state machine (`squatStateMachine.js` for squats specifically; `cycleStateMachine.js` — a generic start/target-state cycle counter — for the other three) → `classify()` derives a discrete phase from the measurement → `feedbackFor()` produces prioritized, held (debounced) UI cues. Only a full Standing→Down→Standing (or equivalent) cycle with sufficient landmark visibility counts as a rep; low-visibility frames reset the candidate state rather than incrementing anything. `CoachScreen.jsx` is lazy-loaded (`lazy(() => import(...))` in `App.jsx`) since MediaPipe/WASM is heavy.

This is 2D observational feedback (not medical/posture-correctness guidance) — keep that framing when touching detector thresholds or copy.

### Calorie/BMI/impact utilities
`src/utils/calories.js`, `src/utils/bmi.js`, `src/utils/workoutImpact.js` are pure functions operating on profile + session metrics; `estimated kcal = exercise MET × weight(kg) × duration(hours)`, with per-exercise MET values duplicated between `src/vision/exerciseDetectors.js` (`DETECTOR_CONFIGS[...].met`, used live) and `server/schema.js` (`EXERCISE_SEED`, used for saved-session estimates) — check both when adjusting MET values.

## Key docs (read before large changes)
- `docs/LOW_LEVEL_DESIGN.md` — detailed system design/diagrams.
- `docs/AUTH_DATABASE_DEPLOYMENT.md` — Neon/Google Cloud/Vercel setup, beginner-oriented.
- `docs/V2_PRODUCT_EXPERIENCE.md` — navigation, onboarding, preferred-name/plan persistence rules, and the checklist to run before shipping navigation/auth changes.
- `PROJECT_STATE.md` — current live handoff state between agents; read it first each session, and update it after significant work.
