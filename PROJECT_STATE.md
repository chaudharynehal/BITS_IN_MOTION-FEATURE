# BITS in Motion — Current Project State

## Latest live release — cohesive homepage product experience (23 September 2026)

- **Release branch:** `feature/student-homepage-experience`, based on authoritative `feature/google-auth-user-database` at `c3b53e9`. Origin was fetched and remained at that checkpoint before release.
- **Application checkpoint:** `c762655` (`feat: deliver cohesive student homepage experience`). **Production merge checkpoint:** `2720443767e21142c1c0e1309bfa421788a1ccca`.
- **Deployment:** LIVE at `https://bits-in-motion-feature.vercel.app/`. Vercel reported `success` / `Deployment has completed` for the tested branch and production merge. Production serves `index-D8goIygc.js` and `index-zxEyYwio.css`, matching the verified build. Deployment: `https://vercel.com/chaudharynehal/bits-in-motion-feature/2iatynFNfWMFEvFdss3ed63XU5fo`.
- **Release workflow:** feature branch pushed normally. PR creation was attempted, but the GitHub credential returned `403 Resource not accessible by personal access token`. The authoritative branch was verified unprotected with an empty applicable rules list. Following the established authorized workflow, the tested branch was merged with `--no-ff` and pushed normally. No force push, failed-check bypass, or branch-policy bypass occurred.
- **Scope:** the entire existing homepage, not a new route or replacement application. The blue/teal identity remains, now with quiet off-white/mint surfaces, stronger student-focused typography, clear primary/secondary CTAs, integrated privacy messaging, illustrated benefit cards, a concise journey section, and a cohesive footer.
- **FIX:** removed 409 obsolete/conflicting homepage-only CSS rules; retained the noninteractive heading-focus artifact regression fix; replaced hidden mobile navigation with a keyboard-accessible menu; fixed cramped mobile privacy copy; protected long account names; made the sign-in chooser move/restore keyboard focus; removed the demo rep counter's backwards reset and the fabricated form score. Interactive focus rings remain visible.
- **IMPROVE:** the coach illustration is a lightweight side-view human rig with planted feet, consistent limb proportions, shared body/joint coordinates, calculated knee angle, five squat phases, a monotonically increasing demo count and one coaching cue. It is explicitly labelled an illustration, never opens the camera, pauses outside the viewport/hidden tab, supports manual pause, and stays static for reduced-motion users.
- **POLISH:** consistent button heights, restrained pointer interactions, touch-sized controls, compact returning-user continuation, purposeful borders, and responsive tablet/landscape compositions. No graphics framework, analytics or new runtime dependency was added.
- **KEEP:** existing Google/Guest/Judge Demo behavior; setup, dashboard, plan and progress state; actual camera detection/voice logic; all recommendation/equipment/location behavior; browser Back and trust routes. Camera privacy promises remain unchanged.
- **Font reliability:** the first full browser run exposed two third-party font request failures. The existing Manrope and Space Grotesk fonts are now self-hosted as unmodified WOFF2 subsets with their SIL OFL licenses. The final run made no third-party font requests and had no network failures. No new typeface was introduced.
- **Files:** `src/screens/WelcomeScreen.jsx`, extracted `src/components/HomeCoachPreview.jsx`, consolidated `src/styles/homepage.css`, removal of stale rules from `src/styles/global.css`, first-party `src/styles/fonts.css` and `public/fonts/`, new `scripts/verify-homepage.mjs`, and a network-failure assertion in `scripts/verify-browser.mjs`.
- **Verification:** `npm test`: 15 suites / 830 passed / 0 skipped / 0 failed. `npm run build`: PASS (`index-D8goIygc.js`, `index-zxEyYwio.css`). Full browser QA: 22/22 flows, no JavaScript errors, no failed network requests, no overflow. Homepage QA: 38 checks against both Vite and the compiled production preview, 24 viewport/full-page screenshot pairs, no console/runtime errors, failed requests or clipped/overflowing controls. `git diff --check`: PASS.
- **Visual review:** full-page and viewport output inspected before deployment at 390×844, 430×932, 844×390, 768×1024, 820×1180, 1024×768 and 1440×900. Anonymous, expanded setup and returning Guest states covered at all seven sizes; long names additionally covered at 390, 768 and 1024. Motion/paused and reduced-motion states were checked.
- **Local evidence:** final full-suite report at `/var/folders/d2/xq_721js4xq6jrfbfqmxp8gh0000gp/T/bits-motion-browser-shFPA3/report.json`; compiled-preview homepage report/screenshots at `/var/folders/d2/xq_721js4xq6jrfbfqmxp8gh0000gp/T/bits-homepage-5T6RDh/`.
- **Database:** no schema or data change required. The prior three-row production goal-tag patch remains recorded below; it was not rerun for this homepage release.
- **Production smoke:** all 38 homepage checks passed against the actual production assets, with 24 viewport/full-page screenshot pairs, no console/runtime errors, failed requests or overflow. Setup/Guest route, Judge Demo entry/exit, returning Guest dashboard, mobile navigation, browser Back, Camera Preview, Features, How It Works, Leaderboard and all trust links passed. Production desktop/mobile screenshots and motion were also visually inspected. Account endpoints and Google callbacks were fixture-backed to avoid production writes; the actual live status API was checked separately and returned `databaseConfigured: true`, `googleConfigured: true`. First-party font delivery returned HTTP 200 and the live CSS contains no Google Fonts import.
- **Production evidence:** `/var/folders/d2/xq_721js4xq6jrfbfqmxp8gh0000gp/T/bits-homepage-niO7VS/report.json` and adjacent screenshots. Actual OAuth and physical exercise performance were not claimed as automated tests. No production database writes were needed or performed for this release.
- **Release state:** LIVE and verified. No remaining human action is required for the homepage release.

## Previous live release — homepage visual refinement

- **Application / production checkpoint:** `1319ce5` (`feat: refresh homepage graphics and fix hero focus artifact`), pushed normally to `feature/google-auth-user-database` on 23 September 2026.
- **Deployment:** Vercel reported `success` / `Deployment has completed`. The production URL serves `index-CiyToICp.js` and `index-CX05yGvF.css`, matching the verified local build.
- **Production smoke:** actual deployed homepage passed at 390×844, 768, 820, 1024, 1440, and 844×390; no horizontal overflow or heading focus-ring artifact. Setup chooser, `Try it live` Camera Coach route, browser Back, Features, How It Works, Privacy, Terms, and Health pages passed. No JavaScript exceptions or failed network requests were observed. The live status API returned Google and database configured. No real sign-in, camera permission grant, workout save, or production data write was performed.

- The homepage hero has been rebuilt around a clearer `Move smarter. Train anywhere.` message, two prioritized conversion actions, compact proof points, and lower-emphasis Features/How It Works links. The previous four-button stack and awkward headline wrapping were removed.
- The Camera Coach illustration is now a larger motion-analysis stage with a dimensional athlete, tracked joints, perspective floor, scan line, knee angle, live form score, phase progress, rep count, coaching cue, and an interactive `Try it live` action. The same standing/descending/depth/ascending/complete sequence and reduced-motion behavior remain intact.
- A tester-visible stray cyan outline was traced to the application intentionally focusing the route heading while leaving the browser's default focus ring on the non-interactive `<h1>`. The homepage route focus target now suppresses that ring; interactive controls retain their normal visible focus styles. A browser assertion covers this regression.
- Student-benefit cards now include lightweight room-space, recommendation-input, and supported-coach diagrams instead of text-only empty space.
- Responsive behavior was rebalanced at 390, 768, 820, 1024, and 1440 pixels. A dedicated 844×390 landscape composition keeps the headline, both main actions, and the coach visualization visible together instead of pushing every action below the first viewport. The homepage is now included in automated landscape screenshot/overflow coverage.
- Files changed: `src/screens/WelcomeScreen.jsx`, `src/styles/global.css`, and `scripts/verify-browser.mjs`.
- Verification: `npm test` passed 15 suites / 830 tests; `npm run build` passed; `node scripts/verify-browser.mjs` passed all 22 high-level flows with no JavaScript errors, unexpected network failures, or horizontal overflow; `git diff --check` passed.
- The user authorized immediate deployment on 23 September 2026. Release used the existing unprotected `feature/google-auth-user-database` production branch and its Vercel integration. No database changes were required.

## Previous live release — camera and student setup

- **Authoritative branch:** `feature/google-auth-user-database`.
- **Release branch:** `feature/camera-coach-product-revamp`, merged locally with a merge commit and pushed to the unprotected authoritative branch.
- **Application checkpoint:** `8601b40` (`feat: revamp camera coaching and student setup`).
- **Merge checkpoint:** `484734cb707e12d4d3a12d7a59bc6f25b21c74ba`.
- **Production patch source checkpoint:** `c35388fe65a7b1c6fdbde137842262988959a47a`.
- **Production URL:** `https://bits-in-motion-feature.vercel.app/`.
- **Release status (23 September 2026):** **LIVE and verified**. Vercel reported successful deployments for the application merge and JSONB-safe patch source; the live page serves the new build assets and the production API reports Google and Neon configured.
- GitHub PR creation was attempted after the release branch was pushed, but the available GitHub credential returned `403 Resource not accessible by personal access token` for Pull Requests. Because the authoritative branch is unprotected and the user explicitly authorized merge/release, the tested release branch was merged locally with `--no-ff` and pushed normally; no force push or policy bypass was used.

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
- No schema migration was required. Production was verified as the intended Neon target with a 10-row exercise catalogue and `exercises.goal_tags` stored as JSONB.
- Inspection found the prepared SQL had PostgreSQL-array syntax despite the live/local JSONB schema. `scripts/production-goal-tags-patch.sql` was corrected to use JSONB concatenation, membership, and rollback operators before any write.
- Captured pre-check: `pushups=["stay-fit","strength"]`, `crunches=["stay-fit","strength"]`, `lunges=["strength","weight-management"]`.
- The narrowly scoped, additive, idempotent production patch was executed. **3 rows changed**.
- Post-check: `pushups=["stay-fit","strength","weight-management"]`, `crunches=["stay-fit","strength","weight-management"]`, `lunges=["strength","weight-management","stay-fit"]`.
- Rollback source is captured above; the script documents exact JSONB tag removal and exact-array restoration alternatives. No other production SQL was run.
- Vercel deployment statuses for `484734c` and `c35388f` were both `success`. The existing production project and URL were preserved.
- A full browser suite ran against the deployed production assets with mocked Google/account API fixtures to avoid production writes: **22/22 flow checks**, 0 JavaScript errors, 0 unexpected network failures, and no overflow at all required widths. The actual live `status` API was also verified separately; physical camera motion and real Google sign-in were not automated.

## Known limitations

- Automated tests validate detector state machines, synthetic landmarks, MediaPipe initialization, permissions/error UI, and responsive flows. They do not prove real-world accuracy for every body, camera, device, lighting condition, or exercise variation.
- Physical crunch/push-up/squat/jumping-jack validation remains recommended post-release manual QA and is not represented as automated evidence.
- The catalogue intentionally has no dumbbell or resistance-band exercises yet; those preferences produce an explained bodyweight fallback.
- Real Google authentication and physical camera motion require live user/device interaction; production smoke testing must report those boundaries honestly.

## Product logic and recommendation engine handoff (agent/gemini-product-logic-v2)

- **Branch:** `agent/gemini-product-logic-v2`
- **Ownership:** Profile/setup data behavior, equipment model, location model, recommendation logic, exercise eligibility/filtering, personalization, local-vs-Neon catalogue consistency, recommendation tests, and plan-quality logic. (Emergent UI ownership and Codex vision/audio ownership strictly preserved).
- **Equipment model:**
  - Supported options: `None / Bodyweight`, `Dumbbell`, `Resistance Band`, `Backpack`.
  - Normalization: `normalizeEquipment` safely resolves all aliases (`None / Bodyweight`, `Bodyweight`, `bodyweight`, `none`, `Dumbbells`, `dumbbells`, `dumbbell`, `Resistance band`, `resistance band`, `backpack`) without data loss.
  - Catalogue integrity: Did not invent unsupported movements. The catalogue holds 10 verified exercises. Backpack rows are selected when eligible (Intermediate + Strength or Stay Fit). Dumbbell and Resistance Band preferences are safely stored and transparently fall back to supported bodyweight exercises with explicit explanation.
  - Profile note fix: UI catalogue note now exclusively targets unsupported equipment (`UNSUPPORTED_EQUIPMENT`), preventing false fallback notes for `None / Bodyweight`.
- **Location model:**
  - Simplified user-facing choices: `PG Room`, `Hostel`, `Home`.
  - Intended semantics implemented & explained:
    - `PG Room`: smallest-space assumption, compact, minimal-travel movements only (jumping-jacks and lunges excluded; marching replaces jumping jacks for cardio).
    - `Hostel`: compact student-room environment with modest space (jumping-jacks and lunges excluded; marching replaces jumping jacks for cardio).
    - `Home`: flexible-space assumption allowing wider movements (jumping-jacks and lunges eligible when goal and impact allow).
  - Compatibility: Legacy locations (`PG room`, `Hostel room`, `Open indoor space`, `Open space / Gym`, `Campus`, `Outdoor`, `Gym`, `Park / outdoor ground`, `Campus gym`, `Dorm`, `Dorm room`, `Bedroom`) are recognized and normalized without validation errors.
  - Dashboard reason integration: Every location explanation explicitly includes `space:` tag, ensuring dashboard's space reason query matches and displays the tailored space context.
- **Personalization & plan quality:**
  - Full matrix of available time (10, 20, 30, 45, 60 min), fitness goals (Stay fit, Build strength, Support weight management), fitness levels (Beginner, Intermediate), equipment, location, and impact preferences verified.
  - Exact duration guarantees: 10m (3 stations, 1 round), 20m (4 stations, 2 rounds), 30m (5 stations, 4 rounds), 45m (5 stations, 6 rounds), 60m (5 stations, 8 rounds). Warmup, stations, round breaks (60s), and cooldown sum to the exact second (0 discrepancy) across all 720 combinations.
- **Catalogue parity:**
  - Guest and signed-in accounts produce 100% identical plans across all supported profile combinations and legacy inputs.
  - Database schema and local `EXERCISES` catalogue have complete parity. No database migration is required. Production 3-row goal-tag patch is verified as already applied.
- **Verification:**
  - `npm test`: **15 test suites, 886 passed, 0 skipped, 0 failed**.
  - `npm run build`: **PASS**, clean production build.
  - `git diff --check`: **PASS**.

## Safe continuation point

The cohesive homepage release is live and verified. Product logic, recommendation engine, equipment, location, and catalogue parity have been audited, simplified, fortified, and tested on `agent/gemini-product-logic-v2` (886/886 tests passing, 0 failures). Ready for integration review.
