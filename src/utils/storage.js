const PROFILE_KEY = 'bits-motion-profile-v1';
const SESSION_KEY = 'bits-motion-sessions-v1';
const PLAN_KEY = 'bits-motion-plan-v1';
const GUEST_ACTIVE_KEY = 'bits-motion-guest-active-v1';
const invalidKeys = new Set();
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function guestStorageWarning() {
  return invalidKeys.size ? 'Some saved Guest data could not be read. Valid records were kept; review your profile and plan. Browser storage was not deleted.' : '';
}

function readJson(key, fallback) {
  invalidKeys.delete(key);
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    invalidKeys.add(key);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadGuestProfile() {
  const profile = readJson(PROFILE_KEY, null);
  if (profile === null) return null;
  if (!isObject(profile) || Object.values(profile).some((value) => value !== null && typeof value === 'object')) {
    invalidKeys.add(PROFILE_KEY);
    return null;
  }
  return profile;
}

export function saveGuestProfile(profile) {
  return writeJson(PROFILE_KEY, profile);
}

export function loadGuestPlan() {
  const plan = readJson(PLAN_KEY, null);
  if (plan === null) return null;
  if (!isObject(plan) || typeof plan.title !== 'string' || typeof plan.focus !== 'string'
    || !Number.isFinite(Number(plan.totalMinutes)) || !Array.isArray(plan.reasons) || plan.reasons.some((reason) => typeof reason !== 'string')
    || !Array.isArray(plan.exercises) || !plan.exercises.length
    || plan.exercises.some((item) => !isObject(item) || ['id', 'name', 'duration', 'category', 'instruction'].some((key) => typeof item[key] !== 'string'))) {
    invalidKeys.add(PLAN_KEY);
    return null;
  }
  return plan;
}

export function saveGuestPlan(plan) {
  return writeJson(PLAN_KEY, plan);
}

export function isGuestModeActive() {
  try {
    return localStorage.getItem(GUEST_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setGuestModeActive(active) {
  try {
    if (active) localStorage.setItem(GUEST_ACTIVE_KEY, '1');
    else localStorage.removeItem(GUEST_ACTIVE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadGuestSessions() {
  const stored = readJson(SESSION_KEY, []);
  if (!Array.isArray(stored)) {
    invalidKeys.add(SESSION_KEY);
    return [];
  }
  const sessions = stored.filter((session) => isObject(session)
    && typeof session.id === 'string' && typeof session.completedAt === 'string'
    && Number.isFinite(Date.parse(session.completedAt))
    && ['reps', 'durationSeconds', 'calories'].every((field) => session[field] === undefined || Number.isFinite(Number(session[field])) && Number(session[field]) >= 0)
    && ['exerciseId', 'exerciseName', 'formSummary', 'source'].every((field) => session[field] === undefined || typeof session[field] === 'string'));
  if (sessions.length !== stored.length) invalidKeys.add(SESSION_KEY);
  return sessions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

export function saveGuestSession(session) {
  const sessions = loadGuestSessions();
  // Avoid overwriting malformed historical data; let the user recover it first.
  if (invalidKeys.has(SESSION_KEY)) return false;
  return writeJson(SESSION_KEY, [session, ...sessions.filter((item) => item.id !== session.id)]);
}

function toLocalIsoDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(18, 30, 0, 0);
  return date.toISOString();
}

export function createJudgeDemoHistory() {
  return [
    {
      id: 'sample-1',
      completedAt: toLocalIsoDate(1),
      reps: 12,
      exerciseId: 'squats',
      exerciseName: 'Squat',
      durationSeconds: 510,
      calories: 54.5,
      formSummary: 'Good depth reached on most tracked repetitions.',
      source: 'sample',
    },
    {
      id: 'sample-2',
      completedAt: toLocalIsoDate(3),
      reps: 10,
      exerciseId: 'jumping-jacks',
      exerciseName: 'Jumping-jack',
      durationSeconds: 430,
      calories: 46,
      formSummary: 'A steady session with one framing reminder.',
      source: 'sample',
    },
    {
      id: 'sample-3',
      completedAt: toLocalIsoDate(4),
      reps: 8,
      exerciseId: 'pushups',
      exerciseName: 'Push-up',
      durationSeconds: 390,
      calories: 41.7,
      formSummary: 'Completed at a controlled pace.',
      source: 'sample',
    },
  ];
}

export function getProgressSummary(sessions) {
  const totals = sessions.reduce(
    (accumulator, session) => ({
      workouts: accumulator.workouts + 1,
      reps: accumulator.reps + (Number(session.reps) || 0),
    }),
    { workouts: 0, reps: 0 },
  );

  const dayKeys = new Set(sessions.map((session) => new Date(session.completedAt).toDateString()));
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const weeklyActiveDays = new Set(
    sessions
      .filter((session) => new Date(session.completedAt) >= weekAgo)
      .map((session) => new Date(session.completedAt).toDateString()),
  ).size;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!dayKeys.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dayKeys.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { ...totals, weeklyActiveDays, streak };
}
