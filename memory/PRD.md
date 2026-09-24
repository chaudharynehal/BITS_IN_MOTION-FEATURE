# BITS in Motion — Camera Coach Stabilization (branch: agent/emergent-camera-voice-v5)

## Problem
Real exported pose captures showed the Camera Coach rejecting **every** frame
before rep counting (e.g. jumping-jack capture: 642 frames, 0 valid, 622
"no-person", phase stuck at "Finding start", 0 reps). Root cause was in the
**live pipeline glue**, not the detectors (954 unit tests already passed):

1. `subjectContinuity` tracker dropped poses during fast/large motion (jumping
   jacks) because its center/scale continuity thresholds were too tight →
   `landmarks` became `null` every frame → measurement `no-person`.
2. Framing rejection conflated "no person" with "person present but framing/joint
   not ideal".

## Architecture (simple, MediaPipe-only)
camera → MediaPipe `detectForVideo()` (VIDEO mode, `numPoses: 1`, GPU→CPU
fallback) → `selectPrimaryPose()` (pick most-credible single pose, never dropped
on fast motion) → exercise geometry → normalized progress 0..1 → EMA(α=0.35) →
hysteresis rep counter (ACTIVE 0.70, RETURN 0.35, debounce 400ms) → canonical
cue → UI + matching speech.

PERSON DETECTED (lenient: shoulders+hips core visible) is now separate from
EXERCISE READY (exercise-specific joints). "No person" is only shown when
MediaPipe returns no credible pose.

Voice = one coaching brain: the visible cue is the spoken cue (punctuation
normalized only). No auto-cancel on rep/cue/frame; cancel only on Voice OFF,
camera leaving/unmount, or track-end. Rep numbers spoken separately, once per
committed rep. Small queue: active + one queued.

## Changes (2026-06)
- `src/vision/poseLandmarker.js` — `numPoses: 2 → 1`.
- `src/vision/poseSubject.js` (new) — `selectPrimaryPose()` single-person selector.
- `src/vision/exerciseMeasurements.js` — `personDetection()` helper; each measure*
  now returns `personDetected`, `exerciseReady`, `coreVisibility` (additive).
- `src/vision/exerciseDetectors.js` — cue uses `personDetected` so framing issues
  never say "no person"; state exposes `personDetected`/`exerciseReady`.
- `src/screens/CoachScreen.jsx` — live loop uses `selectPrimaryPose` instead of the
  continuity tracker; expanded `cameraDebug` telemetry (MediaPipe returned Y/N,
  landmark count, person vs exercise-ready with separate fail reasons, per-joint
  core visibility); removed voice cancel on Reset.
- `src/vision/poseAcquisition.test.js` (new) — 13 regression tests.

## Verification
- `vitest run`: 967 passed (19 files), incl. 13 new acquisition/voice regressions.
- `vite build`: success.
- `git diff --check`: clean.
- `scripts/verify-camera-coach.mjs` (headless Chrome, mocked MediaPipe/camera/
  speech, real CoachScreen): **PASS** — rep=1 for squats/pushups/crunches/
  jumping-jacks, voice speaks & throttled, Voice-off/track-end cancel, cleanup,
  resize survival, model-failure handling.
- `scripts/verify-browser.mjs`: pre-existing failure at the homepage
  "Continue with Google" auth step — reproduced identically on the clean baseline
  (unrelated to this work; auth/homepage untouched).
- Visual: Coach preview renders and real MediaPipe model loads ("Ready when you are").

## PHYSICAL (human-only)
- PHYSICAL CAMERA: UNVERIFIED
- PHYSICAL VOICE: UNVERIFIED

## Constraints honored
Only `agent/emergent-camera-voice-v5`. No deploy/publish/merge. No changes to
auth, workout planning, profile, dashboard, DB schema, or unrelated UI.

## Backlog / next
- Human physical test on device (camera + spoken cues).
- Optionally tune per-exercise progress mapping after real-device feedback.
- Run `verify-browser.mjs` in an environment where the mocked Google auth step
  renders (pre-existing, out of scope).
