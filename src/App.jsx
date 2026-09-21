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
import { api } from './services/api';
import { estimateCalories, getExerciseMet } from './utils/calories';
import {
  createJudgeDemoHistory,
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
  location: 'Hostel room',
  equipment: 'None',
  lowImpact: false,
  leaderboardOptIn: false,
  leaderboardName: 'Judge demo',
};

const APP_SCREENS = new Set(['dashboard', 'workouts', 'plan', 'coach', 'progress', 'leaderboard', 'profile']);

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
  return Boolean(
    String(profile?.displayName || '').trim()
    && Number(profile?.age)
    && Number(profile?.height)
    && Number(profile?.weight)
    && profile?.level
    && profile?.goal
    && profile?.time
    && profile?.location
    && profile?.equipment,
  );
}

function requestedScreen() {
  const route = window.location.hash.replace(/^#\/?/, '');
  return APP_SCREENS.has(route) ? route : null;
}

function updateLocation(screen, replace = false) {
  const url = new URL(window.location.href);
  url.hash = screen === 'welcome' ? '' : screen;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
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

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [profile, setProfile] = useState(() => normalizeProfile(null));
  const [plan, setPlan] = useState(null);
  const [planState, setPlanState] = useState('idle');
  const [planErrorAction, setPlanErrorAction] = useState('load');
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [progressState, setProgressState] = useState('idle');
  const [resultSaveState, setResultSaveState] = useState('idle');
  const [activeExerciseId, setActiveExerciseId] = useState('squats');
  const [coachReturnScreen, setCoachReturnScreen] = useState('dashboard');
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

  const routeTo = useCallback((nextScreen, { replace = false } = {}) => {
    setScreen(nextScreen);
    updateLocation(nextScreen, replace);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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
    setSessions([]);
    setProgressState('idle');
    setPlan(null);
    setPlanState('idle');
    setResult(null);
    setResultSaveState('idle');
  }, []);

  const activateGuestMode = useCallback(({ accountSyncAvailable = false, error = '', markActive = true } = {}) => {
    accountRevision.current += 1;
    if (markActive) setGuestModeActive(true);
    const guestProfile = normalizeProfile(loadGuestProfile());
    let guestPlan = loadGuestPlan();
    if (profileIsComplete(guestProfile) && !guestPlan) {
      guestPlan = { ...generateWorkoutPlan(guestProfile), createdAt: new Date().toISOString() };
      saveGuestPlan(guestPlan);
    }
    setAuth({ status: 'guest', user: null, accountSyncAvailable, error });
    setProfile(guestProfile);
    setSessions(loadGuestSessions());
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
    const [sessionsResult, planResult] = await Promise.allSettled([api.sessions(), api.latestPlan()]);
    if (accountRevision.current !== revision) return;

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
        const remoteSessions = await api.sessions();
        if (accountRevision.current === revision) {
          setSessions(remoteSessions);
          setProgressState('ready');
          setAuth((current) => ({ ...current, error: '' }));
        }
        return remoteSessions;
      } catch (error) {
        if (accountRevision.current === revision) {
          setSessions([]);
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
            routeTo(profileIsComplete(guest.profile) ? requestedScreen() || 'dashboard' : 'profile', { replace: true });
          } else {
            activateVisitor({ accountSyncAvailable: false });
            routeTo(requestedScreen() === 'leaderboard' ? 'leaderboard' : 'welcome', { replace: true });
          }
          return;
        }

        if (isGuestModeActive()) {
          const guest = activateGuestMode({ accountSyncAvailable: true });
          routeTo(profileIsComplete(guest.profile) ? requestedScreen() || 'dashboard' : 'profile', { replace: true });
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
          routeTo(profileIsComplete(nextProfile) ? requestedScreen() || 'dashboard' : 'profile', { replace: true });
        } catch (error) {
          if (!active || accountRevision.current !== revision) return;
          if (error.status === 401) {
            if (isGuestModeActive()) {
              const guest = activateGuestMode({ accountSyncAvailable: true });
              routeTo(profileIsComplete(guest.profile) ? requestedScreen() || 'dashboard' : 'profile', { replace: true });
            } else {
              activateVisitor({ accountSyncAvailable: true });
              routeTo(requestedScreen() === 'leaderboard' ? 'leaderboard' : 'welcome', { replace: true });
            }
          } else {
            activateVisitor({ accountSyncAvailable: true, error: 'Account data could not load: ' + error.message });
            routeTo(requestedScreen() === 'leaderboard' ? 'leaderboard' : 'welcome', { replace: true });
          }
        }
      } catch (error) {
        if (!active || accountRevision.current !== revision) return;
        if (isGuestModeActive()) {
          const guest = activateGuestMode({ accountSyncAvailable: false, error: 'Cloud account service is unavailable: ' + error.message });
          routeTo(profileIsComplete(guest.profile) ? requestedScreen() || 'dashboard' : 'profile', { replace: true });
        } else {
          activateVisitor({ accountSyncAvailable: false, error: 'Cloud account service is unavailable: ' + error.message });
          routeTo(requestedScreen() === 'leaderboard' ? 'leaderboard' : 'welcome', { replace: true });
        }
      }
    })();

    return () => { active = false; };
  }, [activateGuestMode, activateVisitor, loadSignedInResources, routeTo]);

  useEffect(() => {
    function handleHistory() {
      const requested = requestedScreen();
      const activeAccount = ['signed-in', 'guest', 'demo'].includes(auth.status);
      if (!activeAccount) {
        setScreen(requested === 'leaderboard' ? 'leaderboard' : 'welcome');
      } else if (!profileIsComplete(profile)) {
        setScreen('profile');
      } else {
        setScreen(requested || 'dashboard');
        if (requested === 'progress') void refreshSessions();
      }
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
    if (!activeAccount) {
      routeTo(nextScreen === 'leaderboard' ? 'leaderboard' : 'welcome');
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
    setProgressState('ready');
    setPlan(generateWorkoutPlan(JUDGE_PROFILE));
    setPlanState('ready');
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
    setSessions([]);
    setProgressState('loading');
    setPlan(null);
    setPlanState('loading');
    setResult(null);
    setAuth((current) => ({ ...current, status: 'signing-in', user: null, error: '' }));

    try {
      const account = await api.signInWithGoogle(credential);
      if (accountRevision.current !== revision) return;
      const nextProfile = normalizeProfile(account.profile, account.user);
      setProfile(nextProfile);
      setAuth({ status: 'signed-in', user: account.user, accountSyncAvailable: true, error: '' });
      await loadSignedInResources(revision);
      if (accountRevision.current === revision) routeTo(profileIsComplete(nextProfile) ? 'dashboard' : 'profile');
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
    setSessions([]);
    setProgressState('idle');
    setPlan(null);
    setPlanState('idle');
    setResult(null);
    setResultSaveState('idle');
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
      setPlan(nextPlan);
      setPlanState('ready');
      routeTo('plan');
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
    setPlan(null);
    setPlanState('loading');
    setPlanErrorAction('generate');
    routeTo('plan');

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
    setActiveExerciseId(exerciseId || 'squats');
    setCoachReturnScreen(APP_SCREENS.has(returnScreen) && returnScreen !== 'coach' ? returnScreen : 'dashboard');
    routeTo('coach');
  }

  function handleNavigate(nextScreen) {
    if (nextScreen === 'coach') {
      handleStartCoach('squats', screen === 'coach' ? 'dashboard' : screen);
      return;
    }
    navigate(nextScreen);
  }

  function handleEndSession(sessionMetrics) {
    const calories = estimateCalories({
      weightKg: profile.weight,
      durationSeconds: sessionMetrics.durationSeconds,
      met: getExerciseMet(sessionMetrics.exerciseId),
    });
    const nextResult = {
      ...sessionMetrics,
      clientSessionId: globalThis.crypto.randomUUID(),
      calories,
      impact: buildWorkoutImpact(sessionMetrics),
    };
    activeResultId.current = nextResult.clientSessionId;
    setResult(nextResult);
    setResultSaveState(auth.user ? 'saving' : 'idle');
    routeTo('result');

    if (auth.status === 'signed-in' && auth.user) {
      const revision = accountRevision.current;
      const payload = sessionPayload({ ...nextResult, completedAt: new Date().toISOString() });
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
    const guestSession = { ...completedResult, id: completedResult.clientSessionId, source: 'real' };
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
  const showShellNavigation = appActive && hasProfile && !['welcome', 'coach'].includes(screen);

  return (
    <div className={'app ' + (screen === 'coach' ? 'app-coach ' : '') + (showShellNavigation ? 'app-with-nav' : '')}>
      {showLaunch && <LaunchScreen onComplete={finishLaunch} />}
      <div inert={showLaunch ? '' : undefined} aria-hidden={showLaunch || undefined}>
      {showShellNavigation && <AppHeader screen={screen} onNavigate={handleNavigate} user={auth.user} status={auth.status} displayName={displayName} onSignOut={handleSignOut} onExitGuest={handleExitGuest} />}

      {screen === 'welcome' && <WelcomeScreen auth={auth} displayName={displayName} onGoogleCredential={handleGoogleCredential} onSignOut={handleSignOut} onExitGuest={handleExitGuest} onContinueGuest={handleContinueGuest} onContinue={() => navigate(hasProfile ? 'dashboard' : 'profile')} onJudgeDemo={startJudgeDemo} onProgress={() => navigate('progress')} onLeaderboard={() => navigate('leaderboard')} onNavigate={handleNavigate} />}
      {screen === 'dashboard' && <DashboardScreen displayName={displayName} profile={profile} plan={plan} planState={planState} sessions={sessions} progressState={progressState} onRetryProgress={refreshSessions} onRetryPlan={handleRetryPlan} persistenceMode={persistenceMode} onNavigate={handleNavigate} onStartCoach={handleStartCoach} onCreatePlan={handleCreatePlan} />}
      {screen === 'workouts' && <WorkoutLibraryScreen onStartCoach={handleStartCoach} onNavigate={handleNavigate} />}
      {screen === 'profile' && <ProfileScreen key={auth.status + '-' + (hasProfile ? 'edit' : 'new')} initialProfile={profile} signedIn={signedIn} demoMode={demoMode} accountName={auth.user?.name} hasExistingProfile={hasProfile} onSubmit={handleProfileSubmit} onBack={() => appActive && hasProfile ? navigate('dashboard') : routeTo('welcome')} />}
      {screen === 'plan' && <PlanScreen profile={profile} plan={plan} sessions={sessions} progressState={progressState} onRetryProgress={refreshSessions} planState={planState} planErrorAction={planErrorAction} onRetryPlan={handleRetryPlan} onStartCoach={handleStartCoach} onCreatePlan={handleCreatePlan} onExplore={() => navigate('dashboard')} onBack={() => navigate('dashboard')} />}
      {screen === 'coach' && <Suspense fallback={<main className="screen-page"><p role="status">Loading your camera coach…</p><button className="button button-quiet" onClick={() => navigate(coachReturnScreen)}>Back to dashboard</button></main>}><CoachScreen exerciseId={activeExerciseId} onBack={() => navigate(coachReturnScreen)} onEndSession={handleEndSession} /></Suspense>}
      {screen === 'result' && result && <ResultScreen result={result} profile={profile} saveState={resultSaveState} automaticSave={signedIn} onSave={handleSaveResult} onHome={() => navigate('dashboard')} onProgress={() => navigate('progress')} onRetry={() => handleStartCoach(activeExerciseId, 'result')} />}
      {screen === 'progress' && <ProgressScreen sessions={sessions} loadState={progressState} persistenceMode={persistenceMode} onRetry={() => refreshSessions()} onHome={() => navigate('dashboard')} onStart={() => navigate('workouts')} />}
      {screen === 'leaderboard' && <LeaderboardScreen user={auth.user} accountSyncAvailable={auth.accountSyncAvailable} onHome={() => appActive ? navigate('dashboard') : routeTo('welcome')} />}

      {auth.error && showShellNavigation && <div className="sync-toast" role="status">{auth.error}</div>}
      {showShellNavigation && <BottomNav screen={screen} onNavigate={handleNavigate} />}
      </div>
    </div>
  );
}
