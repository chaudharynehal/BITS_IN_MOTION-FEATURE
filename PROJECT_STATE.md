# BITS in Motion — Current Project State

## Current Repository State
- **Branch**: `tisha-db` (target / base: `feature/google-auth-user-database`)
- **Current Live Repository HEAD**: Dynamic — inspect dynamically at session start using Git (`git rev-parse HEAD`). Git is authoritative for live HEAD.
- **Base Branch Checkpoint**: `3df8d72` (PR #3 merge commit) / `428e95d` (Homepage UX feature commit)
- **Contributor Feature Commit**: `b9a38fe83a861a300837acd4549d19c1f28e90b4` (authored by Tisha)
- **PR**: PR #1 (`tisha-db` -> `feature/google-auth-user-database`)
- **Origin Synchronization**: Synchronized with latest `origin/feature/google-auth-user-database`
- **Working Tree State**: Cleaned branch retaining Tisha's original feature commit, with generator/workbook artifacts removed and base merged.
- **Note on Commit Hashes**: Stored commit hashes in this document describe meaningful application/deployment checkpoints, not necessarily the latest documentation-only repository commit.

## Production State
- **Production URL**: `https://bits-in-motion-feature.vercel.app`
- **Production Application Checkpoint**: `a52af438d76ab2792059f9ecd27125122917c5f9`
- **Deployment Status**: Production is fully deployed and verified live on Vercel at `https://bits-in-motion-feature.vercel.app` matching checkpoint `a52af43` (assets `index-BjUcaeCQ.js`, `index-BMIMgdvC.css`, `CoachScreen-CbEh4cX8.js`).
- **Google Configuration**: `googleConfigured: true` (verified live via production `/api?action=status`).
- **Neon Database Configuration**: `databaseConfigured: true` (verified live via production `/api?action=status`).
- **Database Schema Status**: Production schema is at previous migration state (without `impact` column). The additive `impact` column migration will be applied to database upon release.

## Last Completed Development
- **Latest Base Merged Commits**:
  - `3df8d72` Merge pull request #3 from chaudharynehal/feature/homepage-product-polish
  - `3f88db5` docs: record homepage product polish checkpoint 428e95d
  - `428e95d` feat: refine homepage UX, CTA hierarchy, and trust & safety screens
  - `243d069` docs: record production deployment of homepage UX enhancements
  - `a52af43` Merge pull request #2 from chaudharynehal/feature/homepage-ux-enhancements
  - `66d90c0` feat: enhance homepage experience and navigation
  - `dab04d0` Fix premature profile save when editing existing completed profile
- **Tisha Personalization Integration (PR #1 / `tisha-db`)**:
  - **Contributor**: Tisha (`Tishadummy17@gmail.com`)
  - **Original Feature Commit**: `b9a38fe83a861a300837acd4549d19c1f28e90b4`
  - **Core Capabilities**:
    1. **Exercise Catalogue Metadata**:
       - Added `impact` (`low`, `moderate`, `high`), `minLevel` (`Beginner`, `Intermediate`), `equipment` (`None`, `Backpack`), and `goalTags` (`stay-fit`, `strength`, `weight-management`) to [`src/data/exercises.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/src/data/exercises.js).
       - Added new `marching` exercise (`Low-impact marching`, 3.5 MET, `cameraSupported: false`).
    2. **Recommendation Engine Personalization**:
       - Both client ([`src/utils/workoutRecommendation.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/src/utils/workoutRecommendation.js)) and server ([`server/recommendation.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/server/recommendation.js)) apply identical rules:
         * Goal-based exercise filtering.
         * Fitness level filtering (`minLevel`).
         * Available time / duration filtering.
         * Equipment availability filtering (e.g. Backpack for rows).
         * Low-impact preference: substitutes `marching` for `jumping-jacks` when `profile.lowImpact === true`.
    3. **Schema & Database Updates**:
       - [`server/schema.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/server/schema.js): Additive `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS impact TEXT NOT NULL DEFAULT 'low' CHECK (impact IN ('low', 'moderate', 'high'))`.
       - [`server/db.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/server/db.js): Idempotent 15-parameter seed query updating exercise catalogue metadata and impact.
       - [`server/handler.js`](file:///Users/nehal.chaudhary/Library/CloudStorage/OneDrive-ArcticWolfNetworksInc/Desktop/BITS_IN_MONTION/bits-in-motion-sih-main/server/handler.js): Passes `lowImpact` flag to recommendation engine and includes metadata in plan responses.
  - **Exclusions from PR #1**:
    - Removed `scripts/create-exercise-data-workbook.mjs` (unneeded dependency on `@oai/artifact-tool`).
    - Removed `outputs/personalization-data/*` (unneeded spreadsheet artifacts).
  - **Preserved Existing Live Features**:
    - Homepage visual hierarchy, Top navigation Sign in, On-demand Auth Chooser card.
    - Anonymous Camera Preview (`#preview`) strictly limited to the 4 camera exercises.
    - Standalone Terms (`#terms`), Privacy (`#privacy`), and Health Disclaimer (`#health-disclaimer`) screens with `.trust-subnav`.
    - Guest and signed-in profile, plan, coach, and progress workflows.

## Verification
- **Unit & Integration Tests**: `npm test` — **10 test suites, 56/56 tests passing** (0 errors).
- **Production Build**: `npm run build` — Vite v6 production build passes cleanly with zero errors or warnings.
- **Browser Verification Suite**: `node scripts/verify-browser.mjs` — **20/20 checks passing** with 0 JavaScript console errors.
- **Diff Check**: `git diff --check` — clean (0 whitespace issues).

## Known Open Issues
- None.

## Work In Progress
- **PR #1 Reconciliation**: Synchronized `tisha-db` with `origin/feature/google-auth-user-database`, preserving Tisha's authorship on commit `b9a38fe`. Awaiting approval to push to `origin/tisha-db`.

## Pending External Contributions
- **Tisha's PR #1 (`tisha-db`)**: Cleaned and synchronized with latest authoritative base. Ready for final review and merge into `feature/google-auth-user-database`.

## Recommended Next Step
1. Push cleaned/synced `tisha-db` to `origin/tisha-db`.
2. Confirm PR #1 on GitHub is mergeable and clean.
3. Review and merge PR #1 on GitHub.
4. Execute database migration on staging/production and verify live.

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
