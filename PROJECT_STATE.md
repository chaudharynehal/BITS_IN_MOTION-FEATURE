# BITS in Motion — Current Project State

## Current Repository State
- **Branch**: `feature/google-auth-user-database`
- **Current Live Repository HEAD**: Dynamic — inspect dynamically at session start using Git (`git rev-parse HEAD`). Git is authoritative for live HEAD.
- **Last Application/Source Checkpoint**: `dab04d0824fe169547eb3919307334f346f2d874`
- **Origin Synchronization**: `origin/feature/google-auth-user-database` tracks this branch.
- **Branch Topology**: No local `main` branch exists; no remote `origin/main` branch exists.
- **Working Tree State**: Uncommitted local work implementing Homepage UX, Dedicated Features / How It Works / Terms pages, Anonymous Camera Preview mode, and the `coachReturnScreen` navigation resolution.
- **Note on Commit Hashes**: Stored commit hashes in this document describe meaningful application/deployment checkpoints, not necessarily the latest documentation-only repository commit.

## Production State
- **Production URL**: `https://bits-in-motion-feature.vercel.app`
- **Production Application Checkpoint**: `dab04d0824fe169547eb3919307334f346f2d874`
- **Deployment Status**: Production is deployed to application checkpoint `dab04d0`.
- **Google Configuration**: `googleConfigured: true` (verified live via production `/api?action=status`).
- **Neon Database Configuration**: `databaseConfigured: true` (verified live via production `/api?action=status`).

## Last Completed Development
- **Latest Relevant Commits**:
  - `dab04d0` Fix premature profile save when editing existing completed profile
  - `10d22b7` Stabilize navigation browser verification
  - `b92b0f8` Add shared Codex Gemini project context
  - `0ba436a` WIP checkpoint before Gemini handoff
  - `e03348c` feat: add dashboard onboarding and flexible fitness navigation
- **What Antigravity / Gemini Changed (Current Uncommitted Work)**:
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
     - Updated `scripts/verify-browser.mjs` to comprehensively test Anonymous Camera Preview (direct logged-out access, zero persistence, exercise switching, Back/Home routing), public screen history/navigation/refresh, and fixed empty-hash assertions.

## Verification
- **Unit & Integration Tests**: `npm test` — 9 test suites, 52/52 tests passing.
- **Production Build**: `npm run build` — Vite v6 production build passes cleanly in 1.16s with zero errors or warnings.
- **Browser Verification Suite**: `node scripts/verify-browser.mjs` — 20/20 checks passing with 0 JavaScript errors, covering:
  - Reduced-motion launch screen without skip button.
  - Normal-motion launch screen rendering without skip button and automatic transition to Homepage.
  - Screenshots at 390px, 768px, 1440px with zero horizontal overflow.
  - Dedicated Features, How It Works, and Terms screens navigation, history (Back/Forward), and reload.
  - Anonymous Camera Preview: logged-out direct access, zero persistence, exercise switching, and safe exit.
  - Guest onboarding Back/Forward, Home, and draft restoration.
  - Retained guest plan, direct coach access, and `coachReturnScreen` routing back to caller.
  - Account A onboarding, profile alias API contract, and Step 3 non-premature save.
  - Logout/login isolation between accounts A and B.
  - Error state recovery and leaderboard live fallback.

## Known Open Issues
- **`coachReturnScreen` Write-Only State (Navigation)**: **RESOLVED** in `src/App.jsx`.
- **Other Open Issues**: None.

## Work In Progress
- Completed Homepage/UX work sitting on feature branch `feature/homepage-ux-enhancements`. Ready for push and pull request.

## Recommended Next Step
- Push `feature/homepage-ux-enhancements` to origin and open a Pull Request into `feature/google-auth-user-database`.
- Review Vercel preview deployment generated for `feature/homepage-ux-enhancements`. Do not manually promote to production until merged.

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
