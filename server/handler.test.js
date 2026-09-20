import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  databaseConfigured: true,
  users: [],
  profiles: new Map(),
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
        user.display_name = params[2];
        user.avatar_url = params[3];
      }
      return [user];
    }
    if (statement.startsWith('SELECT * FROM users WHERE id')) return state.users.filter((user) => user.id === params[0]);
    if (statement.startsWith('SELECT * FROM profiles WHERE user_id')) {
      const profile = state.profiles.get(params[0]);
      return profile ? [profile] : [];
    }
    if (statement.startsWith('INSERT INTO profiles')) {
      state.profiles.set(params[0], {
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
      });
      return [];
    }
    if (statement.startsWith('UPDATE users SET leaderboard_opt_in')) {
      const user = state.users.find((candidate) => candidate.id === params[0]);
      user.leaderboard_opt_in = params[1];
      user.leaderboard_name = params[2];
      return [];
    }
    if (statement.startsWith('SELECT id,title,focus,total_minutes')) return [];
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

beforeEach(() => {
  state.databaseConfigured = true;
  state.users.length = 0;
  state.profiles.clear();
  state.sessions.length = 0;
  state.exerciseResults.clear();
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  process.env.SESSION_SECRET = 'test-session-secret-that-is-longer-than-thirty-two-characters';
});

afterEach(() => vi.clearAllMocks());

describe('Google account persistence and ownership', () => {
  it('creates a user once and reuses the same internal account on returning login', async () => {
    const first = await login('account-a');
    const second = await login('account-a');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.users).toHaveLength(1);
    expect(state.users[0].google_sub).toBe('google-sub-a');
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
