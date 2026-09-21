import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  databaseConfigured: true,
  failProfileSave: false,
  users: [],
  profiles: new Map(),
  plans: [],
  planItems: [],
  exercises: [],
  sessions: [],
  exerciseResults: new Map(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }) {
      const identity = idToken.includes('account-b') ? 'b' : 'a';
      return {
        getPayload: () => ({
          sub: `google-sub-${identity}`,
          email: `${identity}@example.com`,
          email_verified: true,
          name: `Account ${identity.toUpperCase()}`,
          picture: `https://example.com/${identity}.png`,
        }),
      };
    }
  },
}));

vi.mock('./db.js', () => ({
  isDatabaseConfigured: () => state.databaseConfigured,
  query: vi.fn(async (sql, params = []) => {
    const statement = sql.replace(/\s+/g, ' ').trim();

    if (statement.startsWith('INSERT INTO users')) {
      let user = state.users.find((candidate) => candidate.google_sub === params[0]);
      if (!user) {
        const sequence = String(state.users.length + 1).padStart(12, '0');
        user = {
          id: `00000000-0000-4000-8000-${sequence}`,
          google_sub: params[0],
          email: params[1],
          display_name: params[2],
          avatar_url: params[3],
          leaderboard_opt_in: false,
          leaderboard_name: null,
        };
        state.users.push(user);
      } else {
        user.email = params[1];
        user.avatar_url = params[3];
      }
      return [user];
    }
    if (statement.startsWith('SELECT * FROM users WHERE id')) return state.users.filter((user) => user.id === params[0]);
    if (statement.startsWith('SELECT * FROM profiles WHERE user_id')) {
      const profile = state.profiles.get(params[0]);
      return profile ? [profile] : [];
    }
    if (statement.startsWith('WITH saved_profile AS')) {
      if (state.failProfileSave) throw new Error('Simulated database failure');
      const profile = {
        user_id: params[0],
        age: params[1],
        height_cm: params[2],
        weight_kg: params[3],
        fitness_level: params[4],
        goal: params[5],
        available_minutes: params[6],
        location: params[7],
        equipment: params[8],
        low_impact: params[9],
      };
      state.profiles.set(params[0], profile);
      const account = state.users.find((candidate) => candidate.id === params[0]);
      account.display_name = params[10];
      account.leaderboard_opt_in = params[11];
      account.leaderboard_name = params[12];
      return [{ profile, account }];
    }
    if (statement.startsWith('SELECT id,title,focus,total_minutes') && statement.includes('WHERE user_id=$1')) {
      return state.plans.filter((plan) => plan.user_id === params[0])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 1);
    }
    if (statement.startsWith('SELECT * FROM exercises WHERE active=TRUE')) {
      return state.exercises.filter((exercise) => exercise.active).sort((a, b) => a.id.localeCompare(b.id));
    }
    if (statement.startsWith('WITH inserted_plan AS')) {
      const plan = {
        id: params[0],
        user_id: params[1],
        title: params[2],
        focus: params[3],
        total_minutes: params[4],
        reasons: JSON.parse(params[5]),
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, state.plans.length)).toISOString(),
      };
      state.plans.push(plan);
      state.planItems.push(...params[6].map((exerciseId, index) => ({
        plan_id: plan.id,
        exercise_id: exerciseId,
        position: params[7][index],
        target_label: params[8][index],
      })));
      return [{ id: plan.id, created_at: plan.created_at }];
    }
    if (statement.includes('FROM plan_items pi') && statement.includes('WHERE pi.plan_id=$1 AND wp.user_id=$2')) {
      const plan = state.plans.find((candidate) => candidate.id === params[0] && candidate.user_id === params[1]);
      if (!plan) return [];
      return state.planItems.filter((item) => item.plan_id === plan.id)
        .sort((a, b) => a.position - b.position).map((item) => {
          const exercise = state.exercises.find((candidate) => candidate.id === item.exercise_id);
          return {
            ...item,
            exercise_name: exercise.name,
            exercise_category: exercise.category,
            exercise_instruction: exercise.instruction,
            exercise_icon: exercise.icon,
            camera_supported: exercise.camera_supported,
            detection_type: exercise.detection_type,
            met: exercise.met,
            primary_muscles: exercise.primary_muscles,
            secondary_muscles: exercise.secondary_muscles,
          };
        });
    }
    if (statement.includes('FROM sessions s') && statement.includes('WHERE s.user_id=$1')) {
      return state.sessions.filter((session) => session.user_id === params[0]).map((session) => ({
        ...session,
        ...(state.exerciseResults.get(session.id) || {}),
        exercise_name: 'Bodyweight squats',
      }));
    }
    if (statement.startsWith('SELECT id FROM exercises')) return params[0] === 'squats' ? [{ id: 'squats' }] : [];
    if (statement.startsWith('WITH upserted_session AS')) {
      let session = state.sessions.find((candidate) => candidate.user_id === params[0] && candidate.client_session_id === params[1]);
      if (!session) {
        const sequence = String(state.sessions.length + 1).padStart(12, '0');
        session = {
          id: `10000000-0000-4000-8000-${sequence}`,
          user_id: params[0],
          client_session_id: params[1],
          started_at: params[2],
          completed_at: params[3],
          duration_seconds: params[4],
          estimated_calories: params[5],
          source: 'real',
          form_summary: params[6],
        };
        state.sessions.push(session);
      }
      const result = {
        exercise_id: params[7],
        reps: params[8],
        framing_interruptions: params[9],
        cue_counts: JSON.parse(params[10]),
        movement_metrics: JSON.parse(params[11]),
      };
      state.exerciseResults.set(session.id, result);
      return [{ ...session, ...result, exercise_name: 'Bodyweight squats' }];
    }
    throw new Error(`Unhandled test query: ${statement}`);
  }),
}));

import { handleApiRequest } from './handler.js';
import { EXERCISE_SEED } from './schema.js';

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end(value = '') { this.body = value; },
  };
}

async function callApi(action, { method = 'GET', body, cookie, includeMarker = true, origin = 'http://localhost:5173' } = {}) {
  const headers = { host: 'localhost:5173', origin };
  if (cookie) headers.cookie = cookie;
  if (includeMarker && method !== 'GET') headers['x-bits-motion-request'] = '1';
  const req = { method, url: `/api?action=${action}`, headers, body };
  const res = createResponse();
  await handleApiRequest(req, res);
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null, cookie: res.getHeader('set-cookie') };
}

function cookieValue(setCookie) {
  return setCookie.split(';')[0];
}

async function login(identity) {
  return callApi('auth-google', { method: 'POST', body: { credential: `verified-google-token-${identity}` } });
}

function profileFor(name) {
  return {
    age: 25,
    height_cm: 175,
    weight_kg: 70,
    fitness_level: 'Beginner',
    goal: 'Stay fit',
    available_minutes: 20,
    location: 'Home',
    equipment: 'None',
    low_impact: false,
    marker: name,
  };
}

function profileInput(overrides = {}) {
  return {
    displayName: 'Preferred A',
    age: '25',
    height: '175',
    weight: '70',
    level: 'Beginner',
    goal: 'Stay fit',
    time: '20',
    location: 'Home',
    equipment: 'None',
    lowImpact: false,
    leaderboardOptIn: false,
    leaderboardName: '',
    ...overrides,
  };
}

beforeEach(() => {
  state.databaseConfigured = true;
  state.failProfileSave = false;
  state.users.length = 0;
  state.profiles.clear();
  state.plans.length = 0;
  state.planItems.length = 0;
  state.exercises = EXERCISE_SEED.map((exercise) => ({
    id: exercise[0], name: exercise[1], category: exercise[2], duration_label: exercise[3],
    instruction: exercise[4], icon: exercise[5], camera_supported: exercise[6],
    detection_type: exercise[7], met: exercise[8], primary_muscles: exercise[9],
    secondary_muscles: exercise[10], active: true,
  }));
  state.sessions.length = 0;
  state.exerciseResults.clear();
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  process.env.SESSION_SECRET = 'test-session-secret-that-is-longer-than-thirty-two-characters';
});

afterEach(() => vi.restoreAllMocks());

describe('Google account persistence and ownership', () => {
  it('creates a user once and reuses the same internal account on returning login', async () => {
    const first = await login('account-a');
    const second = await login('account-a');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.users).toHaveLength(1);
    expect(state.users[0].google_sub).toBe('google-sub-a');
  });

  it('persists a chosen preferred name and does not overwrite it on returning Google login', async () => {
    const first = await login('account-a');
    const saved = await callApi('profile', {
      method: 'PUT',
      cookie: cookieValue(first.cookie),
      body: {
        displayName: 'Preferred A',
        age: '25',
        height: '175',
        weight: '70',
        level: 'Beginner',
        goal: 'Stay fit',
        time: '20',
        location: 'Home',
        equipment: 'None',
        lowImpact: false,
        leaderboardOptIn: false,
        leaderboardName: '',
      },
    });
    const returning = await login('account-a');

    expect(saved.status).toBe(200);
    expect(saved.body.profile.displayName).toBe('Preferred A');
    expect(saved.body.user.name).toBe('Preferred A');
    expect(returning.body.user.name).toBe('Preferred A');
    expect(returning.body.profile.displayName).toBe('Preferred A');
  });

  it.each(['', '   ', null, 123, {}, 'x'.repeat(81)])('rejects invalid preferred name %j without changing the profile', async (displayName) => {
    const account = await login('account-a');
    const response = await callApi('profile', {
      method: 'PUT', cookie: cookieValue(account.cookie), body: profileInput({ displayName }),
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_REQUEST');
    expect(state.profiles.size).toBe(0);
    expect(state.users[0].display_name).toBe('Account A');
  });

  it('updates only the authenticated profile and preferred name despite browser-provided ownership', async () => {
    const accountA = await login('account-a');
    await login('account-b');
    const [userA, userB] = state.users;
    state.profiles.set(userB.id, profileFor('B'));

    const saved = await callApi('profile&userId=' + userB.id, {
      method: 'PUT',
      cookie: cookieValue(accountA.cookie),
      body: profileInput({ displayName: '  My chosen name  ', userId: userB.id, user_id: userB.id }),
    });

    expect(saved.status).toBe(200);
    expect(saved.body.profile.displayName).toBe('My chosen name');
    expect(state.profiles.get(userA.id).weight_kg).toBe(70);
    expect(userA.display_name).toBe('My chosen name');
    expect(userB.display_name).toBe('Account B');
    expect(state.profiles.get(userB.id).marker).toBe('B');
    expect(state.profiles.size).toBe(2);
  });

  it('returns a safe JSON error when an asynchronous profile save fails', async () => {
    const account = await login('account-a');
    state.failProfileSave = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await callApi('profile', {
      method: 'PUT', cookie: cookieValue(account.cookie), body: profileInput(),
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'The server could not complete this request.', code: 'SERVER_ERROR' });
    expect(state.profiles.size).toBe(0);
    expect(state.users[0].display_name).toBe('Account A');
  });

  it('creates independent users for different verified Google subjects', async () => {
    await login('account-a');
    await login('account-b');

    expect(state.users).toHaveLength(2);
    expect(new Set(state.users.map((user) => user.id)).size).toBe(2);
  });

  it('uses the signed cookie for profile and session queries even when the browser supplies another userId', async () => {
    const accountA = await login('account-a');
    const accountB = await login('account-b');
    const [userA, userB] = state.users;
    state.profiles.set(userA.id, profileFor('A'));
    state.profiles.set(userB.id, { ...profileFor('B'), weight_kg: 90 });
    state.sessions.push(
      { id: 'session-a', user_id: userA.id, completed_at: '2026-01-01T00:00:00.000Z', duration_seconds: 60, estimated_calories: 5, source: 'real', form_summary: 'A' },
      { id: 'session-b', user_id: userB.id, completed_at: '2026-01-02T00:00:00.000Z', duration_seconds: 90, estimated_calories: 7, source: 'real', form_summary: 'B' },
    );
    state.exerciseResults.set('session-a', { exercise_id: 'squats', reps: 3, framing_interruptions: 0, cue_counts: {}, movement_metrics: {} });
    state.exerciseResults.set('session-b', { exercise_id: 'squats', reps: 9, framing_interruptions: 0, cue_counts: {}, movement_metrics: {} });

    const profile = await callApi('profile&userId=' + userB.id, { cookie: cookieValue(accountA.cookie) });
    const sessions = await callApi('sessions&userId=' + userB.id, { cookie: cookieValue(accountA.cookie) });
    const created = await callApi('sessions', {
      method: 'POST',
      cookie: cookieValue(accountA.cookie),
      body: {
        userId: userB.id,
        clientSessionId: '20000000-0000-4000-8000-000000000001',
        exerciseId: 'squats',
        completedAt: '2026-01-03T00:00:00.000Z',
        durationSeconds: 120,
        calories: 10,
        reps: 4,
        cueCounts: {},
        movementMetrics: {},
      },
    });

    expect(profile.body.weight).toBe('70');
    expect(sessions.body).toHaveLength(1);
    expect(sessions.body[0].reps).toBe(3);
    expect(created.status).toBe(201);
    expect(state.sessions.at(-1).user_id).toBe(userA.id);
    expect(state.sessions.at(-1).user_id).not.toBe(userB.id);
    expect(accountB.status).toBe(200);
  });

  it('makes session retries idempotent for the same signed-in user', async () => {
    const accountA = await login('account-a');
    const request = {
      method: 'POST',
      cookie: cookieValue(accountA.cookie),
      body: {
        clientSessionId: '20000000-0000-4000-8000-000000000002',
        exerciseId: 'squats',
        completedAt: '2026-01-03T00:00:00.000Z',
        durationSeconds: 120,
        calories: 10,
        reps: 4,
        cueCounts: {},
        movementMetrics: {},
      },
    };
    await callApi('sessions', request);
    await callApi('sessions', request);

    expect(state.sessions).toHaveLength(1);
  });

  it('restores the correct records across Account A, Account B, and returning Account A', async () => {
    const firstA = await login('account-a');
    const userA = state.users[0];
    state.profiles.set(userA.id, profileFor('A'));
    state.sessions.push({ id: 'switch-a', user_id: userA.id, completed_at: '2026-02-01T00:00:00.000Z', duration_seconds: 60, estimated_calories: 5, source: 'real', form_summary: 'A only' });
    state.exerciseResults.set('switch-a', { exercise_id: 'squats', reps: 5, framing_interruptions: 0, cue_counts: {}, movement_metrics: {} });

    const logoutA = await callApi('logout', { method: 'POST', cookie: cookieValue(firstA.cookie) });
    const accountB = await login('account-b');
    const userB = state.users[1];
    const bProfileBefore = await callApi('profile', { cookie: cookieValue(accountB.cookie) });
    const bSessionsBefore = await callApi('sessions', { cookie: cookieValue(accountB.cookie) });
    state.profiles.set(userB.id, { ...profileFor('B'), weight_kg: 88 });
    state.sessions.push({ id: 'switch-b', user_id: userB.id, completed_at: '2026-02-02T00:00:00.000Z', duration_seconds: 90, estimated_calories: 8, source: 'real', form_summary: 'B only' });
    state.exerciseResults.set('switch-b', { exercise_id: 'squats', reps: 8, framing_interruptions: 0, cue_counts: {}, movement_metrics: {} });

    const returningA = await login('account-a');
    const aProfileAgain = await callApi('profile', { cookie: cookieValue(returningA.cookie) });
    const aSessionsAgain = await callApi('sessions', { cookie: cookieValue(returningA.cookie) });

    expect(logoutA.cookie).toContain('Max-Age=0');
    expect(bProfileBefore.body).toBeNull();
    expect(bSessionsBefore.body).toEqual([]);
    expect(aProfileAgain.body.weight).toBe('70');
    expect(aSessionsAgain.body).toHaveLength(1);
    expect(aSessionsAgain.body[0].formSummary).toBe('A only');
    expect(state.users).toHaveLength(2);
  });
});

describe('Saved plans and ownership', () => {
  it('requires authentication to read or generate a private plan', async () => {
    const read = await callApi('plan');
    const create = await callApi('plan', { method: 'POST' });

    expect(read.status).toBe(401);
    expect(create.status).toBe(401);
    expect(state.plans).toEqual([]);
    expect(state.planItems).toEqual([]);
    expect(state.sessions).toEqual([]);
  });

  it('returns an empty plan for a new account and requires a saved profile before generation', async () => {
    const account = await login('account-a');
    const cookie = cookieValue(account.cookie);
    const read = await callApi('plan', { cookie });
    const create = await callApi('plan', { method: 'POST', cookie });

    expect(read.status).toBe(200);
    expect(read.body).toBeNull();
    expect(create.status).toBe(400);
    expect(create.body.error).toBe('Complete your profile first.');
    expect(state.plans).toEqual([]);
    expect(state.planItems).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.exerciseResults.size).toBe(0);
  });

  it('persists plan items in order, restores the same latest plan and never creates workouts by planning', async () => {
    const account = await login('account-a');
    const cookie = cookieValue(account.cookie);
    await callApi('profile', { method: 'PUT', cookie, body: profileInput() });

    const created = await callApi('plan', { method: 'POST', cookie });
    expect(created.status).toBe(200);
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.body.exercises.map((exercise) => exercise.id)).toEqual([
      'warmup', 'squats', 'jumping-jacks', 'pushups', 'crunches', 'plank', 'cooldown',
    ]);
    expect(state.plans).toHaveLength(1);
    expect(state.planItems.map((item) => item.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // Retrieval joins the saved items; changing fixture order must not reorder the plan.
    state.planItems.reverse();
    const restored = await callApi('plan', { cookie });
    const reopened = await callApi('plan', { cookie });
    expect(restored.body).toEqual(created.body);
    expect(reopened.body).toEqual(created.body);
    expect(state.plans).toHaveLength(1);

    await callApi('profile', {
      method: 'PUT', cookie,
      body: profileInput({ time: '30', level: 'Intermediate', equipment: 'Backpack', goal: 'Build strength' }),
    });
    const updated = await callApi('plan', { method: 'POST', cookie });
    const latest = await callApi('plan', { cookie });

    expect(updated.status).toBe(200);
    expect(updated.body.id).not.toBe(created.body.id);
    expect(updated.body.totalMinutes).toBe(30);
    expect(updated.body.exercises.map((exercise) => exercise.id)).toContain('rows');
    expect(latest.body).toEqual(updated.body);
    expect(state.plans).toHaveLength(2);
    expect(state.plans.some((plan) => plan.id === created.body.id)).toBe(true);
    expect(state.sessions).toEqual([]);
    expect(state.exerciseResults.size).toBe(0);
    expect((await callApi('sessions', { cookie })).body).toEqual([]);
  });

  it('keeps A and B plans independent across logout and return despite browser-supplied owner IDs', async () => {
    const accountA = await login('account-a');
    const userA = state.users[0];
    const cookieA = cookieValue(accountA.cookie);
    await callApi('profile', { method: 'PUT', cookie: cookieA, body: profileInput() });
    const planA = await callApi('plan', { method: 'POST', cookie: cookieA });
    await callApi('logout', { method: 'POST', cookie: cookieA });

    const accountB = await login('account-b');
    const userB = state.users[1];
    const cookieB = cookieValue(accountB.cookie);
    const beforeB = await callApi('plan&userId=' + userA.id + '&planId=' + planA.body.id, { cookie: cookieB });
    expect(beforeB.status).toBe(200);
    expect(beforeB.body).toBeNull();
    await callApi('profile', {
      method: 'PUT', cookie: cookieB,
      body: profileInput({ displayName: 'Preferred B', time: '30', level: 'Intermediate', goal: 'Build strength', equipment: 'Backpack' }),
    });
    const planB = await callApi('plan&userId=' + userA.id, {
      method: 'POST', cookie: cookieB,
      body: { userId: userA.id, user_id: userA.id, profile: profileInput() },
    });
    const restoredB = await callApi('plan&userId=' + userA.id + '&planId=' + planA.body.id, { cookie: cookieB });
    expect(planB.status).toBe(200);
    expect(planB.body.id).not.toBe(planA.body.id);
    expect(planB.body.totalMinutes).toBe(30);
    expect(restoredB.body).toEqual(planB.body);
    expect(state.plans.find((plan) => plan.id === planB.body.id).user_id).toBe(userB.id);

    await callApi('logout', { method: 'POST', cookie: cookieB });
    const returningA = await login('account-a');
    const restoredA = await callApi('plan&userId=' + userB.id + '&planId=' + planB.body.id, {
      cookie: cookieValue(returningA.cookie),
    });
    expect(restoredA.status).toBe(200);
    expect(restoredA.body).toEqual(planA.body);
    expect(state.plans.find((plan) => plan.id === planA.body.id).user_id).toBe(userA.id);
    expect(state.users).toHaveLength(2);
    expect(state.plans).toHaveLength(2);
    expect(state.sessions).toEqual([]);
    expect(state.exerciseResults.size).toBe(0);
  });
});

describe('API request protection and logout', () => {
  it('rejects mutation requests without the same-origin marker', async () => {
    const response = await callApi('auth-google', {
      method: 'POST',
      body: { credential: 'verified-google-token-account-a' },
      includeMarker: false,
    });

    expect(response.status).toBe(403);
    expect(state.users).toHaveLength(0);
  });

  it('clears the cookie even when the database is unavailable', async () => {
    state.databaseConfigured = false;
    const response = await callApi('logout', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(response.cookie).toContain('Max-Age=0');
  });
});
