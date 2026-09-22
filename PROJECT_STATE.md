# BITS in Motion — Current Project State

## Current Repository State
- **Branch**: `feature/google-auth-user-database`
- **Current Live Repository HEAD**: Dynamic — inspect dynamically at session start using Git (`git rev-parse HEAD`). Git is authoritative for live HEAD.
- **Last Application/Source Checkpoint**: `dab04d0824fe169547eb3919307334f346f2d874`
- **Origin Synchronization**: `origin/feature/google-auth-user-database` tracks this branch.
- **Branch Topology**: No local `main` branch exists; no remote `origin/main` branch exists.
- **Working Tree State**: Tracked files were clean prior to multi-agent synchronization. The synchronization adds `CLAUDE.md` and updates `AGENTS.md`, `GEMINI.md`, and `PROJECT_STATE.md`.
- **Note on Commit Hashes**: Stored commit hashes in this document describe meaningful application/deployment checkpoints, not necessarily the latest documentation-only repository commit.

## Production State
- **Production URL**: `https://bits-in-motion-feature.vercel.app`
- **Production Application Checkpoint**: `dab04d0824fe169547eb3919307334f346f2d874`
- **Deployment Status**: Production is fully deployed and current with application checkpoint `dab04d0`.
  - Frontend production asset hashes in Vercel match the local build output (`dist/assets/index-Dhi01PQa.js`, `dist/assets/CoachScreen-_5Bg24WY.js`, `dist/assets/index-DpRoKUnm.css`).
  - No deployment is currently required.
- **Google Configuration**: `googleConfigured: true` (verified live via production `/api?action=status`).
- **Neon Database Configuration**: `databaseConfigured: true` (verified live via production `/api?action=status`).

## Last Completed Development
- **Latest Relevant Commits**:
  - `dab04d0` Fix premature profile save when editing existing completed profile
  - `10d22b7` Stabilize navigation browser verification
  - `b92b0f8` Add shared Codex Gemini project context
  - `0ba436a` WIP checkpoint before Gemini handoff
  - `e03348c` feat: add dashboard onboarding and flexible fitness navigation
- **What Gemini Changed**:
  - Stabilized the navigation browser verification suite in `scripts/verify-browser.mjs` (anchored viewport scroll checks) and removed vestigial `onBack` prop in `src/screens/LeaderboardScreen.jsx` (commit `10d22b7`).
  - Diagnosed and resolved the profile wizard premature-save regression when editing an existing completed profile in `src/screens/ProfileScreen.jsx` (commit `dab04d0`).
- **Latest Bug Fix Details (`dab04d0`)**:
  - **Defect**: When an authenticated user with an already-completed profile edited their profile, clicking "Continue" on Step 2 to navigate to Step 3 triggered an immediate form submission and redirected away, preventing the user from reviewing or modifying Step 3 setup fields. (First-time onboarding was unaffected because empty required fields stopped premature submission).
  - **Root Cause**: The Step 1/2 "Continue" button (`type="button"`) and the Step 3 "Save Profile" button (`type="submit"`) occupied the same conditional slot in `ProfileScreen.jsx` without unique React `key` props. React DOM element reuse mutated `button.type` to `'submit'` while native click event dispatch was in progress, firing a premature `submit` event.
  - **Resolution**: Added explicit `key="continue-step"` and `key="submit-profile"` to force DOM node replacement instead of in-place mutation. Added a dedicated 15-step regression test in `scripts/verify-browser.mjs` (`Editing existing completed profile stays on step 3 without premature save`).

## Verification
- **Unit & Integration Tests**: `npm test` — 9 test suites, 51/51 tests passing.
- **Production Build**: `npm run build` — Vite v6 production build passes cleanly.
- **Browser Regression Suite**: `node scripts/verify-browser.mjs` — 18/18 checks passing with 0 JS errors (includes regression assertion for `dab04d0`).
- **Manual / Unverified Scope**:
  - The browser regression suite mocks Google Identity Services and the backend API during local testing.
  - Physical camera hardware streaming was not repeated during automated onboarding tests (relies on MediaPipe stubs / manual camera testing).
  - Real authenticated Neon database writes were not re-executed during automated onboarding (covered by server unit tests and live status probes, but full end-to-end authenticated write flow with live Google credentials was not re-executed automatically).

## Known Open Issues
- **`coachReturnScreen` Write-Only State (Navigation)**:
  - `coachReturnScreen` is set in several navigation flows in `src/App.jsx` (e.g. camera-first onboarding, quick-start workouts) but is never actually read or consumed.
  - Exiting the Coach screen currently relies on `goBack()` / `window.history.back()`.
  - As a result, camera-first onboarding from the Profile screen into Coach can return to the completed Profile screen upon clicking Back, rather than the intended Plan or Dashboard destination.
  - *Status*: Verified open code issue. Do **NOT** fix in this synchronization task; flagged for a subsequent focused fix.
- **Other Verified Issues**: None.

## Work In Progress
- `None` — The repository is at a stable, clean checkpoint. No active feature or refactor is currently in flight.

## Recommended Next Step
- Do **NOT** commit, push, or deploy for deployment reasons — production is already current with application checkpoint `dab04d0`.
- The recommended next development step is:
  1. Open a focused task to resolve the `coachReturnScreen` navigation issue so that exiting Coach navigates to the explicit return destination when specified, instead of relying purely on browser history.
  2. Alternatively, if navigation behavior is considered acceptable for the current prototype milestone, proceed with approved SIH roadmap items (e.g. wearable heart rate sync, campus challenges) under user direction.

## Multi-Agent Handoff Protocol
This repository is developed cooperatively by multiple coding agents (**Codex**, **Gemini / Antigravity**, and **Claude Code**). To avoid regressions and conflicting assumptions:

1. **Every agent must read `PROJECT_STATE.md` first** before planning or modifying code. `PROJECT_STATE.md` is authoritative for project/handoff state.
2. **Determine live repository state using Git** (Git is authoritative for live HEAD):
   - `git status`
   - `git rev-parse HEAD`
   - `git log -5 --oneline`
3. **Never overwrite another agent's uncommitted work**: If untracked or uncommitted changes exist, pause and clarify before proceeding.
4. **Preserve working functionality and architecture**: Do not rewrite working modules or replace existing conventions simply because another agent authored them.
5. **Run verification after meaningful work**: Always run `npm test`, `npm run build`, and `node scripts/verify-browser.mjs`.
6. **Update `PROJECT_STATE.md` upon completion of meaningful work**:
   - Agent used (Codex, Gemini, Claude Code)
   - Meaningful application/deployment checkpoint hash (noting that stored commit hashes describe meaningful application/deployment checkpoints, not necessarily docs-only commits)
   - What was changed and why
   - Tests and builds performed
   - Production / deployment status
   - Known problems or open items
   - Exact recommended next step
