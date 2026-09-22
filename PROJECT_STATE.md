# BITS in Motion — Current Project State

## Release candidate

- **Authoritative branch:** `feature/google-auth-user-database` at `5f7b161c696452d11d9618cbc31a76fcfc748c67` before this release.
- **Release branch:** `feature/full-product-quality-pass`.
- **Last production checkpoint:** `46c8f6d26070cb43a5afdb5b1c1c0bc32251d9e9` at `https://bits-in-motion-feature.vercel.app`.
- **Release status (23 September 2026):** the local release candidate is verified and ready for commit, push, and PR review. Production and the production database remain untouched by this release pass.
- The completed Gemini implementation and Claude handoff were preserved. Codex continued from that baseline for Trust & Safety publication and release verification.

## Final product state

- Personalized plans use one shared client/server recommendation model. The circuit runs warm-up once, each station once per round, round recovery between rounds, and cooldown once, with no hidden sets.
- Executable plans are exact for 10/20/30/45/60 minutes. The continuous runner supports Camera Coach and Self-Guided movements, Skip, Finish Early, Back/Home navigation, refresh/resume at the correct movement, and completed-workout cleanup.
- Progress uses lifetime signed-in aggregates for sessions, reps, duration, calories, active days, and streak. Guest records remain local; account, demo, and Guest data remain isolated.
- Catalogue, location normalization, Camera Coach lifecycle, responsive layouts, error/empty/loading states, and navigation were hardened without adding exercises or new product scope.

## Trust & Safety publication

- Public `#privacy`, `#terms`, and `#health-disclaimer` routes publish the approved 9/13/8-section content dated **22 September 2026**.
- Privacy states the governing region is India; Terms states the governing law is India; Health includes the 112/102/108 and outside-India emergency guidance.
- Features, How It Works, Terms, Privacy, and Health share accessible navigation with current-page state. Direct links, refresh, Back, Forward, and policy cross-links are verified.
- Technical claims were checked against the implementation: MediaPipe processes frames in the browser without upload/persistence, camera tracks are released, Guest fitness data stays in browser storage, signed-in data uses the server/Neon path, leaderboard publication requires an opted-in alias, and no advertising or behavioural-tracking integration is present.

## Verification

- `npm test`: **13 suites, 577 passed, 0 skipped, 0 failed**; no `.only`.
- `npm run build`: **PASS**, clean Vite production build.
- `node scripts/verify-browser.mjs`: **22/22 checks**, 0 failures, 0 JavaScript errors, 0 unexpected network failures, and 0 horizontal overflow at 390, 844×390, 768, 820, 1024, and 1440 layouts.
- `git diff --check`: **PASS**.
- Browser coverage includes onboarding, dashboard/plan, Camera Coach, Self-Guided, result/progress, resume/skip/finish-early/full completion, leaderboard states, and all public trust routes.

## Production requirement

- `scripts/production-goal-tags-patch.sql` is the prepared additive, idempotent patch for only these missing catalogue tags: `pushups` + `weight-management`, `crunches` + `weight-management`, and `lunges` + `stay-fit`.
- The script includes the required pre-check, post-check, and rollback guidance. It has **not** been executed.
- **Exact next production step after an approved merge:** capture the script's pre-check result, obtain explicit production authorization, apply only this patch to the live Neon database, verify the three rows, then validate the automatically generated Vercel deployment and run the non-destructive production smoke test.

## Remaining limitations

- Real Google OAuth, live Neon round-trips, and physical movement accuracy require live-environment/device verification; automated QA uses mocked account/API fixtures and synthetic camera frames.
- Camera and Self-Guided sessions are intentionally self-paced; the plan duration is a prescription, not an enforced stopwatch deadline.
- The approved Privacy wording says clearing browser data or cache deletes Guest information; cache-only clearing does not necessarily remove `localStorage` in every browser.
