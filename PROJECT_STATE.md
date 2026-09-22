# BITS in Motion — Current Project State

## Current Repository State
- **Branch**: `feature/google-auth-user-database`
- **Current Live Repository HEAD**: Dynamic — inspect dynamically at session start using Git (`git rev-parse HEAD`). Git is authoritative for live HEAD.
- **Last Application/Source Checkpoint**: `a52af438d76ab2792059f9ecd27125122917c5f9` (PR #2 merge commit) / `66d90c07b214745cf8d2a809238fe78e121d8777` (feature commit)
- **Origin Synchronization**: `origin/feature/google-auth-user-database` tracks this branch.
- **Branch Topology**: No local `main` branch exists; no remote `origin/main` branch exists.
- **Working Tree State**: Clean. Homepage UX, Dedicated Pages, Anonymous Camera Preview, and `coachReturnScreen` bug fix are merged into `feature/google-auth-user-database` and live in production.
- **Note on Commit Hashes**: Stored commit hashes in this document describe meaningful application/deployment checkpoints, not necessarily the latest documentation-only repository commit.

## Production State
- **Production URL**: `https://bits-in-motion-feature.vercel.app`
- **Production Application Checkpoint**: `a52af438d76ab2792059f9ecd27125122917c5f9`
- **Deployment Status**: Production is fully deployed and verified live on Vercel at `https://bits-in-motion-feature.vercel.app` matching checkpoint `a52af43` (assets `index-BjUcaeCQ.js`, `index-BMIMgdvC.css`, `CoachScreen-CbEh4cX8.js`).
- **Google Configuration**: `googleConfigured: true` (verified live via production `/api?action=status`).
- **Neon Database Configuration**: `databaseConfigured: true` (verified live via production `/api?action=status`).

## Last Completed Development
- **Latest Relevant Commits**:
  - `a52af43` Merge pull request #2 from chaudharynehal/feature/homepage-ux-enhancements
  - `66d90c0` feat: enhance homepage experience and navigation
  - `357e522` docs: add catch-up shorthand for agents
  - `86ed8e1` docs: synchronize multi-agent project handoff
  - `dab04d0` Fix premature profile save when editing existing completed profile
- **What Antigravity / Gemini Changed (Merged in PR #2 & Deployed to Production)**:
  1. **Removed Launch Skip Button**:
     - Removed the "Skip" button from `src/components/LaunchScreen.jsx` and its unused callback.
     - Removed obsolete `.launch-skip` styles from `src/styles/global.css`.
  2. **Anonymous Camera Coach Preview Mode**:
     - Upgraded Homepage "Camera-guided movement" and "Live Camera Coach" CTAs to launch an immediate anonymous Camera Coach preview at `#preview` without requiring Google sign-in, Guest activation, profile completion, or workout plan generation.
     - Modeled as a distinct zero-persistence mode: strictly restricted to camera-supported movements (`squats`, `pushups`, `crunches`, `jumping-jacks`), rendered with a distinct banner ("Preview Mode — this session will not be saved"), and equipped with an in-place preview completion modal.
     - Absolute data isolation: 0 database writes, 0 localStorage session items created, and zero data transfer to subsequent guest or Google sign-in sessions.
  3. **Dedicated Features Screen (`#features`)**:
     - Created `src/screens/FeaturesScreen.jsx` showcasing real application capabilities: Personalized Workout Plans, AI Camera Coach (MediaPipe 33 pose landmarks), Exercise Library, Profile & Fitness Preferences, Progress & History, Dual Modes (Guest vs Signed-In Account), Campus Leaderboard, Anonymous Preview, and Tech Stack.
  4. **Dedicated How It Works Screen (`#how-it-works`)**:
     - Created `src/screens/HowItWorksScreen.jsx` detailing the 3 user journeys (Anonymous Preview, Guest Experience, Signed-In Account) and explaining the technical local-vision execution loop.
  5. **Dedicated Terms & Conditions / Trust Page (`#terms`)**:
     - Created `src/screens/TermsScreen.jsx` with a 16-section Trust & Safety Center. Real disclosures regarding on-device vision processing, zero video recording or uploads, Guest localStorage vs Neon PostgreSQL persistence, health & physical activity disclaimer, AI accuracy limitations, and hackathon POC status (no false compliance or certification claims).
  6. **Homepage Visual Enhancement**:
     - Redesigned hero section in `src/screens/WelcomeScreen.jsx` and `src/styles/global.css` with a responsive Camera Coach preview card featuring a live viewfinder, pose skeleton geometry, biomechanical knee angle arc, HUD feedback pills, and pipeline ribbon.
     - Polished CTA layout and added a comprehensive footer with links to Terms & Conditions and SIH 2026 project context.
  7. **Resolved `coachReturnScreen` Navigation Bug**:
     - Updated `handleCoachBack` in `src/App.jsx` to read and navigate to `coachReturnScreen` when set, instead of blindly falling back to `goBack()`.
     - In `handleProfileSubmit`, coach navigation now uses `{ replace: true }`, preventing history loops and eliminating returning to completed profile screens upon clicking Back.
  8. **Navigation Architecture**:
     - Updated `src/utils/navigation.js` and `src/utils/navigation.test.js`: added `'features'`, `'how-it-works'`, `'terms'`, and `'preview'` to `APP_SCREENS` and `PUBLIC_SCREENS`. Ensured public screens bypass profile completion checks.
  9. **Browser Verification Suite**:
     - Updated `scripts/verify-browser.mjs` to comprehensively test Anonymous Camera Preview (direct logged-out access, zero persistence, exercise switching, Back/Home routing), normal-motion intro auto-transition without skip button, public screen history/navigation/refresh, and fixed empty-hash assertions.

## Verification
- **Unit & Integration Tests**: `npm test` — 9 test suites, 52/52 tests passing.
- **Production Build**: `npm run build` — Vite v6 production build passes cleanly in 1.07s with zero errors or warnings.
- **Browser Verification Suite**: `node scripts/verify-browser.mjs` — 20/20 checks passing with 0 JavaScript errors.
- **Live Production Verification**: 11/11 live checks verified against `https://bits-in-motion-feature.vercel.app/` (intro auto-transition without skip, camera card visual, anonymous preview, 4 camera exercises, dedicated features/how-it-works/terms pages, navigation, guest CTA, `/api?action=status`).

## Known Open Issues
- **`coachReturnScreen` Write-Only State (Navigation)**: **RESOLVED** in `src/App.jsx`.
- **Other Open Issues**: None.

## Work In Progress
- `None` — Homepage UX enhancements and Trust pages merged and live in production.

## Pending External Contributions
- **Tisha's Branch & PR #1 (`tisha-db`)**: PR #1 ("feat: add low-impact exercise personalization rules and catalog metadata") remains pending and untouched, awaiting dedicated review and reconciliation.

## Recommended Next Step
- Safely review, reconcile, and integrate Tisha's personalization work from `origin/tisha-db` (PR #1) under a dedicated review flow.

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
