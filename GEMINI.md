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

@./AGENTS.md
@./PROJECT_STATE.md
