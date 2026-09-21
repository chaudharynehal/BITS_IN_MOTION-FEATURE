# BITS in Motion

A presentation-ready Smart India Hackathon prototype for Problem Statement 26196: a hostel-friendly fitness companion for students with limited space, time and equipment.

Choose Google or Guest, complete a short profile including your preferred name, and receive a saved personal plan. Start a workout when ready or explore the dashboard immediately.

**Dashboard → My Plan · Workout Library · Camera Coach · Progress · Leaderboard · Profile**

Workout completion never unlocks navigation. The V2 homepage, onboarding, navigation, persistence rules, and update checklist are explained in [`docs/V2_PRODUCT_EXPERIENCE.md`](docs/V2_PRODUCT_EXPERIENCE.md).


## Run locally

Requirements: Node.js 20 or newer and a current Chrome, Edge or Safari browser.

```bash
npm install
cp .env.example .env.local
openssl rand -hex 32
```

Put the generated secret and the Neon/Google values described in [`docs/AUTH_DATABASE_DEPLOYMENT.md`](docs/AUTH_DATABASE_DEPLOYMENT.md) into `.env.local`, then run:

```bash
npm run db:setup
npm run dev
```

Open `http://localhost:5173`. The Vite development server runs the frontend and the real `/api` handler together, so no second server command is needed. Camera access works on localhost or HTTPS and is requested only after **Start Camera** is pressed.

Verification:

```bash
npm test
npm run build
npm run preview
```

Guest mode works without cloud credentials and stores data only in the current browser. Judge Demo is temporary and does not write to guest or account storage. Google accounts use PostgreSQL only and never fall back to guest history. For complete beginner steps covering Neon, Google Cloud, account switching, GitHub, and Vercel, read [`docs/AUTH_DATABASE_DEPLOYMENT.md`](docs/AUTH_DATABASE_DEPLOYMENT.md).

All dependency versions are pinned in `package.json` and locked in `package-lock.json`. The lightweight pose model and MediaPipe WebAssembly runtime are bundled under `public/` so the flagship flow does not need to download model files during the demo.
## Architecture

- `src/screens` — welcome, dashboard, workout library, profile, plan, live coach, result, progress and leaderboard screens.
- `src/components` — reusable navigation, Google sign-in, account, workout and guidance components.
- `src/data` — guest-mode exercise definitions.
- `src/services` — authenticated browser-to-API calls.
- `src/utils` — BMI, MET estimates, guest-only persistence, workout impact and recommendation rules.
- `src/vision/angle.js` — three-point joint-angle calculation and best-visible-leg selection.
- `src/vision/squatStateMachine.js` — configurable, debounced Standing → Down → Standing rep counter.
- `src/vision/exerciseMeasurements.js` — push-up, crunch and jumping-jack landmark measurements.
- `src/vision/exerciseDetectors.js` — one common interface for all four camera coaches.
- `src/vision/poseLandmarker.js` — MediaPipe initialization, GPU-to-CPU fallback and pose drawing.
- `src/vision/camera.js` — permission request and media-track cleanup.
- `server` — Google verification, secure sessions, PostgreSQL schema and API handlers.
- `api/index.js` — Vercel serverless entry point.
- `docs/LOW_LEVEL_DESIGN.md` — detailed system explanation and diagrams.
- `docs/AUTH_DATABASE_DEPLOYMENT.md` — beginner setup for Neon, Google Cloud, GitHub and Vercel.
- `docs/V2_PRODUCT_EXPERIENCE.md` — V2 navigation, preferred names, saved plans, existing-user compatibility and deployment checks.
- `public/manifest.webmanifest` and `public/sw.js` — lightweight installable PWA shell.

Guest profile, plan and history are browser-local. Signed-in profiles, plans and numeric results are stored in PostgreSQL. Raw camera frames are never saved, uploaded or recorded.

## Camera logic

The live coach tracks one pose with MediaPipe Pose Landmarker Lite. Squats use the hip-knee-ankle angle; push-ups use elbow and visible body-line angles; crunches use the shoulder-hip-knee torso angle; jumping jacks use wrist position and stance width.

The configurable defaults in `src/vision/squatStateMachine.js` are:

- standing: 160° or above;
- down position: 110° or below;
- at least 4 stable frames and 120 ms before a state transition;
- at least 800 ms between counted repetitions;
- minimum required landmark visibility: 0.60.

Only a stable Standing → Down → Standing cycle counts. Low-visibility observations reset the state candidate and never increment the counter. Feedback messages are held by priority for a short period to avoid flicker.

This is basic observable 2D pose feedback, not medical guidance, injury prevention or a trainer-level posture assessment.

## Calorie estimate

The result uses an exercise-specific MET assumption:

`estimated kcal = exercise MET × weight in kg × duration in hours`

Configured values range from **3.8 MET** for moderate calisthenics to **8.0 MET** for jumping jacks. Every value is labelled as an estimate because actual expenditure varies by pace, movement quality, body composition and individual physiology. Reference: [Compendium of Physical Activities](https://pacompendium.com/).

## Judge demo script

1. On Welcome, select **Preview the isolated judge demo**.
2. The dashboard opens with a temporary sample profile and clearly labelled demo history. Show that Workouts, My Plan and Progress are already accessible.
3. Open **My Plan** and explain why the saved 20-minute plan is beginner-paced, hostel-friendly and equipment-free. **Explore dashboard** postpones training without deleting the plan.
4. On **Bodyweight squats**, select **Start camera coach**.
5. Wait for “Ready when you are,” then select **Start Camera** and grant browser permission.
6. Step back until hips, knees and ankles are visible. Perform three slow squats: stand tall, reach the down threshold, then return to standing.
7. Show the rep count, live angle, movement stage and held correction cues. Mention that the same engine supports push-ups, crunches and jumping jacks.
8. Select **End session** and explain the labelled MET estimate. Demo results remain temporary; real guest/account sessions follow their respective save paths.
9. Open **Progress** to show the temporary demo session alongside clearly labelled sample history.

For a reliable stage demo, place the camera roughly hip height, keep the whole body inside the frame, stand mostly side-on and use even lighting.

## Known limitations

- Thresholds are intentionally conservative and may need per-user calibration for different mobility, proportions and camera angles.
- A single RGB camera provides 2D observations; occlusion, loose clothing, low light and front-on positioning can reduce landmark visibility.
- Push-up, crunch and jumping-jack thresholds need broader real-user calibration across camera positions and body proportions.
- Without Google and database environment variables, users can explicitly continue in guest mode. Signed-in account requests never fall back to guest localStorage.
- The opt-in leaderboard is motivational and does not yet include anti-cheat controls.
- The PWA service worker caches the app shell and visited local assets; it is deliberately lightweight rather than a full offline workout engine.
- No upload-analysis mode is included because no local squat video was supplied and the live camera flow was prioritized.

## Attribution and licences

- Pose detection uses Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`, Apache-2.0) and follows the architecture in the [official Pose Landmarker Web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) and [official webcam example](https://codepen.io/mediapipe-preview/pen/abRLMxN).
- Hysteresis/state-machine concepts were reviewed against [RepCounterSDK](https://github.com/NazarKozak/RepCounterSDK) (MIT).
- Three-point joint-angle exercise concepts were reviewed against [GC_Fit](https://github.com/TheUnknown550/GC_Fit) (MIT).
- No source code, interface or branding was copied from either conceptual reference. The angle utility, visibility gating, state machine and React interface in this repository were implemented specifically for BITS in Motion.
- The BITS in Motion logo was supplied with the project reference materials and is preserved as the product identity.
