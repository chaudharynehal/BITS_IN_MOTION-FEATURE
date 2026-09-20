import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import CoachScreen from './screens/CoachScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import PlanScreen from './screens/PlanScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProgressScreen from './screens/ProgressScreen';
import ResultScreen from './screens/ResultScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { api } from './services/api';
import { estimateCalories, getExerciseMet } from './utils/calories';
import {
  loadGuestProfile,
  loadGuestSessions,
  saveGuestProfile,
  saveGuestSession,
  createJudgeDemoHistory,
} from './utils/storage';
import { buildWorkoutImpact } from './utils/workoutImpact';
import { generateWorkoutPlan } from './utils/workoutRecommendation';

const EMPTY_PROFILE = {
  age: '', height: '', weight: '', level: '', goal: '', time: '', location: '', equipment: '',
  lowImpact: false, leaderboardOptIn: false, leaderboardName: '',
};

const JUDGE_PROFILE = {
  age: '20', height: '175', weight: '70', level: 'Beginner', goal: 'Stay fit', time: '20',
  location: 'Hostel room', equipment: 'None', lowImpact: false,
  leaderboardOptIn: false, leaderboardName: 'Judge demo',
};

function normalizeProfile(profile, user) {
  return {
    ...EMPTY_PROFILE,
    ...(profile || {}),
    leaderboardOptIn: user?.leaderboardOptIn ?? profile?.leaderboardOptIn ?? false,
    leaderboardName: user?.leaderboardName || profile?.leaderboardName || user?.name || '',
  };
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
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [progressState, setProgressState] = useState('idle');
  const [resultSaveState, setResultSaveState] = useState('idle');
  const [activeExerciseId, setActiveExerciseId] = useState('squats');
  const [auth, setAuth] = useState({ status: 'checking', user: null, accountSyncAvailable: false, error: '' });
  const accountRevision = useRef(0);

  const activateGuestMode = useCallback(({ accountSyncAvailable = false, error = '' } = {}) => {
    accountRevision.current += 1;
    setAuth({ status: 'guest', user: null, accountSyncAvailable, error });
    setProfile(normalizeProfile(loadGuestProfile()));
    setSessions(loadGuestSessions());
    setProgressState('ready');
    setPlan(null);
    setResult(null);
    setResultSaveState('idle');
  }, []);

  const loadSignedInResources = useCallback(async (revision) => {
    setProgressState('loading');
    const [sessionsResult, planResult] = await Promise.allSettled([api.sessions(), api.latestPlan()]);
    if (accountRevision.current !== revision) return;

    const errors = [];
    if (sessionsResult.status === 'fulfilled') {
      setSessions(sessionsResult.value);
      setProgressState('ready');
    } else {
      setSessions([]);
      setProgressState('error');
      errors.push(`Progress could not sync: ${sessionsResult.reason.message}`);
    }
    if (planResult.status === 'fulfilled') setPlan(planResult.value);
    else {
      setPlan(null);
      errors.push(`Saved plan could not sync: ${planResult.reason.message}`);
    }
    if (errors.length) setAuth((current) => ({ ...current, error: errors.join(' ') }));
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
        }
        return remoteSessions;
      } catch (error) {
        if (accountRevision.current === revision) {
          setSessions([]);
          setProgressState('error');
          setAuth((current) => ({ ...current, error: `Progress could not sync: ${error.message}` }));
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
    setProgressState('error');
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
          activateGuestMode({ accountSyncAvailable: false });
          return;
        }

        try {
          const account = await api.me();
          if (!active || accountRevision.current !== revision) return;
          const signedInRevision = accountRevision.current;
          setProfile(normalizeProfile(account.profile, account.user));
          setAuth({ status: 'signed-in', user: account.user, accountSyncAvailable: true, error: '' });
          await loadSignedInResources(signedInRevision);
        } catch (error) {
          if (!active || accountRevision.current !== revision) return;
          if (error.status === 401) activateGuestMode({ accountSyncAvailable: true });
          else {
            setProfile(normalizeProfile(null));
            setSessions([]);
            setProgressState('error');
            setAuth({ status: 'error', user: null, accountSyncAvailable: true, error: `Account data could not load: ${error.message}` });
          }
        }
      } catch (error) {
        if (!active || accountRevision.current !== revision) return;
        setProfile(normalizeProfile(null));
        setSessions([]);
        setProgressState('error');
        setAuth({ status: 'error', user: null, accountSyncAvailable: false, error: `Cloud account service is unavailable: ${error.message}` });
      }
    })();
    return () => { active = false; };
  }, [activateGuestMode, loadSignedInResources]);

  const navigate = useCallback((nextScreen) => {
    if (nextScreen === 'progress') void refreshSessions();
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [refreshSessions]);

  const handleContinueGuest = useCallback(() => {
    activateGuestMode({ accountSyncAvailable: auth.accountSyncAvailable });
    setScreen('profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activateGuestMode, auth.accountSyncAvailable]);

  const startJudgeDemo = useCallback(() => {
    if (auth.user) {
      setAuth((current) => ({ ...current, error: 'Sign out before starting the isolated Judge Demo.' }));
      return false;
    }
    accountRevision.current += 1;
    setAuth((current) => ({ status: 'demo', user: null, accountSyncAvailable: current.accountSyncAvailable, error: '' }));
    setProfile(JUDGE_PROFILE);
    setSessions(createJudgeDemoHistory());
    setProgressState('ready');
    setPlan(null);
    setScreen('profile');
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }, [auth.user]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return undefined;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_judge_demo', title: 'Start judge demo',
      description: 'Preload the isolated BITS in Motion judge profile and open the profile step.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        return startJudgeDemo()
          ? { screen: 'profile', profile: JUDGE_PROFILE, storage: 'temporary-memory' }
          : { error: 'Sign out before starting Judge Demo.' };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, [startJudgeDemo]);

  async function handleGoogleCredential(credential) {
    const revision = accountRevision.current + 1;
    accountRevision.current = revision;
    setProfile(normalizeProfile(null));
    setSessions([]);
    setProgressState('loading');
    setPlan(null);
    setResult(null);
    setAuth((current) => ({ ...current, status: 'signing-in', user: null, error: '' }));
    try {
      const account = await api.signInWithGoogle(credential);
      if (accountRevision.current !== revision) return;
      setProfile(normalizeProfile(account.profile, account.user));
      setAuth({ status: 'signed-in', user: account.user, accountSyncAvailable: true, error: '' });
      await loadSignedInResources(revision);
      if (accountRevision.current === revision) navigate(account.profile ? 'welcome' : 'profile');
    } catch (error) {
      if (accountRevision.current !== revision) return;
      setProfile(normalizeProfile(null));
      setSessions([]);
      setProgressState('error');
      setAuth((current) => ({ ...current, status: 'error', user: null, error: error.message }));
    }
  }

  async function handleSignOut() {
    const revision = accountRevision.current + 1;
    accountRevision.current = revision;
    globalThis.google?.accounts?.id?.disableAutoSelect?.();
    const guestProfile = normalizeProfile(loadGuestProfile());
    const guestSessions = loadGuestSessions();
    setAuth((current) => ({ status: 'signing-out', user: null, accountSyncAvailable: current.accountSyncAvailable, error: '' }));
    setProfile(guestProfile);
    setSessions(guestSessions);
    setProgressState('ready');
    setPlan(null);
    setResult(null);
    setResultSaveState('idle');
    setScreen('welcome');
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      await api.signOut();
      if (accountRevision.current === revision) {
        setAuth((current) => ({ ...current, status: 'guest', user: null, error: '' }));
      }
    } catch (error) {
      if (accountRevision.current === revision) {
        setAuth((current) => ({ ...current, status: 'error', user: null, error: `Sign-out could not reach the server: ${error.message}` }));
      }
    }
  }

  async function handleProfileSubmit(nextProfile) {
    const normalized = normalizeProfile(nextProfile, auth.user);
    setProfile(normalized);
    setPlan(generateWorkoutPlan(normalized));
    navigate('plan');
    if (auth.status === 'guest') {
      saveGuestProfile(normalized);
      return;
    }
    if (auth.status !== 'signed-in' || !auth.user) return;

    try {
      const saved = await api.saveProfile(normalized);
      if (saved.user) setAuth((current) => ({ ...current, user: saved.user, error: '' }));
      setProfile(normalizeProfile(saved.profile, saved.user));
      setPlan(await api.generatePlan());
    } catch (error) {
      setAuth((current) => ({ ...current, error: `Account sync paused: ${error.message}` }));
    }
  }

  function handleStartCoach(exerciseId) {
    setActiveExerciseId(exerciseId || 'squats');
    navigate('coach');
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
    setResult(nextResult);
    setResultSaveState(auth.user ? 'saving' : 'idle');
    navigate('result');
    if (auth.status === 'signed-in' && auth.user) {
      const payload = sessionPayload({ ...nextResult, completedAt: new Date().toISOString() });
      api.saveSession(payload).then((savedSession) => {
        setResult((current) => ({ ...current, id: savedSession.id }));
        setResultSaveState('saved');
        return refreshSessions();
      }).catch((error) => {
        setResultSaveState('error');
        setAuth((current) => ({ ...current, error: `Session sync paused: ${error.message}` }));
      });
    }
  }

  function handleSaveResult() {
    if (!result || resultSaveState === 'saved') return;
    const completedResult = { ...result, completedAt: result.completedAt || new Date().toISOString() };
    if (auth.status === 'signed-in' && auth.user) {
      setResult(completedResult);
      setResultSaveState('saving');
      api.saveSession(sessionPayload(completedResult)).then((savedSession) => {
        setResult((current) => ({ ...current, id: savedSession.id }));
        setResultSaveState('saved');
        return refreshSessions();
      }).catch((error) => {
        setResultSaveState('error');
        setAuth((current) => ({ ...current, error: `Session sync paused: ${error.message}` }));
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
    saveGuestSession(guestSession);
    setResult(guestSession);
    setResultSaveState('saved');
    void refreshSessions();
  }

  const currentPlan = useMemo(() => plan || generateWorkoutPlan(profile), [plan, profile]);
  const showShellNavigation = !['welcome', 'coach'].includes(screen);
  const signedIn = auth.status === 'signed-in' && Boolean(auth.user);
  const demoMode = auth.status === 'demo';

  return (
    <div className={`app ${screen === 'coach' ? 'app-coach' : ''}`}>
      {showShellNavigation && <AppHeader screen={screen} onNavigate={navigate} user={auth.user} onSignOut={handleSignOut} />}
      {screen === 'welcome' && <WelcomeScreen auth={auth} onGoogleCredential={handleGoogleCredential} onSignOut={handleSignOut} onContinueGuest={handleContinueGuest} onStart={signedIn || demoMode ? () => navigate(plan ? 'plan' : 'profile') : handleContinueGuest} onJudgeDemo={startJudgeDemo} onProgress={() => navigate('progress')} onLeaderboard={() => navigate('leaderboard')} />}
      {screen === 'profile' && <ProfileScreen initialProfile={profile} signedIn={signedIn} demoMode={demoMode} accountName={auth.user?.name} onSubmit={handleProfileSubmit} onBack={() => navigate('welcome')} />}
      {screen === 'plan' && <PlanScreen profile={profile} plan={currentPlan} onStartCoach={handleStartCoach} onBack={() => navigate('profile')} />}
      {screen === 'coach' && <CoachScreen exerciseId={activeExerciseId} onBack={() => navigate('plan')} onEndSession={handleEndSession} />}
      {screen === 'result' && result && <ResultScreen result={result} profile={profile} saveState={resultSaveState} automaticSave={signedIn} onSave={handleSaveResult} onHome={() => navigate('welcome')} onProgress={() => navigate('progress')} onRetry={() => navigate('coach')} />}
      {screen === 'progress' && <ProgressScreen sessions={sessions} loadState={progressState} persistenceMode={signedIn ? 'account' : demoMode ? 'demo' : 'guest'} onRetry={() => refreshSessions()} onHome={() => navigate('welcome')} onStart={signedIn || demoMode ? () => navigate(plan ? 'plan' : 'profile') : handleContinueGuest} />}
      {screen === 'leaderboard' && <LeaderboardScreen user={auth.user} accountSyncAvailable={auth.accountSyncAvailable} onHome={() => navigate('welcome')} />}
      {auth.error && showShellNavigation && <div className="sync-toast" role="status">{auth.error}</div>}
      {showShellNavigation && <BottomNav screen={screen} onNavigate={navigate} />}
    </div>
  );
}
