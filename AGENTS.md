# BITS in Motion — Shared Development Instructions

## Project

BITS in Motion is an existing Smart India Hackathon 2026 project.

It is a student-focused AI fitness platform with features including:
- onboarding and personal fitness setup
- user profiles
- fitness dashboard
- camera-guided exercise/movement
- posture and exercise guidance
- student/minimal-equipment workouts
- BMI and fitness information
- nutrition/calorie guidance
- authentication and user data functionality

This is an EXISTING application.

Do not rebuild the project from scratch.

## Agent Rules

1. Inspect the existing implementation before changing code.
2. Preserve all working functionality.
3. Preserve the current visual identity and design system.
4. Do not unnecessarily replace existing components, routes, screens, utilities or architecture.
5. Do not create duplicate pages or duplicate functionality when an existing implementation can be extended.
6. Fix root causes rather than applying cosmetic workarounds.
7. Preserve responsive/mobile behavior.
8. Navigation and browser Back behavior must work naturally.
9. Do not introduce unnecessary dependencies.
10. Do not expose, replace or hard-code secrets, credentials, API keys or environment variables.
11. Be especially careful with authentication, database and deployment configuration.
12. Inspect Git history and recent diffs before assuming how a feature works.
13. Run relevant tests, lint/type checks and builds after meaningful changes.
14. Do not blindly trust handoff documentation; verify against the actual repository.
15. Prefer focused production-quality modifications over large speculative rewrites.
16. Update PROJECT_STATE.md after significant work.

## Git / Agent Handoff

This repository may be worked on by multiple coding agents, primarily Codex and Gemini.

The shared source of truth is:

- the actual repository
- Git history
- AGENTS.md
- PROJECT_STATE.md

Before continuing work after another agent:

1. Read AGENTS.md.
2. Read PROJECT_STATE.md.
3. Run git status.
4. Inspect recent git log.
5. Inspect recent commits/diffs.
6. Inspect affected source files.
7. Run appropriate verification/build commands.

Never overwrite another agent's working implementation simply because it was created by a different agent.

## Handoff Documentation

After significant development work, update PROJECT_STATE.md with:

- what was changed
- which files were affected
- decisions made
- tests/builds performed
- known problems
- unfinished work
- recommended next step
