# Full product quality pass — local review

Base: `5f7b161c696452d11d9618cbc31a76fcfc748c67`, application checkpoint `46c8f6d`.
Branch: `feature/full-product-quality-pass`. No commit, push, deployment or production database operation is authorized by this pass.

## Product map (inspected before implementation)

| Area | Current implementation and flow |
| --- | --- |
| Shell / launch | React/Vite; `App.jsx` owns account, profile, plan, sessions and hash routing. Session-only launch flag, 1.45-second automatic transition, immediate reduced-motion entry. |
| Homepage | Marketing navigation, setup/sign-in chooser, direct anonymous Camera Coach, Features, How It Works, public sample leaderboard, separate trust screens and footer. Returning users continue to profile or dashboard. |
| Onboarding / profile | Three steps: name/age/height/weight → level/goal → time/location/equipment/low-impact/optional leaderboard alias. Profile save generates a plan. Drafts survive in-app navigation, not refresh. |
| Recommendations | Guest uses local catalogue and client engine; account uses active database catalogue and separate server engine. Fixed ID templates, static targets; time mainly a label, location only title/reason. |
| Dashboard / plan | Dashboard starts the first camera exercise; plan chooses first unpracticed camera exercise. Plan saves ordered items and target labels. Practice means any saved reps since plan creation, not completion of all sets. |
| Library | Ten movements, All / Camera filters, four camera-enabled exercises. Written cues for others. Repeated non-camera card buttons all open the same plan. |
| Camera | Lazy MediaPipe GPU→CPU model, explicit camera permission, local landmarks, four rep state machines. Session ends into result; preview ends into transient summary. Stream cleanup on exit. |
| Anonymous preview | Public `#preview`; no profile requirement, four movement selectors, no result-save callback. Existing account boot may still restore account data, independently of preview. |
| Results / progress | One camera exercise per saved session. Guest saves explicitly; account auto-saves with retry UUID. Progress counts saved sessions, active days and reps; history UI shows only six despite loading up to fifty account records. |
| Leaderboard | Anonymous/Guest sample preview; authenticated API ranks opt-in aliases. Weekly/all-time filters, loading/error/retry/empty states. |
| Persistence | Guest localStorage profile/plan/history/active-mode flag. Google token verification → signed HttpOnly cookie → per-user parameterized SQL in one action-based API. No automatic Guest import. Account revision guards stale requests. |
| Trust | Terms, Privacy, Health Disclaimer are distinct routes. Privacy contains incorrect storage-key, Guest deletion and session-revocation claims. |
| Infrastructure | Same API handler in Vite and Vercel. Additive schema setup is explicit, never run by ordinary API calls. Browser harness intercepts API requests with fixtures. |

## Initial evidence and priorities

- P1: Time and location do not change work targets; fixed templates underuse equipment and intermediate movements. Duplicated engines differ in normalization and explanatory copy.
- P1: Preview stop/switch leaves `cameraStatus` running, blocking restart. A camera stream can leak if playback rejects.
- P1: Valid JSON of the wrong shape in Guest storage crashes restoration (`.sort` on a non-array); invalid history dates can crash formatting.
- P2: Bands/dumbbells are offered but no catalogue movement supports them; remove new selection and explain legacy fallback.
- P2: Dashboard always restarts first exercise rather than continuing remaining plan practice.
- P2: Full-workout language describes a single camera movement; progress totals are based on at most 50 recent account sessions.
- P2: Preview modal has no focus containment; form validation lacks error associations/focus; repeated library plan buttons add no exercise-specific action.
- P2: Privacy copy disagrees with actual Guest retention and stateless cookie behavior.

Baseline: 10 test files, 56 passing tests. Detailed final changes, matrix and verification will be recorded after implementation.
