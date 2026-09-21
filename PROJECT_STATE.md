# BITS in Motion — Current Development State

## Repository State

Current branch:

feature/google-auth-user-database

Codex checkpoint immediately before Gemini handoff:

0ba436a — WIP checkpoint before Gemini handoff

This checkpoint has already been pushed to origin.

The working tree was clean after this checkpoint before the AI context files were created.

## Current Development Context

Codex was actively modifying the existing application.

The latest checkpoint contains substantial navigation/application-flow work.

Files changed in the latest checkpoint include:

- package.json
- package-lock.json
- scripts/verify-browser.mjs
- src/App.jsx
- src/components/AppHeader.jsx
- src/components/ScreenHeader.jsx
- src/screens/CoachScreen.jsx
- src/screens/ProfileScreen.jsx
- src/screens/WelcomeScreen.jsx
- src/styles/global.css

New files introduced:

- src/utils/navigation.js
- src/utils/navigation.test.js

Approximately 314 lines were added and 54 removed in checkpoint 0ba436a.

## Important

The changes in checkpoint 0ba436a are intentional WIP development changes.

Do NOT revert or replace them without first inspecting and understanding them.

Before continuing development, inspect:

git show --stat 0ba436a

and:

git show 0ba436a

Also inspect the actual affected source files.

## Areas Recently Being Worked On

The recent work involves application navigation and user flow, including:

- navigation handling
- application routing/state behavior
- AppHeader
- ScreenHeader
- Welcome screen
- Profile screen
- Coach screen
- browser navigation/back behavior
- browser verification
- navigation utilities and tests
- related UI styling

## Project Areas Requiring Extra Care

The active Git branch is:

feature/google-auth-user-database

Authentication and user/database work may therefore also exist elsewhere on this branch.

Do not assume authentication or database functionality is complete.

Inspect the repository and Git history before modifying those systems.

## Immediate Gemini Handoff Objective

Gemini is temporarily taking over development while Codex is unavailable.

Gemini should FIRST understand and verify the existing repository rather than immediately rewriting code.

Required initial actions:

1. Read AGENTS.md and this file.
2. Inspect package.json.
3. Inspect the directory structure.
4. Run git status.
5. Inspect recent git history.
6. Inspect checkpoint 0ba436a.
7. Understand the navigation architecture.
8. Understand authentication/user-data architecture.
9. Run existing tests/build/verification commands where practical.
10. Report its understanding before making broad architectural changes.

## Handoff Log

### Codex -> Gemini

Checkpoint:
0ba436a

Status:
Successfully committed and pushed.

Purpose:
Preserve the exact Codex development state before Gemini temporarily continues development.

### Gemini Work

Gemini should document its completed work below this heading before handing the repository back to Codex.
