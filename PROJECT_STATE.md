# BITS in Motion — Current Project State

## Release candidate

- **Authoritative branch:** `feature/google-auth-user-database` at `7b28ec5e24fc47c3f1b9198656806b606f082dd1` before this release.
- **Release branch:** `feature/camera-coach-product-revamp`.
- **Application checkpoint:** `8601b40` (`feat: revamp camera coaching and student setup`).
- **Production checkpoint before this release:** `7b28ec5` at `https://bits-in-motion-feature.vercel.app/`; Vercel reported the deployment successful and the live API reported both Google and Neon configured.
- **Release status (23 September 2026):** the product revamp is locally verified and ready for push, PR, merge, the narrowly scoped catalogue data patch, deployment, and production smoke testing. Production has not yet been changed by this release branch.

## Product and engineering changes

- The homepage Camera Coach illustration is now a lightweight responsive SVG squat sequence with standing, descending, depth, ascending, and rep-complete phases. The tracked skeleton, joint landmarks, knee measurement, coaching cue, and progress update together. Decorative overlaps and clipping were removed, and reduced-motion users receive a static depth view.
- Camera detection now smooths short landmark windows and blocks counting when required framing is poor. Floor movements select the more visible side and provide stable no-person, distance, full-body, and side-angle guidance.
- Crunches use a dedicated state machine with an extended baseline, flexion threshold, minimum range of motion, stable transition windows, return timing, cooldown, lost-landmark cancellation, and reset semantics. Push-up and jumping-jack cycle counting now also enforces plausible cycle duration and cancels an incomplete cycle after sustained landmark loss. Squat behavior remains on its existing specialized state machine.
- Voice coaching is optional, throttled, non-overlapping, and backed by browser/system speech synthesis. Rep counts can interrupt stale cues; outstanding speech is cancelled on reset, movement/screen change, workout end, or disabling voice. The preference is stored locally and the privacy publication now describes that behavior.
- Profile choices are accessible radio-card tiles with clear selected/focus states and responsive touch layouts. Current locations are `PG Room`, `Hostel`, and `Home`; legacy stored locations remain accepted. Equipment choices are `None / Bodyweight`, `Dumbbell`, `Resistance Band`, and `Backpack`; legacy values remain accepted.
- Recommendations preserve exact 10/20/30/45/60-minute circuit guarantees. PG Room and Hostel remain compact/low-travel, while Home can admit wider existing catalogue movements. Backpack rows are selected only when level/goal eligibility allows. Dumbbell and band choices are safely retained and transparently fall back to supported bodyweight movements because the verified catalogue has no matching exercises; no unsupported coaching was invented.
- Existing authentication, Guest/demo/account isolation, navigation/history, continuous workout runner, progress, leaderboard, Self-Guided mode, and trust pages were preserved.

## Verification

- `npm test`: **15 suites, 830 passed, 0 skipped, 0 failed**.
- Detection coverage includes valid crunch reps, partial motion, noisy threshold crossings, repeated frames, lost visibility, hysteresis/stability, one-count-only behavior, reset, visible-side landmark geometry, and retained squat/push-up/jumping-jack coverage.
- `npm run build`: **PASS**, clean Vite production build.
- `node scripts/verify-browser.mjs`: **22/22 flow checks**, 0 failures, 0 JavaScript errors, 0 unexpected network failures, and 0 horizontal-overflow failures at 390, 844×390 landscape, 768, 820, 1024, and 1440.
- Browser coverage includes homepage, all setup steps, dashboard, plan, Workout Library, Camera Coach, camera errors, floor guidance, voice toggle persistence, Self-Guided, result, progress, leaderboard, trust routes, Back/Forward/refresh, resume/skip/finish-early, and account/Guest isolation.
- `git diff --check`: **PASS**.

## Production data and deployment

- No schema migration is required; profile location and equipment are stored as text and server validation shares the new/legacy option model.
- `scripts/production-goal-tags-patch.sql` remains the prepared additive, idempotent patch for `pushups` + `weight-management`, `crunches` + `weight-management`, and `lunges` + `stay-fit`. It has not yet been executed in this release.
- After merge, capture the live pre-check values, verify the configured Neon target, apply only missing tags, capture the exact post-check, and retain the original arrays for rollback.
- The authoritative branch auto-deploys through the existing Vercel project. Monitor that deployment rather than creating a replacement project.

## Known limitations

- Automated tests validate detector state machines, synthetic landmarks, MediaPipe initialization, permissions/error UI, and responsive flows. They do not prove real-world accuracy for every body, camera, device, lighting condition, or exercise variation.
- Physical crunch/push-up/squat/jumping-jack validation remains recommended post-release manual QA and is not represented as automated evidence.
- The catalogue intentionally has no dumbbell or resistance-band exercises yet; those preferences produce an explained bodyweight fallback.
- Real Google authentication and physical camera motion require live user/device interaction; production smoke testing must report those boundaries honestly.

## Safe continuation point

Push `feature/camera-coach-product-revamp`, open and merge its PR into `feature/google-auth-user-database` if checks permit, apply the verified three-row production tag patch only if the live pre-check shows it is required, monitor Vercel, smoke-test the live application, then record the final merge/database/deployment checkpoint here.
