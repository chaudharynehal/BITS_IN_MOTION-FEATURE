# V2 product experience and update guide

This update adds a dashboard, a workout library, a preferred name, and free navigation to the existing application. Google login, Neon PostgreSQL, Vercel hosting and the four camera exercise detectors remain in use.

## What the app now does

1. A brief BITS in Motion introduction appears once per browser tab session. It has a Skip control and respects reduced-motion settings.
2. A new visitor chooses **Continue with Google** or **Continue as Guest**.
3. An incomplete profile opens three short sections: **About you**, **Your goal**, and **Your setup**. Preferred name is required for both account types.
4. Saving the profile creates the personal plan.
5. The plan offers **Start today’s workout** and **Explore dashboard**.
6. Home, Workouts, My Plan, Camera Coach and Progress are available without completing any workout. The account menu opens Profile and Leaderboard.

Choosing **Explore dashboard** leaves the plan saved and creates no workout history. Opening My Plan later loads that plan; it does not automatically generate another one. Editing and saving the profile deliberately refreshes the recommendation.

The library distinguishes the four camera-supported exercises (squats, push-ups, crunches and jumping jacks) from other exercises in the existing catalogue. Camera access still requires pressing **Start Camera** and granting permission.

## Refresh, Back and Forward

The app uses small hash routes, such as `#dashboard`, `#workouts`, `#plan`, `#coach`, `#progress`, `#leaderboard` and `#profile`. These are handled in the existing React application; no routing framework or Vercel path rewrite was added.

Refresh restores the account through the existing session cookie, then loads that account’s saved profile, plan and history. Guests restore their local data after explicitly entering guest mode. Browser Back and Forward change the screen while the app continues to enforce profile setup when it is incomplete.

An active camera session and an unsaved result are temporary. Refreshing the camera page does not recreate an active session. Finish a session and check its save status before closing the page.

## Preferred name and existing accounts

The database already had `users.display_name`, so this update reuses it. There is no new name column.

A first Google login supplies a convenient initial name. The profile form lets the person change it. Later Google logins update Google email/avatar details while preserving the chosen name. Profile measurements and name changes save together in one PostgreSQL statement. The server chooses the owner from the authenticated cookie, regardless of ownership fields supplied by a browser.

Existing Google accounts retain their profile, plans and history. Their stored name can be edited in Profile. An existing guest profile without a name resumes setup so the person can supply one; the old guest history is retained.

## Guest data and Judge Demo

Guests keep these independent values in this browser’s localStorage:

| Purpose | Storage key |
|---|---|
| Preferred name and fitness profile | `bits-motion-profile-v1` |
| Saved plan | `bits-motion-plan-v1` |
| Saved workout history | `bits-motion-sessions-v1` |
| Whether this browser is currently in guest mode | `bits-motion-guest-active-v1` |

Exiting guest mode removes the active-mode marker, not the guest’s saved profile, plan or history. Choosing Guest again restores those values. Clearing browser/site data removes local guest data.

Signing in with Google loads only that account’s database records. Guest data is not imported automatically. A failed account request displays a loading/error/retry state; it does not substitute guest records.

Judge Demo remains temporary and visibly labelled. Its sample profile, plan and history do not write to guest storage or to a Google account.

## What the plan activity display means

The existing database stores plans separately from saved camera sessions. No session is created just by generating or viewing a plan. The plan activity card shows camera movements with saved repetitions since the plan was created; it does not claim that every prescribed set was completed. Manual exercises are not marked complete automatically. The app does not have a separate manual exercise-completion log.

Progress calculations use saved numeric workout results. An empty account should have an empty progress state, not invented activity.

## Leaderboard privacy

Signed-in users can see the existing live leaderboard. Participation is optional and controlled in Profile. Rankings show the chosen leaderboard alias and aggregate activity, not email, Google subject, database UUID, weight, height or private goals.

Signed-out/guest views use an explicitly labelled sample preview. A live leaderboard error should be presented as an error with a retry action.

## Database and deployment impact

| Item | Required for V2? |
|---|---|
| New database table or column | No |
| Database migration or reset | No |
| Run `npm run db:setup` on an already initialized database | No |
| New environment variable | No |
| New Google OAuth client | No |
| Change Google origins for the same existing domain | No |
| Publish a new Vercel deployment | Yes |

The existing tables are retained: `users`, `profiles`, `exercises`, `workout_plans`, `plan_items`, `sessions`, and `exercise_results`. Existing plan and session ownership stays tied to the authenticated internal user UUID. Schema setup is still an explicit command, not part of API requests.

The same four environment variables remain:

- `VITE_GOOGLE_CLIENT_ID`: public Google Web client ID, available to the browser.
- `GOOGLE_CLIENT_ID`: the matching client ID for server verification.
- `DATABASE_URL`: private Neon connection string.
- `SESSION_SECRET`: private cookie-signing secret.

For a fresh environment, follow [the original setup guide](AUTH_DATABASE_DEPLOYMENT.md). Keep private values in the ignored local environment file and Vercel settings. Do not put them in source files or screenshots.

## Check the update locally

In the folder containing `package.json`, run:

```bash
npm ci
npm test
npm run build
npm run dev
```

Use `http://localhost:5173` for full local testing. The development server serves both the frontend and the existing API. Leave the terminal running while using the app.

`npm run preview` can show the built frontend, but it does not provide the local account API.

## Publish the update to the existing Vercel project

1. Review `git status` and the code changes. Keep `.env.local`, credentials, `node_modules` and `dist` out of the commit.
2. Commit the V2 source and documentation changes, then push the current feature branch to GitHub.
3. Open the existing Vercel project’s **Deployments** page.
4. Confirm the new deployment uses the branch tracked by Production and contains the new commit. Vercel normally starts this deployment when the connected branch is pushed.
5. Confirm the build finishes successfully. The build remains `npm run build` and the output remains `dist`.
6. Open the stable production URL and run the checks below. If the browser still shows the old app, close old app tabs and reload before diagnosing the new version.

A **Redeploy** of an older commit cannot include source code that was never pushed. Keep the existing working environment values. If the production hostname changes, add that new exact origin to the same Google Web client’s Authorized JavaScript Origins.

## Acceptance checks after deployment

Use two Google accounts and one guest profile. These are checks to perform, not a claim that real production login or camera movement was retested automatically.

1. **Guest onboarding:** Enter a preferred name and the existing fitness fields. Move Back and Continue and verify entered values remain. Blank names should be rejected.
2. **Do later:** Generate the plan, select Explore dashboard, open My Plan and refresh. The same plan should remain and history should still be empty.
3. **Free navigation:** Open Home, Workouts, My Plan, Coach, Progress, Leaderboard and Profile before completing a workout. Try browser Back and Forward.
4. **Preferred name:** In Google Account A, change the preferred name. Sign out, sign in again and refresh. The chosen name should return.
5. **Account switching:** Save distinct profile and workout data for A and B. Switching to B must not reveal A’s private records. Returning to A must restore A’s records.
6. **Guest separation:** Exit Google, continue as Guest and confirm guest data is independent. Sign in again and confirm guest data does not replace account data.
7. **Another browser:** Sign in to A from a clean browser and confirm the saved profile, plan and history return from Neon.
8. **Camera:** Grant permission, test a few real repetitions for each supported camera exercise, end the session and verify the saved result in Progress. Also test denied permission and returning to the dashboard.
9. **Responsive layout:** Check a phone-width window, a tablet-width window and desktop. Text, cards and navigation should fit without sideways scrolling.
10. **Reduced motion:** Enable the operating system’s reduced-motion preference and reload in a new tab. Decorative motion should be removed and the intro should not delay entry.
11. **Failure state:** If an account request fails, retry it. No sample or guest history should be presented as that account’s progress.

Automated API tests use mocked Google verification and database responses. They verify request behavior and ownership rules, but are not a substitute for the live Google/Neon and physical-camera checks above.
