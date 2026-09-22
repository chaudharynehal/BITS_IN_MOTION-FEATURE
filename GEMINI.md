# BITS in Motion — Gemini / Antigravity Context

Read and follow the shared project instructions in `AGENTS.md` and current project state in `PROJECT_STATE.md`.

## START OF SESSION
- Read `PROJECT_STATE.md` first to understand current progress and active objectives. (`PROJECT_STATE.md` is authoritative for project/handoff state).
- Determine the live repository state using Git (Git is authoritative for live HEAD):
  - `git status`
  - `git rev-parse HEAD`
  - `git log -5 --oneline`
- Confirm current HEAD before modifying anything.
- Preserve work from other agents (Codex, Claude Code) — never overwrite or refactor their code without explicit instruction.

## END OF MEANINGFUL WORK
- Run appropriate tests and builds (`npm test`, `npm run build`, and `node scripts/verify-browser.mjs` when navigation/UI changes).
- Update `PROJECT_STATE.md` with:
  - what was changed and which files were affected
  - meaningful application/deployment checkpoint hash (noting that stored commit hashes describe meaningful checkpoints, not necessarily docs-only commits)
  - tests and verifications performed
  - deployment status
  - known open issues
  - exact recommended next step
- Record exactly what changed and what remains.
- Never claim deployment or verification occurred unless actually performed and verified against the live environment.

## CATCH UP COMMAND

When the user says exactly:

"catch up"

treat it as the following instruction:

SYNC AND RECOVER PROJECT STATE BEFORE DOING ANY WORK.

1. Read PROJECT_STATE.md and the applicable repository instruction files.
2. Inspect the current local repository using:
   - pwd
   - pwd -P
   - git rev-parse --show-toplevel
   - git status
   - git status --short
   - git diff
   - git diff --staged
   - git rev-parse HEAD
   - git log -5 --oneline --decorate
   - git branch -a
3. Treat:
   - Git as authoritative for committed/live repository state.
   - The local working tree as authoritative for unfinished/uncommitted work.
   - PROJECT_STATE.md as authoritative for project intent, handoff state, deployment state, known issues, and recommended next step.
4. If the working tree is dirty, assume it may contain interrupted work from another agent.
5. Never reset, restore, clean, stash, delete, overwrite, or discard those changes automatically.
6. Reconstruct unfinished work before editing anything.
7. If Git/code conflicts with PROJECT_STATE.md, stop and report the discrepancy.
8. Do not expose secrets.

Before making changes, report only:

SYNC STATUS: ALIGNED / NOT ALIGNED
Branch:
HEAD:
Origin sync:
Working tree:
Last application checkpoint:
Production checkpoint:
Last completed work:
Unfinished local work:
Known issues:
Safe continuation point:
Recommended next step:

If aligned, wait for the user's next instruction.

Also support:

"catch up and continue"

This performs the same synchronization procedure, but after confirming ALIGNED, continue from the safe continuation point / Recommended Next Step.

Do not duplicate the full synchronization protocol elsewhere unnecessarily.

@./AGENTS.md
@./PROJECT_STATE.md
