import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import LaunchScreen from './components/LaunchScreen';
import DashboardScreen from './screens/DashboardScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import PlanScreen from './screens/PlanScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProgressScreen from './screens/ProgressScreen';
import ResultScreen from './screens/ResultScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import WorkoutLibraryScreen from './screens/WorkoutLibraryScreen';
import FeaturesScreen from './screens/FeaturesScreen';
import HowItWorksScreen from './screens/HowItWorksScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import HealthDisclaimerScreen from './screens/HealthDisclaimerScreen';
import SelfGuidedScreen from './screens/SelfGuidedScreen';
import { api } from './services/api';
import { estimateCalories, getExerciseMet } from './utils/calories';
import {
  createJudgeDemoHistory,
  guestStorageWarning,
  isGuestModeActive,
  loadGuestPlan,
  loadGuestProfile,
  loadGuestSessions,
  saveGuestPlan,
  saveGuestProfile,
  saveGuestSession,
  setGuestModeActive,
} from './utils/storage';
import { buildWorkoutImpact } from './utils/workoutImpact';
import { generateWorkoutPlan } from './utils/workoutRecommendation';
import { APP_SCREENS, PUBLIC_SCREENS, historyDepth, resolveRequestedScreen, screenFromHash } from './utils/navigation';
import { profileErrors } from '../shared/profile.js';
import { getCircuitRounds } from '../shared/recommendation.js';
import { EXERCISES } from './data/exercises.js';

const CoachScreen = lazy(() => import('./screens/CoachScreen'));

const EMPTY_PROFILE = {
  displayName: '',
  age: '',
  height: '',
  weight: '',
  level: '',
  goal: '',
  time: '',
  location: '',
  equipment: '',
  lowImpact: false,
  leaderboardOptIn: false,
  leaderboardName: '',
};

const JUDGE_PROFILE = {
  displayName: 'Judge',
  age: '20',
  height: '175',
  weight: '70',
  level: 'Beginner',
  goal: 'Stay fit',
  time: '20',
  location: 'Hostel',
  equipment: 'None',
  lowImpact: false,
  leaderboardOptIn: false,
  leaderboardName: 'Judge demo',
};

function normalizeProfile(profile, user) {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
    displayName: profile?.displayName || user?.name || '',
    leaderboardOptIn: user?.leaderboardOptIn ?? profile?.leaderboardOptIn ?? false,
    leaderboardName: user?.leaderboardName || profile?.leaderboardName || user?.name || '',
  };
}

function profileIsComplete(profile) {
  return Boolean(profile) && Object.keys(profileErrors(profile)).length === 0;
}

function requestedScreen() {
  return screenFromHash(window.location.hash);
}

function updateLocation(screen, replace = false) {
  const url = new URL(window.location.href);
  url.hash = screen === 'welcome' ? '' : screen;
  const currentDepth = historyDepth(window.history.state);
  const currentScreen = requestedScreen() || 'welcome';
  const shouldReplace = replace || currentScreen === screen;
  const state = {
    ...(window.history.state || {}),
    bitsMotion: true,
    bitsMotionDepth: shouldReplace ? currentDepth : currentDepth + 1,
    bitsMotionScreen: screen,
  };
  window.history[shouldReplace ? 'replaceState' : 'pushState'](state, '', url);
}

function screenForCurrentLocation(profile, status) {
  return resolveRequestedScreen({
    requested: requestedScreen(),
    activeAccount: ['signed-in', 'guest', 'demo'].includes(status),
    profileComplete: profileIsComplete(profile),
  });
}

function sessionPayload(result) {
  return {
    clientSessionId: result.clientSessionId,
    exerciseId: result.exerciseId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationSeconds: result.durationSeconds,
    calories: result.calories,
    reps: result.reps,
    framingInterruptions: result.framingInterruptions,
    cueCounts: result.cueCounts,
    movementMetrics: result.movementMetrics,
    formSummary: result.formSummary,
  };
}

export function buildWorkoutSequence(plan) {
  if (!plan?.exercises?.length) return [];
  const warmup = plan.exercises.find((e) => e.id === 'warmup');
  const cooldown = plan.exercises.find((e) => e.id === 'cooldown');
  const stations = plan.exercises.filter((e) => !['warmup', 'cooldown'].includes(e.id));
  const rounds = plan.rounds || getCircuitRounds(plan.totalMinutes);

  if (rounds <= 1 || stations.length === 0) {
    return plan.exercises.map((e) => ({ ...e, round: 1, totalRounds: 1, sequenceLabel: e.name }));
  }

  const sequence = [];
  if (warmup) {
    sequence.push({ ...warmup, round: 1, totalRounds: rounds, sequenceLabel: 'Mobility warm-up' });
  }

  for (let r = 1; r <= rounds; r += 1) {
    for (const station of stations) {
      sequence.push({
        ...station,
        key: `${station.id}-r${r}`,
        round: r,
        totalRounds: rounds,
        sets: 1,
        duration: `1 set · ${station.workSeconds || 30}s work / ${station.restSeconds || 30}s recovery`,
        sequenceLabel: `Round ${r} of ${rounds} · ${station.name}`,
        estimatedSeconds: (station.workSeconds || 30) + (station.restSeconds || 30),
      });
    }
  }

  if (cooldown) {
    sequence.push({ ...cooldown, round: rounds, totalRounds: rounds, sequenceLabel: 'Cooldown & breathing' });
  }
  return sequence;
}

function readStoredActiveWorkout() {
  try {
    const stored = sessionStorage.getItem('bits-motion-active-workout');
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.exercises?.length ? parsed : null;
  } catch {
    return null;
  }
}

function restoredCurrentMovement() {
  const workout = readStoredActiveWorkout();
  return workout ? workout.exercises[Math.max(0, Math.min(workout.currentIndex, workout.exercises.length - 1))] : null;
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [profile, setProfile] = useState(() => normalizeProfile(null));
  const [profileDraft, setProfileDraft] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planState, setPlanState] = useState('idle');
  const [planErrorAction, setPlanErrorAction] = useState('load');
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [progressState, setProgressState] = useState('idle');
  const [resultSaveState, setResultSaveState] = useState('idle');
  // Restore the in-progress movement's identity from the persisted active workout so a
  // mid-workout refresh reopens the same exercise the "Movement X of N" label describes,
  // instead of silently falling back to the defaults below.
  const [activeExerciseId, setActiveExerciseId] = useState(() => {
    const movement = restoredCurrentMovement();
    return movement?.cameraSupported ? movement.id : 'squats';
  });
  const [coachReturnScreen, setCoachReturnScreen] = useState(() => (readStoredActiveWorkout() ? 'plan' : 'dashboard'));
  const [activeWorkout, setActiveWorkout] = useState(readStoredActiveWorkout);
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

  // A guided workout stays in `activeWorkout` while the user wanders off to practice an
  // unrelated movement (e.g. from the Workout Library). Only treat the screen currently
  // open as "part of the workout" when it matches the workout's own current step —
  // otherwise an ad-hoc session would show a false "Movement X of N" label, a Skip button
  // that silently advances the real workout, or a false completion celebration.
  function currentWorkoutMovementFor(exerciseId) {
    return activeWorkout && activeWorkout.exercises[activeWorkout.currentIndex]?.id === exerciseId ? activeWorkout : null;
  }

  useEffect(() => {
    try {
      if (activeWorkout) {
        sessionStorage.setItem('bits-motion-active-workout', JSON.stringify(activeWorkout));
      } else {
        sessionStorage.removeItem('bits-motion-active-workout');
      }
    } catch {}
  }, [activeWorkout]);
  const [selfGuidedExerciseId, setSelfGuidedExerciseId] = useState(() => {
    const movement = restoredCurrentMovement();
    return movement && !movement.cameraSupported ? movement.id : 'warmup';
  });
  const [selfGuidedReturnScreen, setSelfGuidedReturnScreen] = useState('plan');
  const [auth, setAuth] = useState({ status: 'checking', user: null, accountSyncAvailable: false, error: '' });
  const [showLaunch, setShowLaunch] = useState(() => {
    try {
      return sessionStorage.getItem('bits-motion-launch-seen-v2') !== '1';
    } catch {
      return true;
    }
  });
  const accountRevision = useRef(0);
  const activeResultId = useRef(null);
  const pendingProtectedScreen = useRef(null);

  useEffect(() => {
    if (showLaunch) return;
    const heading = document.querySelector('main h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen, showLaunch]);

  const routeTo = useCallback((nextScreen, { replace = false } = {}) => {
    setScreen(nextScreen);
    updateLocation(nextScreen, replace);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const goHome = useCallback(() => routeTo('welcome'), [routeTo]);

  const goBack = useCallback(() => {
    if (historyDepth(window.history.state) > 0) {
      window.history.back();
      return;
    }
    routeTo('welcome', { replace: true });
  }, [routeTo]);

  const finishLaunch = useCallback(() => {
    try {
      sessionStorage.setItem('bits-motion-launch-seen-v2', '1');
    } catch {
      // The launch can still complete when browser storage is unavailable.
    }
    setShowLaunch(false);
  }, []);

  useEffect(() => {
    if (!showLaunch) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(finishLaunch, reducedMotion ? 0 : 1450);
    return () => window.clearTimeout(timer);
  }, [finishLaunch, showLaunch]);

  const activateVisitor = useCallback(({ accountSyncAvailable = false, error = '' } = {}) => {
    accountRevision.current += 1;
    setGuestModeActive(false);
    setAuth({ status: error ? 'error' : 'visitor', user: null, accountSyncAvailable, error });
    setProfile(normalizeProfile(null));
    setProfileDraft(null);
    pendingProtectedScreen.current = null;
    setSessions([]);
    setSessionSummary(null);
    setProgressState('idle');
    setPlan(null);
    setPlanState('idle');
    setResult(null);
    setResultSaveState('idle');
    setActiveWorkout(null);
    setIsWorkoutComplete(false);
  }, []);

  const activateGuestMode = useCallback(({ accountSyncAvailable = false, error = '', markActive = true } = {}) => {
    accountRevision.current += 1;
    if (markActive) setGuestModeActive(true);
    const guestProfile = normalizeProfile(loadGuestProfile());
    let guestPlan = loadGuestPlan();
    if (profileIsComplete(guestProfile) && !guestPlan) {
      guestPlan = { ...generateWorkoutPlan(guestProfile), createdAt: new Date().toISOString() };
      if (!guestStorageWarning()) saveGuestPlan(guestPlan);
    }
    const guestSessions = loadGuestSessions();
    setAuth({ status: 'guest', user: null, accountSyncAvailable, error: error || guestStorageWarning() });
    setProfile(guestProfile);
    setProfileDraft(null);
    setSessions(guestSessions);
    setSessionSummary(null);
    setProgressState('ready');
    setPlan(guestPlan);
    setPlanState('ready');
    setResult(null);
    setResultSaveState('idle');
    return { profile: guestProfile, plan: guestPlan };
  }, []);

  const loadSignedInResources = useCallback(async (revision) => {
    setProgressState('loading');
    setPlanState('loading');
    setPlanErrorAction('load');
    const [sessionsResult, planResult, summaryResult] = await Promise.allSettled([
      api.sessions(),
      api.latestPlan(),
      api.sessionsSummary(),
    ]);
    if (accountRevision.current !== revision) return;

    if (summaryResult.status === 'fulfilled') {
      setSessionSummary(summaryResult.value);
    } else {
      setSessionSummary(null);
    }

    const errors = [];
    if (sessionsResult.status === 'fulfilled') {
      setSessions(sessionsResult.value);
      setProgressState('ready');
    } else {
      setSessions([]);
      setProgressState('error');
      errors.push('Progress could not sync: ' + sessionsResult.reason.message);
    }

    if (planResult.status === 'fulfilled') {
      setPlan(planResult.value);
      setPlanState('ready');
    } else {
      setPlan(null);
      setPlanState('error');
      errors.push('Saved plan could not sync: ' + planResult.reason.message);
    }

    setAuth((current) => ({ ...current, error: errors.join(' ') }));
  }, []);

  const refreshSessions = useCallback(async () => {
    if (auth.status === 'signed-in' && auth.user) {
      const revision = accountRevision.current;
      setProgressState('loading');
      try {
        const [remoteSessions, summary] = await Promise.all([
          api.sessions(),
          api.sessionsSummary().catch(() => null),
        ]);
        if (accountRevision.current === revision) {
          setSessions(remoteSessions);
          if (summary) setSessionSummary(summary);
          setProgressState('ready');
          setAuth((current) => ({ ...current, error: '' }));
        }
        return remoteSessions;
      } catch (error) {
        if (accountRevision.current === revision) {
          setSessions([]);
          setSessionSummary(null);
          setProgressState('error');
          setAuth((current) => ({ ...current, error: 'Progress could not sync: ' + error.message }));
        }
        return null;
      }
    }

    if (auth.status === 'guest') {
      const guestSessions = loadGuestSessions();
      setSessions(guestSessions);
      setProgressState('ready');
      return guestSessions;
    }

    if (auth.status === 'demo') {
      setProgressState('ready');
      return sessions;
    }

    setSessions([]);
    setProgressState('idle');
    return null;
  }, [auth.status, auth.user, sessions]);

  useEffect(() => {
    let active = true;
    const revision = accountRevision.current;

    (async () => {
      try {
        const status = await api.status();
        if (!active || accountRevision.current !== revision) return;
        const accountSyncAvailable = status.databaseConfigured && status.googleConfigured && Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

        if (!accountSyncAvailable) {
          if (isGuestModeActive()) {
            const guest = activateGuestMode({ accountSyncAvailable: false });
            routeTo(screenForCurrentLocation(guest.profile, 'guest'), { replace: true });
          } else {
            activateVisitor({ accountSyncAvailable: false });
            routeTo(screenForCurrentLocation(null, 'visitor'), { replace: true });
          }
          return;
        }

        if (isGuestModeActive()) {
          const guest = activateGuestMode({ accountSyncAvailable: true });
          routeTo(screenForCurrentLocation(guest.profile, 'guest'), { replace: true });
          return;
        }

        try {
          const account = await api.me();
          if (!active || accountRevision.current !== revision) return;
          const signedInRevision = accountRevision.current;
          const nextProfile = normalizeProfile(account.profile, account.user);
          setGuestModeActive(false);
          setProfile(nextProfile);
          setAuth({ status: 'signed-in', user: account.user, accountSyncAvailable: true, error: '' });
          await loadSignedInResources(signedInRevision);
          if (!active || accountRevision.current !== signedInRevision) return;
          routeTo(screenForCurrentLocation(nextProfile, 'signed-in'), { replace: true });
        } catch (error) {
          if (!active || accountRevision.current !== revision) return;
          if (error.status === 401) {
            if (isGuestModeActive()) {
              const guest = activateGuestMode({ accountSyncAvailable: true });
              routeTo(screenForCurrentLocation(guest.profile, 'guest'), { replace: true });
            } else {
              activateVisitor({ accountSyncAvailable: true });
              routeTo(screenForCurrentLocation(null, 'visitor'), { replace: true });
            }
          } else {
            activateVisitor({ accountSyncAvailable: true, error: 'Account data could not load: ' + error.message });
            routeTo(screenForCurrentLocation(null, 'visitor'), { replace: true });
          }
        }
      } catch (error) {
        if (!active || accountRevision.current !== revision) return;
        if (isGuestModeActive()) {
          const guest = activateGuestMode({ accountSyncAvailable: false, error: 'Cloud account service is unavailable: ' + error.message });
          routeTo(screenForCurrentLocation(guest.profile, 'guest'), { replace: true });
        } else {
          activateVisitor({ accountSyncAvailable: false, error: 'Cloud account service is unavailable: ' + error.message });
          routeTo(screenForCurrentLocation(null, 'visitor'), { replace: true });
        }
      }
    })();

    return () => { active = false; };
  }, [activateGuestMode, activateVisitor, loadSignedInResources, routeTo]);

  useEffect(() => {
    function handleHistory() {
      const requested = requestedScreen();
      const resolved = resolveRequestedScreen({
        requested,
        activeAccount: ['signed-in', 'guest', 'demo'].includes(auth.status),
        profileComplete: profileIsComplete(profile),
      });
      setScreen(resolved);
      if (resolved !== (requested || 'welcome')) updateLocation(resolved, true);
      if (resolved === 'progress') void refreshSessions();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.addEventListener('popstate', handleHistory);
    window.addEventListener('hashchange', handleHistory);
    return () => {
      window.removeEventListener('popstate', handleHistory);
      window.removeEventListener('hashchange', handleHistory);
    };
  }, [auth.status, profile, refreshSessions]);

  const navigate = useCallback((nextScreen) => {
    const activeAccount = ['signed-in', 'guest', 'demo'].includes(auth.status);
    if (PUBLIC_SCREENS.has(nextScreen)) {
      routeTo(nextScreen);
      return;
    }
    if (!activeAccount) {
      routeTo('welcome');
      return;
    }
    if (!profileIsComplete(profile) && nextScreen !== 'profile') {
      routeTo('profile');
      return;
    }
    if (nextScreen === 'progress') void refreshSessions();
    routeTo(nextScreen);
  }, [auth.status, profile, refreshSessions, routeTo]);

  const handleContinueGuest = useCallback(() => {
    if (['signing-in', 'signing-out'].includes(auth.status)) return;
    const guest = activateGuestMode({ accountSyncAvailable: auth.accountSyncAvailable });
    if (profileIsComplete(guest.profile) && pendingProtectedScreen.current === 'coach') {
      pendingProtectedScreen.current = null;
      setActiveExerciseId('squats');
      setCoachReturnScreen('welcome');
      routeTo('coach');
      return;
    }
    routeTo(profileIsComplete(guest.profile) ? 'dashboard' : 'profile');
  }, [activateGuestMode, auth.accountSyncAvailable, auth.status, routeTo]);

  const handleExitGuest = useCallback(() => {
    activateVisitor({ accountSyncAvailable: auth.accountSyncAvailable });
    routeTo('welcome');
  }, [activateVisitor, auth.accountSyncAvailable, routeTo]);

  const startJudgeDemo = useCallback(() => {
    if (['signing-in', 'signing-out'].includes(auth.status)) return false;
    if (auth.user) {
      setAuth((current) => ({ ...current, error: 'Sign out before starting the isolated Judge Demo.' }));
      return false;
    }
    accountRevision.current += 1;
    setGuestModeActive(false);
    setAuth((current) => ({ status: 'demo', user: null, accountSyncAvailable: current.accountSyncAvailable, error: '' }));
    setProfile(JUDGE_PROFILE);
    setSessions(createJudgeDemoHistory());
    setSessionSummary(null);
    setProgressState('ready');
    setPlan(generateWorkoutPlan(JUDGE_PROFILE));
    setPlanState('ready');
    setActiveWorkout(null);
    setIsWorkoutComplete(false);
    routeTo('dashboard');
    return true;
  }, [auth.user, auth.status, routeTo]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return undefined;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_judge_demo',
      title: 'Start judge demo',
      description: 'Open the isolated BITS in Motion judge dashboard with temporary sample data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        return startJudgeDemo()
          ? { screen: 'dashboard', profile: JUDGE_PROFILE, storage: 'temporary-memory' }
          : { error: 'Sign out before starting Judge Demo.' };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, [startJudgeDemo]);

  async function handleGoogleCredential(credential) {
    if (['signing-in', 'signing-out'].includes(auth.status)) return;
    const revision = accountRevision.current + 1;
    accountRevision.current = revision;
    setGuestModeActive(false);
    setProfile(normalizeProfile(null));
    setProfileDraft(null);
    setSessions([]);
    setProgressState('loading');
    setPlan(null);
    setPlanState('loading');
    setResult(null);
    setActiveWorkout(null);
    setIsWorkoutComplete(false);
    setAuth((current) => ({ ...current, status: 'signing-in', user: null, error: '' }));

    try {
      const account = await api.signInWithGoogle(credential);
      if (accountRevision.current !== revision) return;
      const nextProfile = normalizeProfile(account.profile, account.user);
      setProfile(nextProfile);
      setAuth({ status: 'signed-in', user: account.user, accountSyncAvailable: true, error: '' });
      await loadSignedInResources(revision);
      if (accountRevision.current !== revision) return;
      if (profileIsComplete(nextProfile) && pendingProtectedScreen.current === 'coach') {
        pendingProtectedScreen.current = null;
        setActiveExerciseId('squats');
        setCoachReturnScreen('welcome');
        routeTo('coach');
      } else {
        routeTo(profileIsComplete(nextProfile) ? 'dashboard' : 'profile');
      }
    } catch (error) {
      if (accountRevision.current !== revision) return;
      activateVisitor({ accountSyncAvailable: true, error: error.message });
      routeTo('welcome');
    }
  }

  async function handleSignOut() {
    const revision = accountRevision.current + 1;
    accountRevision.current = revision;
    globalThis.google?.accounts?.id?.disableAutoSelect?.();
    setGuestModeActive(false);
    setAuth((current) => ({ status: 'signing-out', user: null, accountSyncAvailable: current.accountSyncAvailable, error: '' }));
    setProfile(normalizeProfile(null));
    setProfileDraft(null);
    pendingProtectedScreen.current = null;
    setSessions([]);
    setProgressState('idle');
    setPlan(null);
    setPlanState('idle');
    setResult(null);
    setResultSaveState('idle');
    setActiveWorkout(null);
    setIsWorkoutComplete(false);
    routeTo('welcome');

    try {
      await api.signOut();
      if (accountRevision.current === revision) setAuth((current) => ({ ...current, status: 'visitor', user: null, error: '' }));
    } catch (error) {
      if (accountRevision.current === revision) setAuth((current) => ({ ...current, status: 'error', user: null, error: 'Sign-out could not reach the server: ' + error.message }));
    }
  }

  async function handleProfileSubmit(nextProfile) {
    const normalized = normalizeProfile(nextProfile);
    const revision = accountRevision.current;

    if (auth.status === 'guest' || auth.status === 'demo') {
      const nextPlan = { ...generateWorkoutPlan(normalized), createdAt: new Date().toISOString() };
      if (auth.status === 'guest' && (!saveGuestProfile(normalized) || !saveGuestPlan(nextPlan))) {
        throw new Error('This browser could not save your profile. Allow site storage and try again.');
      }
      setProfile(normalized);
      setProfileDraft(null);
      setPlan(nextPlan);
      setPlanState('ready');
      if (pendingProtectedScreen.current === 'coach') {
        pendingProtectedScreen.current = null;
        setActiveExerciseId('squats');
        setCoachReturnScreen('dashboard');
        routeTo('coach', { replace: true });
      } else {
        routeTo('plan');
      }
      return;
    }

    if (auth.status !== 'signed-in' || !auth.user) return;
    let saved;
    try {
      saved = await api.saveProfile(normalized);
    } catch {
      if (accountRevision.current === revision) throw new Error('Your profile could not be saved. Your entries are still here—please try again.');
      return;
    }
    if (accountRevision.current !== revision) return;
    if (saved.user) setAuth((current) => ({ ...current, user: saved.user, error: '' }));
    setProfile(normalizeProfile(saved.profile, saved.user));
    setProfileDraft(null);
    setPlan(null);
    setPlanState('loading');
    setPlanErrorAction('generate');
    if (pendingProtectedScreen.current === 'coach') {
      pendingProtectedScreen.current = null;
      setActiveExerciseId('squats');
      setCoachReturnScreen('dashboard');
      routeTo('coach', { replace: true });
    } else {
      routeTo('plan');
    }

    try {
      const savedPlan = await api.generatePlan();
      if (accountRevision.current !== revision) return;
      setPlan(savedPlan);
      setPlanState('ready');
    } catch {
      if (accountRevision.current !== revision) return;
      setPlanState('error');
    }
  }

  async function handleCreatePlan() {
    if (!profileIsComplete(profile)) {
      navigate('profile');
      return;
    }

    if (auth.status === 'guest' || auth.status === 'demo') {
      const nextPlan = { ...generateWorkoutPlan(profile), createdAt: new Date().toISOString() };
      if (auth.status === 'guest' && !saveGuestPlan(nextPlan)) {
        setAuth((current) => ({ ...current, error: 'This browser could not save your plan. Allow site storage and try again.' }));
        return;
      }
      setPlan(nextPlan);
      setPlanState('ready');
      routeTo('plan');
      return;
    }

    if (auth.status !== 'signed-in') return;
    const revision = accountRevision.current;
    setPlanState('loading');
    setPlanErrorAction('generate');
    routeTo('plan');
    try {
      const savedPlan = await api.generatePlan();
      if (accountRevision.current !== revision) return;
      setPlan(savedPlan);
      setPlanState('ready');
      setAuth((current) => ({ ...current, error: '' }));
    } catch {
      if (accountRevision.current !== revision) return;
      setPlanState('error');
    }
  }

  async function handleRetryPlan() {
    if (planErrorAction === 'generate') {
      await handleCreatePlan();
      return;
    }
    if (auth.status !== 'signed-in') return;
    const revision = accountRevision.current;
    setPlanState('loading');
    try {
      const savedPlan = await api.latestPlan();
      if (accountRevision.current !== revision) return;
      setPlan(savedPlan);
      setPlanState('ready');
      setAuth((current) => ({ ...current, error: '' }));
    } catch {
      if (accountRevision.current === revision) setPlanState('error');
    }
  }

  function handleStartCoach(exerciseId, returnScreen = screen) {
    if (!profileIsComplete(profile)) {
      navigate('profile');
      return;
    }
    const exercise = Object.values(EXERCISES).find((item) => item.id === exerciseId);
    if (exerciseId && !exercise?.cameraSupported) {
      handleStartSelfGuided(exerciseId, returnScreen);
      return;
    }
    setActiveExerciseId(exerciseId || 'squats');
    setCoachReturnScreen(APP_SCREENS.has(returnScreen) && returnScreen !== 'coach' ? returnScreen : 'dashboard');
    routeTo('coach');
  }

  function handleStartSelfGuided(exerciseId, returnScreen = screen) {
    if (!profileIsComplete(profile)) {
      navigate('profile');
      return;
    }
    setSelfGuidedExerciseId(exerciseId || 'warmup');
    setSelfGuidedReturnScreen(APP_SCREENS.has(returnScreen) && returnScreen !== 'self-guided' ? returnScreen : 'dashboard');
    routeTo('self-guided');
  }

  function handleStartWorkout(targetPlan = plan, startIndex = 0) {
    if (!profileIsComplete(profile)) {
      navigate('profile');
      return;
    }
    const currentPlan = targetPlan || plan;
    if (!currentPlan?.exercises?.length) {
      navigate('plan');
      return;
    }
    const exercises = buildWorkoutSequence(currentPlan);
    const index = Math.max(0, Math.min(startIndex, exercises.length - 1));
    const workout = {
      planId: currentPlan.id || 'current',
      planTitle: currentPlan.title,
      exercises,
      currentIndex: index,
      completedList: [],
      startedAt: new Date().toISOString(),
    };
    setActiveWorkout(workout);
    setIsWorkoutComplete(false);
    const movement = exercises[index];
    if (movement.cameraSupported) {
      handleStartCoach(movement.id, 'plan');
    } else {
      handleStartSelfGuided(movement.id, 'plan');
    }
  }

  function handleContinueWorkout() {
    if (!activeWorkout) return;
    const nextIndex = activeWorkout.currentIndex + 1;
    if (nextIndex >= activeWorkout.exercises.length) {
      setIsWorkoutComplete(true);
      setActiveWorkout(null);
      routeTo('result');
      return;
    }
    const updatedWorkout = {
      ...activeWorkout,
      currentIndex: nextIndex,
    };
    setActiveWorkout(updatedWorkout);
    const nextMovement = activeWorkout.exercises[nextIndex];
    if (nextMovement.cameraSupported) {
      handleStartCoach(nextMovement.id, 'plan');
    } else {
      handleStartSelfGuided(nextMovement.id, 'plan');
    }
  }

  function handleFinishWorkoutEarly() {
    setActiveWorkout(null);
    setIsWorkoutComplete(false);
    routeTo('plan');
  }

  function handleSkipMovement() {
    if (activeWorkout) {
      const nextIndex = activeWorkout.currentIndex + 1;
      if (nextIndex >= activeWorkout.exercises.length) {
        setActiveWorkout(null);
        setIsWorkoutComplete(false);
        routeTo('plan');
        return;
      }
      handleContinueWorkout();
    } else {
      goBack();
    }
  }

  function handleNavigate(nextScreen) {
    if (nextScreen === 'coach') {
      handleStartCoach('squats', screen === 'coach' ? 'dashboard' : screen);
      return;
    }
    navigate(nextScreen);
  }

  const handleCoachBack = useCallback(() => {
    if (historyDepth(window.history.state) > 0) {
      goBack();
      return;
    }
    if (coachReturnScreen && APP_SCREENS.has(coachReturnScreen) && !['coach', 'self-guided'].includes(coachReturnScreen)) {
      navigate(coachReturnScreen);
      return;
    }
    goBack();
  }, [coachReturnScreen, goBack, navigate]);

  function handleCameraGuided() {
    setActiveExerciseId('squats');
    setCoachReturnScreen('welcome');
    routeTo('preview');
    return true;
  }

  function handleEndSession(sessionMetrics) {
    const calories = estimateCalories({
      weightKg: profile.weight,
      durationSeconds: sessionMetrics.durationSeconds,
      met: getExerciseMet(sessionMetrics.exerciseId),
    });
    const workoutMovement = currentWorkoutMovementFor(sessionMetrics.exerciseId);
    const isLastWorkoutMovement = Boolean(workoutMovement) && workoutMovement.currentIndex >= workoutMovement.exercises.length - 1;
    const nextResult = {
      ...sessionMetrics,
      completedAt: new Date().toISOString(),
      clientSessionId: globalThis.crypto.randomUUID(),
      calories,
      impact: buildWorkoutImpact(sessionMetrics),
      // Snapshot the completed workout's shape so the celebration message on the Result
      // screen stays correct even after activeWorkout is cleared below (finishing the last
      // movement must not leave a "resumable" workout pointing at an already-completed step).
      ...(isLastWorkoutMovement ? {
        completedWorkoutTotalSteps: workoutMovement.exercises.length,
        completedWorkoutPlanTitle: workoutMovement.planTitle,
      } : {}),
    };
    activeResultId.current = nextResult.clientSessionId;
    setResult(nextResult);
    setResultSaveState(auth.user ? 'saving' : 'idle');

    if (isLastWorkoutMovement) {
      setIsWorkoutComplete(true);
      setActiveWorkout(null);
    }

    routeTo('result');

    if (auth.status === 'signed-in' && auth.user) {
      const revision = accountRevision.current;
      const payload = sessionPayload(nextResult);
      api.saveSession(payload).then((savedSession) => {
        if (accountRevision.current !== revision || activeResultId.current !== nextResult.clientSessionId) return;
        setResult((current) => ({ ...current, id: savedSession.id }));
        setResultSaveState('saved');
        return refreshSessions();
      }).catch((error) => {
        if (accountRevision.current !== revision || activeResultId.current !== nextResult.clientSessionId) return;
        setResultSaveState('error');
        setAuth((current) => ({ ...current, error: 'Session sync paused: ' + error.message }));
      });
    } else if (auth.status === 'guest') {
      const guestSession = { ...nextResult, id: nextResult.clientSessionId, source: 'real' };
      saveGuestSession(guestSession);
      void refreshSessions();
    } else if (auth.status === 'demo') {
      const demoSession = { ...nextResult, id: nextResult.clientSessionId, source: 'sample' };
      setSessions((current) => [demoSession, ...current]);
    }
  }

  function handleEndSelfGuidedSession(metrics) {
    const calories = estimateCalories({
      weightKg: profile.weight,
      durationSeconds: metrics.durationSeconds,
      met: getExerciseMet(metrics.exerciseId),
    });
    const workoutMovement = currentWorkoutMovementFor(metrics.exerciseId);
    const isLastWorkoutMovement = Boolean(workoutMovement) && workoutMovement.currentIndex >= workoutMovement.exercises.length - 1;
    const nextResult = {
      ...metrics,
      reps: 0,
      completedAt: new Date().toISOString(),
      clientSessionId: globalThis.crypto.randomUUID(),
      calories,
      source: 'self-guided',
      formSummary: `Completed self-guided session (${Math.max(1, Math.round(metrics.durationSeconds / 60))} min).`,
      framingInterruptions: 0,
      cueCounts: {},
      movementMetrics: {},
      impact: buildWorkoutImpact({
        exerciseId: metrics.exerciseId,
        reps: 0,
        durationSeconds: metrics.durationSeconds,
        cueCounts: {},
      }),
      // See handleEndSession for why this snapshot exists.
      ...(isLastWorkoutMovement ? {
        completedWorkoutTotalSteps: workoutMovement.exercises.length,
        completedWorkoutPlanTitle: workoutMovement.planTitle,
      } : {}),
    };
    activeResultId.current = nextResult.clientSessionId;
    setResult(nextResult);
    setResultSaveState(auth.user ? 'saving' : 'idle');

    if (isLastWorkoutMovement) {
      setIsWorkoutComplete(true);
      setActiveWorkout(null);
    }

    routeTo('result');

    if (auth.status === 'signed-in' && auth.user) {
      const revision = accountRevision.current;
      const payload = sessionPayload(nextResult);
      api.saveSession(payload).then((savedSession) => {
        if (accountRevision.current !== revision || activeResultId.current !== nextResult.clientSessionId) return;
        setResult((current) => ({ ...current, id: savedSession.id }));
        setResultSaveState('saved');
        return refreshSessions();
      }).catch((error) => {
        if (accountRevision.current !== revision || activeResultId.current !== nextResult.clientSessionId) return;
        setResultSaveState('error');
        setAuth((current) => ({ ...current, error: 'Session sync paused: ' + error.message }));
      });
    } else if (auth.status === 'guest') {
      const guestSession = { ...nextResult, id: nextResult.clientSessionId, source: 'self-guided' };
      saveGuestSession(guestSession);
      void refreshSessions();
    } else if (auth.status === 'demo') {
      const demoSession = { ...nextResult, id: nextResult.clientSessionId, source: 'sample' };
      setSessions((current) => [demoSession, ...current]);
    }
  }

  function handleSaveResult() {
    if (!result || ['saved', 'saving'].includes(resultSaveState)) return;
    const revision = accountRevision.current;
    const completedResult = { ...result, completedAt: result.completedAt || new Date().toISOString() };

    if (auth.status === 'signed-in' && auth.user) {
      setResult(completedResult);
      setResultSaveState('saving');
      api.saveSession(sessionPayload(completedResult)).then((savedSession) => {
        if (accountRevision.current !== revision || activeResultId.current !== completedResult.clientSessionId) return;
        setResult((current) => ({ ...current, id: savedSession.id }));
        setResultSaveState('saved');
        return refreshSessions();
      }).catch((error) => {
        if (accountRevision.current !== revision || activeResultId.current !== completedResult.clientSessionId) return;
        setResultSaveState('error');
        setAuth((current) => ({ ...current, error: 'Session sync paused: ' + error.message }));
      });
      return;
    }

    if (auth.status === 'demo') {
      const demoSession = { ...completedResult, id: completedResult.clientSessionId, source: 'sample' };
      setSessions((current) => [demoSession, ...current]);
      setResult(demoSession);
      setResultSaveState('saved');
      return;
    }

    if (auth.status !== 'guest') return;
    const guestSession = { ...completedResult, id: completedResult.clientSessionId, source: completedResult.source || 'real' };
    if (!saveGuestSession(guestSession)) {
      setResultSaveState('error');
      return;
    }
    setResult(guestSession);
    setResultSaveState('saved');
    void refreshSessions();
  }

  useEffect(() => {
    if (screen === 'result' && !result && ['signed-in', 'guest', 'demo'].includes(auth.status)) routeTo('dashboard', { replace: true });
  }, [auth.status, result, routeTo, screen]);

  const signedIn = auth.status === 'signed-in' && Boolean(auth.user);
  const demoMode = auth.status === 'demo';
  const appActive = ['signed-in', 'guest', 'demo'].includes(auth.status);
  const hasProfile = profileIsComplete(profile);
  const persistenceMode = signedIn ? 'account' : demoMode ? 'demo' : 'guest';
  const displayName = profile.displayName || auth.user?.name || (demoMode ? 'Judge' : auth.status === 'guest' ? 'Guest' : '');
  const showAppHeader = screen !== 'welcome' && screen !== 'coach' && screen !== 'preview' && screen !== 'self-guided';
  const showShellNavigation = appActive && hasProfile && !['welcome', 'coach', 'preview', 'self-guided'].includes(screen);

  return (
    <div className={'app ' + (['coach', 'preview', 'self-guided'].includes(screen) ? 'app-coach ' : '') + (showShellNavigation ? 'app-with-nav' : '')}>
      {showLaunch && <LaunchScreen />}
      <div inert={showLaunch ? '' : undefined} aria-hidden={showLaunch || undefined}>
      {showAppHeader && <AppHeader screen={screen} showPrimaryNavigation={appActive && hasProfile} onBack={goBack} onHome={goHome} onNavigate={handleNavigate} user={auth.user} status={auth.status} displayName={displayName} onSignOut={handleSignOut} onExitGuest={handleExitGuest} />}

      {screen === 'welcome' && <WelcomeScreen auth={auth} displayName={displayName} hasProfile={hasProfile} onGoogleCredential={handleGoogleCredential} onSignOut={handleSignOut} onExitGuest={handleExitGuest} onContinueGuest={handleContinueGuest} onContinue={() => navigate(hasProfile ? 'dashboard' : 'profile')} onCameraGuided={handleCameraGuided} onJudgeDemo={startJudgeDemo} onProgress={() => navigate('progress')} onLeaderboard={() => navigate('leaderboard')} onNavigate={handleNavigate} />}
      {screen === 'preview' && <Suspense fallback={<main className="screen-page"><p role="status">Loading Camera Coach preview…</p><button className="button button-quiet" onClick={handleCoachBack}>Back</button></main>}><CoachScreen exerciseId={activeExerciseId} previewMode={true} onBack={handleCoachBack} onHome={goHome} onSelectExercise={(id) => setActiveExerciseId(id)} /></Suspense>}
      {screen === 'features' && <FeaturesScreen onNavigate={handleNavigate} onStartCoach={handleStartCoach} appActive={appActive} hasProfile={hasProfile} />}
      {screen === 'how-it-works' && <HowItWorksScreen onNavigate={handleNavigate} onStartCoach={handleStartCoach} appActive={appActive} hasProfile={hasProfile} />}
      {screen === 'terms' && <TermsScreen onNavigate={handleNavigate} appActive={appActive} hasProfile={hasProfile} />}
      {screen === 'privacy' && <PrivacyScreen onNavigate={handleNavigate} appActive={appActive} hasProfile={hasProfile} />}
      {screen === 'health-disclaimer' && <HealthDisclaimerScreen onNavigate={handleNavigate} appActive={appActive} hasProfile={hasProfile} />}
      {screen === 'dashboard' && <DashboardScreen displayName={displayName} profile={profile} plan={plan} planState={planState} sessions={sessions} sessionSummary={sessionSummary} progressState={progressState} onRetryProgress={refreshSessions} onRetryPlan={handleRetryPlan} persistenceMode={persistenceMode} onNavigate={handleNavigate} onStartCoach={handleStartCoach} onStartWorkout={handleStartWorkout} onCreatePlan={handleCreatePlan} />}
      {screen === 'workouts' && <WorkoutLibraryScreen onStartCoach={handleStartCoach} onStartSelfGuided={(id) => handleStartSelfGuided(id, 'workouts')} onNavigate={handleNavigate} />}
      {screen === 'profile' && <ProfileScreen key={auth.status + '-' + (hasProfile ? 'edit' : 'new')} initialProfile={profileDraft || profile} signedIn={signedIn} demoMode={demoMode} accountName={auth.user?.name} hasExistingProfile={hasProfile} onDraftChange={setProfileDraft} onSubmit={handleProfileSubmit} onBack={() => appActive && hasProfile ? navigate('dashboard') : goBack()} />}
      {screen === 'plan' && <PlanScreen profile={profile} plan={plan} sessions={sessions} progressState={progressState} onRetryProgress={refreshSessions} planState={planState} planErrorAction={planErrorAction} onRetryPlan={handleRetryPlan} onStartCoach={handleStartCoach} onStartSelfGuided={handleStartSelfGuided} onStartWorkout={handleStartWorkout} onResumeWorkout={handleContinueWorkout} activeWorkout={activeWorkout} onCreatePlan={handleCreatePlan} onExplore={() => navigate('dashboard')} onBack={() => navigate('dashboard')} />}
      {screen === 'coach' && <Suspense fallback={<main className="screen-page"><p role="status">Loading your camera coach…</p><button className="button button-quiet" onClick={handleCoachBack}>Back</button></main>}><CoachScreen exerciseId={activeExerciseId} activeWorkout={currentWorkoutMovementFor(activeExerciseId)} onBack={handleCoachBack} onHome={goHome} onEndSession={handleEndSession} onSkip={handleSkipMovement} /></Suspense>}
      {screen === 'self-guided' && <SelfGuidedScreen exercise={Object.values(EXERCISES).find((item) => item.id === selfGuidedExerciseId) || EXERCISES.warmup} activeWorkout={currentWorkoutMovementFor(selfGuidedExerciseId)} onComplete={handleEndSelfGuidedSession} onSkip={handleSkipMovement} onBack={handleCoachBack} onHome={goHome} />}
      {screen === 'result' && result && <ResultScreen result={result} profile={profile} saveState={resultSaveState} automaticSave={signedIn} onSave={handleSaveResult} onHome={() => navigate('dashboard')} onProgress={() => navigate('progress')} onRetry={() => handleStartCoach(activeExerciseId, 'result')} activeWorkout={currentWorkoutMovementFor(result.exerciseId)} onContinueWorkout={handleContinueWorkout} onFinishWorkoutEarly={handleFinishWorkoutEarly} isWorkoutComplete={isWorkoutComplete} />}
      {screen === 'progress' && <ProgressScreen sessions={sessions} sessionSummary={sessionSummary} loadState={progressState} persistenceMode={persistenceMode} onRetry={() => refreshSessions()} onHome={() => navigate('dashboard')} onStart={() => navigate('workouts')} />}
      {screen === 'leaderboard' && <LeaderboardScreen user={auth.user} accountSyncAvailable={auth.accountSyncAvailable} onHome={() => appActive ? navigate('dashboard') : routeTo('welcome')} />}

      {auth.error && showShellNavigation && <div className="sync-toast" role="status">{auth.error}</div>}
      {showShellNavigation && <BottomNav screen={screen} onNavigate={handleNavigate} />}
      </div>
    </div>
  );
}
