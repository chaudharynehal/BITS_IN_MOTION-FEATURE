import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { buildPlan } from './recommendation.js';
import { isDatabaseConfigured, query } from './db.js';
import { clearSessionCookie, createSessionToken, readSessionUserId, setSessionCookie } from './session.js';
import { PROFILE_OPTIONS as PROFILE_CHOICES, LEGACY_EQUIPMENT, LEGACY_LOCATIONS } from '../shared/profile.js';
import { getCircuitRounds, prescriptionFromLabel } from '../shared/recommendation.js';

const googleClient = new OAuth2Client();
const MAX_JSON_BYTES = 32 * 1024;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_OPTIONS = {
  level: new Set(PROFILE_CHOICES.level),
  goal: new Set(PROFILE_CHOICES.goal),
  location: new Set([...PROFILE_CHOICES.location, ...LEGACY_LOCATIONS]),
  equipment: new Set([...PROFILE_CHOICES.equipment, ...LEGACY_EQUIPMENT]),
};

class RequestError extends Error {
  constructor(status, message, code = 'INVALID_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return send(res, 405, { error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(req) {
  if (isPlainObject(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body)) > MAX_JSON_BYTES) throw new RequestError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
    return req.body;
  }

  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > MAX_JSON_BYTES) throw new RequestError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
    try {
      const parsed = JSON.parse(req.body || '{}');
      if (!isPlainObject(parsed)) throw new Error('Body must be an object.');
      return parsed;
    } catch {
      throw new RequestError(400, 'Request body must be valid JSON.', 'INVALID_JSON');
    }
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new RequestError(413, 'Request body is too large.', 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }

  try {
    const parsed = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    if (!isPlainObject(parsed)) throw new Error('Body must be an object.');
    return parsed;
  } catch {
    throw new RequestError(400, 'Request body must be valid JSON.', 'INVALID_JSON');
  }
}

function actionFor(req) {
  return new URL(req.url, 'http://localhost').searchParams.get('action') || 'status';
}

function validateMutationRequest(req) {
  if (!MUTATION_METHODS.has(req.method)) return;
  if (req.headers['x-bits-motion-request'] !== '1') {
    throw new RequestError(403, 'Request origin could not be verified.', 'ORIGIN_REJECTED');
  }

  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') throw new RequestError(403, 'Cross-site requests are not allowed.', 'ORIGIN_REJECTED');

  const origin = req.headers.origin;
  if (!origin) return;
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const expectedHost = req.headers.host || forwardedHost;
  try {
    if (!expectedHost || new URL(origin).host !== expectedHost) throw new Error('Origin mismatch.');
  } catch {
    throw new RequestError(403, 'Request origin could not be verified.', 'ORIGIN_REJECTED');
  }
}

function publicUser(row) {
  return row ? {
    email: row.email,
    name: row.display_name,
    avatarUrl: row.avatar_url,
    leaderboardOptIn: row.leaderboard_opt_in,
    leaderboardName: row.leaderboard_name,
  } : null;
}

function publicProfile(row, displayName = '') {
  return row ? {
    displayName,
    age: String(row.age),
    height: String(row.height_cm),
    weight: String(row.weight_kg),
    level: row.fitness_level,
    goal: row.goal,
    time: String(row.available_minutes),
    location: row.location,
    equipment: row.equipment,
    lowImpact: row.low_impact,
  } : null;
}

function validateProfile(profile) {
  if (typeof profile.displayName !== 'string') return 'Preferred name must contain 1 to 80 characters.';
  const displayName = profile.displayName.trim();
  if (!displayName || displayName.length > 80) return 'Preferred name must contain 1 to 80 characters.';
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const time = Number(profile.time);
  if (!Number.isInteger(age) || age < 16 || age > 80) return 'Age must be a whole number between 16 and 80.';
  if (!Number.isFinite(height) || height < 120 || height > 230) return 'Height must be between 120 and 230 cm.';
  if (!Number.isFinite(weight) || weight < 30 || weight > 250) return 'Weight must be between 30 and 250 kg.';
  if (!Number.isInteger(time) || time < 5 || time > 120) return 'Available time must be a whole number between 5 and 120 minutes.';
  for (const [field, allowed] of Object.entries(PROFILE_OPTIONS)) {
    if (!allowed.has(profile[field])) return `Choose a valid ${field}.`;
  }
  if (profile.lowImpact !== undefined && typeof profile.lowImpact !== 'boolean') return 'Low-impact preference must be true or false.';
  if (profile.leaderboardOptIn !== undefined && typeof profile.leaderboardOptIn !== 'boolean') return 'Leaderboard preference must be true or false.';
  if (profile.leaderboardOptIn && (!String(profile.leaderboardName || '').trim() || String(profile.leaderboardName).trim().length > 40)) {
    return 'Leaderboard name must contain 1 to 40 characters.';
  }
  return null;
}

function numberInRange(value, minimum, maximum, label, integer = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum || (integer && !Number.isInteger(parsed))) {
    throw new RequestError(400, `${label} is outside the allowed range.`);
  }
  return parsed;
}

function optionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RequestError(400, `${label} must be a valid date.`);
  return date;
}

function validateSession(body) {
  const completedAt = optionalDate(body.completedAt, 'Completion time') || new Date();
  const startedAt = optionalDate(body.startedAt, 'Start time');
  if (completedAt.getTime() > Date.now() + 5 * 60 * 1000) throw new RequestError(400, 'Completion time cannot be in the future.');
  if (startedAt && startedAt > completedAt) throw new RequestError(400, 'Start time must be before completion time.');
  if (body.cueCounts !== undefined && !isPlainObject(body.cueCounts)) throw new RequestError(400, 'Cue counts must be an object.');
  if (body.movementMetrics !== undefined && !isPlainObject(body.movementMetrics)) throw new RequestError(400, 'Movement metrics must be an object.');

  const suppliedClientId = String(body.clientSessionId || '');
  if (suppliedClientId && !UUID_PATTERN.test(suppliedClientId)) throw new RequestError(400, 'Session identifier is invalid.');
  const formSummary = String(body.formSummary || '').trim();
  if (formSummary.length > 500) throw new RequestError(400, 'Form summary is too long.');

  return {
    clientSessionId: suppliedClientId || crypto.randomUUID(),
    exerciseId: String(body.exerciseId || '').trim(),
    startedAt: startedAt?.toISOString() || null,
    completedAt: completedAt.toISOString(),
    durationSeconds: numberInRange(body.durationSeconds, 0, 6 * 60 * 60, 'Duration', true),
    calories: numberInRange(body.calories, 0, 10000, 'Calories'),
    reps: numberInRange(body.reps, 0, 100000, 'Repetitions', true),
    framingInterruptions: numberInRange(body.framingInterruptions || 0, 0, 100000, 'Framing interruptions', true),
    cueCounts: body.cueCounts || {},
    movementMetrics: body.movementMetrics || {},
    formSummary,
  };
}

async function authenticatedUser(req) {
  const userId = readSessionUserId(req);
  if (!userId) return null;
  const rows = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
}

async function getAccountPayload(user) {
  const profiles = await query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
  return { user: publicUser(user), profile: publicProfile(profiles[0], user.display_name) };
}

async function handleGoogleAuth(req, res) {
  const { credential } = await readJson(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new RequestError(503, 'Google account sync is not configured.', 'GOOGLE_NOT_CONFIGURED');
  if (typeof credential !== 'string' || credential.length < 20 || credential.length > 12000) {
    throw new RequestError(400, 'A valid Google credential is required.');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw new RequestError(401, 'Google could not verify this sign-in.', 'INVALID_GOOGLE_TOKEN');
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new RequestError(401, 'Google could not verify this email.', 'INVALID_GOOGLE_TOKEN');
  }

  const email = String(payload.email).trim().toLowerCase();
  if (email.length > 320) throw new RequestError(400, 'Google returned an invalid email address.');
  const displayName = String(payload.name || email.split('@')[0]).trim().slice(0, 120);
  const avatarUrl = payload.picture ? String(payload.picture).slice(0, 2048) : null;
  const rows = await query(
    `INSERT INTO users (google_sub, email, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = users.display_name,
       avatar_url = EXCLUDED.avatar_url,
       last_login_at = NOW()
     RETURNING *`,
    [String(payload.sub), email, displayName, avatarUrl],
  );
  const user = rows[0];
  setSessionCookie(res, createSessionToken(user.id));
  return send(res, 200, await getAccountPayload(user));
}

async function handleProfile(req, res, user) {
  if (req.method === 'GET') return send(res, 200, (await getAccountPayload(user)).profile);
  if (req.method !== 'PUT') return methodNotAllowed(res, ['GET', 'PUT']);
  const body = await readJson(req);
  const validationError = validateProfile(body);
  if (validationError) throw new RequestError(400, validationError);
  const displayName = body.displayName.trim();
  const leaderboardName = String(body.leaderboardName || displayName).trim().slice(0, 40);
  // Both records change together, so a failed save cannot leave half an updated profile.
  const rows = await query(
    `WITH saved_profile AS (
      INSERT INTO profiles (
        user_id, age, height_cm, weight_kg, fitness_level, goal,
        available_minutes, location, equipment, low_impact, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        age=EXCLUDED.age, height_cm=EXCLUDED.height_cm, weight_kg=EXCLUDED.weight_kg,
        fitness_level=EXCLUDED.fitness_level, goal=EXCLUDED.goal,
        available_minutes=EXCLUDED.available_minutes, location=EXCLUDED.location,
        equipment=EXCLUDED.equipment, low_impact=EXCLUDED.low_impact, updated_at=NOW()
      RETURNING *
    ), updated_user AS (
      UPDATE users SET display_name=$11, leaderboard_opt_in=$12, leaderboard_name=$13
      WHERE id=$1 RETURNING *
    )
    SELECT row_to_json(saved_profile) AS profile, row_to_json(updated_user) AS account
    FROM saved_profile CROSS JOIN updated_user`,
    [
      user.id, Number(body.age), Number(body.height), Number(body.weight), body.level, body.goal,
      Number(body.time), body.location, body.equipment, body.lowImpact === true,
      displayName, body.leaderboardOptIn === true, leaderboardName || null,
    ],
  );
  return send(res, 200, {
    profile: publicProfile(rows[0].profile, rows[0].account.display_name),
    user: publicUser(rows[0].account),
  });
}

function mapPlanExercise(row) {
  return {
    id: row.exercise_id,
    name: row.exercise_name,
    category: row.exercise_category,
    duration: row.target_label,
    ...prescriptionFromLabel(row.target_label),
    instruction: row.exercise_instruction,
    icon: row.exercise_icon,
    cameraSupported: row.camera_supported,
    detectionType: row.detection_type,
    met: Number(row.met),
    primaryMuscles: row.primary_muscles || [],
    secondaryMuscles: row.secondary_muscles || [],
    goalTags: row.goal_tags || [],
    minLevel: row.min_level || 'Beginner',
    equipment: row.equipment || 'None',
    impact: row.impact || 'low',
  };
}

async function getLatestPlan(userId) {
  const plans = await query(
    'SELECT id,title,focus,total_minutes,reasons,created_at FROM workout_plans WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  if (!plans[0]) return null;
  const items = await query(
    `SELECT pi.exercise_id, pi.target_label, e.name AS exercise_name,
      e.category AS exercise_category, e.instruction AS exercise_instruction,
      e.icon AS exercise_icon, e.camera_supported, e.detection_type, e.met,
      e.primary_muscles, e.secondary_muscles, e.goal_tags, e.min_level, e.equipment, e.impact
     FROM plan_items pi
     JOIN workout_plans wp ON wp.id=pi.plan_id
     JOIN exercises e ON e.id=pi.exercise_id
     WHERE pi.plan_id=$1 AND wp.user_id=$2
     ORDER BY pi.position`,
    [plans[0].id, userId],
  );
  const totalMinutes = Number(plans[0].total_minutes);
  const rounds = getCircuitRounds(totalMinutes);
  const circuitStations = items.filter((item) => !['warmup', 'cooldown'].includes(item.exercise_id)).length;
  const roundBreakSeconds = 60;
  const roundRecoveriesMinutes = rounds > 1 ? rounds - 1 : 0;
  const activeCircuitMinutes = circuitStations * rounds;
  const circuitTotalMinutes = activeCircuitMinutes + roundRecoveriesMinutes;
  const remainingMinutes = Math.max(2, totalMinutes - circuitTotalMinutes);
  const warmupMinutes = Math.max(1, Math.ceil(remainingMinutes / 2));
  const cooldownMinutes = Math.max(1, remainingMinutes - warmupMinutes);
  return {
    id: plans[0].id,
    title: plans[0].title,
    focus: plans[0].focus,
    rounds,
    circuitStations,
    roundBreakSeconds,
    roundRecoveriesMinutes,
    warmupMinutes,
    cooldownMinutes,
    activeCircuitMinutes,
    totalMinutes,
    reasons: plans[0].reasons || [],
    createdAt: plans[0].created_at,
    exercises: items.map(mapPlanExercise),
  };
}

async function handlePlan(req, res, user) {
  if (req.method === 'GET') return send(res, 200, await getLatestPlan(user.id));
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  const profiles = await query('SELECT * FROM profiles WHERE user_id=$1', [user.id]);
  if (!profiles[0]) throw new RequestError(400, 'Complete your profile first.');
  const profile = publicProfile(profiles[0], user.display_name);
  const exercises = await query('SELECT * FROM exercises WHERE active=TRUE ORDER BY id');
  const plan = buildPlan(profile, exercises);
  const planId = crypto.randomUUID();
  const plans = await query(
    `WITH inserted_plan AS (
       INSERT INTO workout_plans (id,user_id,title,focus,total_minutes,reasons)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING id,created_at
     ), inserted_items AS (
       INSERT INTO plan_items (plan_id,exercise_id,position,target_label)
       SELECT inserted_plan.id, item.exercise_id, item.position, item.target_label
       FROM inserted_plan
       CROSS JOIN UNNEST($7::text[],$8::smallint[],$9::text[])
         AS item(exercise_id,position,target_label)
       RETURNING plan_id
     )
     SELECT id,created_at FROM inserted_plan`,
    [
      planId,
      user.id,
      plan.title,
      plan.focus,
      plan.totalMinutes,
      JSON.stringify(plan.reasons),
      plan.exercises.map((exercise) => exercise.id),
      plan.exercises.map((_, position) => position),
      plan.exercises.map((exercise) => exercise.duration),
    ],
  );
  return send(res, 200, { ...plan, id: plans[0].id, createdAt: plans[0].created_at });
}

function mapSession(row) {
  return {
    id: row.id,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    calories: Number(row.estimated_calories),
    source: row.source,
    formSummary: row.form_summary,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    reps: Number(row.reps || 0),
    framingInterruptions: Number(row.framing_interruptions || 0),
    cueCounts: row.cue_counts || {},
    movementMetrics: row.movement_metrics || {},
  };
}

export function calculateStreak(activeDateStrings = [], now = new Date()) {
  const dateSet = new Set(
    activeDateStrings.map((d) => (typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10))),
  );
  if (dateSet.size === 0) return 0;

  const cursor = new Date(now);
  const formatYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatYmd(cursor);
  let streak = 0;

  if (dateSet.has(todayStr)) {
    while (dateSet.has(formatYmd(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayStr = formatYmd(cursor);
    if (dateSet.has(yesterdayStr)) {
      while (dateSet.has(formatYmd(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
  }

  return streak;
}

export async function getSessionsSummary(userId, now = new Date()) {
  const [sessionStatsRows, repStatsRows, activeDatesRows] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         COUNT(DISTINCT DATE(completed_at))::int AS active_days,
         COALESCE(SUM(duration_seconds), 0)::int AS total_duration_seconds,
         COALESCE(SUM(estimated_calories), 0)::numeric AS total_calories
       FROM sessions
       WHERE user_id = $1`,
      [userId],
    ),
    query(
      `SELECT COALESCE(SUM(er.reps), 0)::int AS total_reps
       FROM exercise_results er
       JOIN sessions s ON s.id = er.session_id
       WHERE s.user_id = $1`,
      [userId],
    ),
    query(
      `SELECT DISTINCT DATE(completed_at)::text AS active_date
       FROM sessions
       WHERE user_id = $1
       ORDER BY active_date DESC`,
      [userId],
    ),
  ]);

  const sessionRow = sessionStatsRows[0] || {};
  const repRow = repStatsRows[0] || {};
  const activeDates = (activeDatesRows || []).map((r) => r.active_date);
  const streak = calculateStreak(activeDates, now);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const weekAgoYmd = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
  const weeklyActiveDays = activeDates.filter((dateStr) => dateStr >= weekAgoYmd).length;

  return {
    totalSessions: Number(sessionRow.total_sessions || 0),
    workouts: Number(sessionRow.total_sessions || 0),
    sessions: Number(sessionRow.total_sessions || 0),
    activeDays: Number(sessionRow.active_days || 0),
    totalReps: Number(repRow.total_reps || 0),
    totalDurationSeconds: Number(sessionRow.total_duration_seconds || 0),
    totalCalories: Number(Number(sessionRow.total_calories || 0).toFixed(1)),
    streak,
    weeklyActiveDays,
  };
}

async function handleSessionsSummary(req, res, user) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const summary = await getSessionsSummary(user.id);
  return send(res, 200, summary);
}

async function handleSessions(req, res, user) {
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;
    const rows = await query(
      `SELECT s.*, er.exercise_id, e.name AS exercise_name, er.reps,
        er.framing_interruptions, er.cue_counts, er.movement_metrics
       FROM sessions s
       LEFT JOIN exercise_results er ON er.session_id=s.id
       LEFT JOIN exercises e ON e.id=er.exercise_id
       WHERE s.user_id=$1 ORDER BY s.completed_at DESC LIMIT $2`,
      [user.id, limit],
    );
    const summary = await getSessionsSummary(user.id);
    res.setHeader('X-Total-Sessions', String(summary.totalSessions));
    res.setHeader('X-Total-Reps', String(summary.totalReps));
    res.setHeader('X-Total-Duration', String(summary.totalDurationSeconds));
    res.setHeader('X-Total-Calories', String(summary.totalCalories));
    res.setHeader('X-Active-Days', String(summary.activeDays));
    res.setHeader('X-Current-Streak', String(summary.streak));
    return send(res, 200, rows.map(mapSession));
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
  const body = validateSession(await readJson(req));
  const exerciseRows = await query('SELECT id FROM exercises WHERE id=$1 AND active=TRUE', [body.exerciseId]);
  if (!exerciseRows[0]) throw new RequestError(400, 'Unknown exercise.');
  const rows = await query(
    `WITH upserted_session AS (
       INSERT INTO sessions (user_id,client_session_id,started_at,completed_at,duration_seconds,estimated_calories,source,form_summary)
       VALUES ($1,$2,$3,$4,$5,$6,'real',$7)
       ON CONFLICT (user_id,client_session_id) DO UPDATE SET client_session_id=EXCLUDED.client_session_id
       RETURNING *
     ), upserted_result AS (
       INSERT INTO exercise_results (session_id,exercise_id,reps,framing_interruptions,cue_counts,movement_metrics)
       SELECT upserted_session.id,$8,$9,$10,$11::jsonb,$12::jsonb FROM upserted_session
       ON CONFLICT (session_id,exercise_id) DO UPDATE SET
         reps=EXCLUDED.reps, framing_interruptions=EXCLUDED.framing_interruptions,
         cue_counts=EXCLUDED.cue_counts, movement_metrics=EXCLUDED.movement_metrics
       RETURNING *
     )
     SELECT s.*, er.exercise_id, e.name AS exercise_name, er.reps,
       er.framing_interruptions, er.cue_counts, er.movement_metrics
     FROM upserted_session s
     JOIN upserted_result er ON er.session_id=s.id
     JOIN exercises e ON e.id=er.exercise_id`,
    [
      user.id,
      body.clientSessionId,
      body.startedAt,
      body.completedAt,
      body.durationSeconds,
      body.calories,
      body.formSummary,
      body.exerciseId,
      body.reps,
      body.framingInterruptions,
      JSON.stringify(body.cueCounts),
      JSON.stringify(body.movementMetrics),
    ],
  );
  return send(res, 201, mapSession(rows[0]));
}

async function handleLeaderboard(req, res, user) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const url = new URL(req.url, 'http://localhost');
  const period = url.searchParams.get('period') === 'all' ? 'all' : 'week';
  const dateFilter = period === 'week' ? "AND s.completed_at >= NOW() - INTERVAL '7 days'" : '';
  const rows = await query(
    `SELECT u.id, BTRIM(u.leaderboard_name) AS name,
      COUNT(DISTINCT s.id)::int AS workouts,
      COALESCE(SUM(er.reps),0)::int AS reps,
      COUNT(DISTINCT DATE(s.completed_at))::int AS active_days
     FROM users u
     LEFT JOIN sessions s ON s.user_id=u.id ${dateFilter}
     LEFT JOIN exercise_results er ON er.session_id=s.id
     WHERE u.leaderboard_opt_in=TRUE AND NULLIF(BTRIM(u.leaderboard_name),'') IS NOT NULL
     GROUP BY u.id ORDER BY workouts DESC, reps DESC, active_days DESC, name ASC LIMIT 50`,
  );
  const leaders = rows.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    sessions: Number(row.workouts),
    workouts: Number(row.workouts),
    reps: Number(row.reps),
    activeDays: Number(row.active_days),
    isCurrentUser: row.id === user.id,
  }));
  const communityRows = await query(
    `SELECT COUNT(DISTINCT s.user_id)::int AS active_people,
      COUNT(DISTINCT s.id)::int AS workouts,
      COALESCE(SUM(er.reps),0)::int AS reps
     FROM sessions s LEFT JOIN exercise_results er ON er.session_id=s.id
     WHERE 1=1 ${period === 'week' ? "AND s.completed_at >= NOW() - INTERVAL '7 days'" : ''}`,
  );
  const community = communityRows[0] || {};
  return send(res, 200, {
    period,
    leaders,
    community: {
      ...community,
      sessions: Number(community.workouts || 0),
    },
  });
}

export async function handleApiRequest(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const action = actionFor(req);
    if (action === 'status') {
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      return send(res, 200, {
        databaseConfigured: isDatabaseConfigured(),
        googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      });
    }

    validateMutationRequest(req);
    if (action === 'logout') {
      if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
      clearSessionCookie(res);
      return send(res, 200, { ok: true });
    }

    if (!isDatabaseConfigured()) throw new Error('DATABASE_NOT_CONFIGURED');
    if (action === 'auth-google') {
      if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
      return await handleGoogleAuth(req, res);
    }

    const user = await authenticatedUser(req);
    if (!user) return send(res, 401, { error: 'Sign in required.', code: 'AUTH_REQUIRED' });
    if (action === 'me') {
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
      return send(res, 200, await getAccountPayload(user));
    }
    if (action === 'profile') return await handleProfile(req, res, user);
    if (action === 'plan') return await handlePlan(req, res, user);
    if (action === 'sessions') return await handleSessions(req, res, user);
    if (action === 'sessions-summary' || action === 'progress-summary') return await handleSessionsSummary(req, res, user);
    if (action === 'leaderboard') return await handleLeaderboard(req, res, user);
    return send(res, 404, { error: 'Unknown API action.', code: 'NOT_FOUND' });
  } catch (error) {
    if (error instanceof RequestError) return send(res, error.status, { error: error.message, code: error.code });
    const configurationError = ['DATABASE_NOT_CONFIGURED', 'SESSION_SECRET_NOT_CONFIGURED'].includes(error.message);
    if (configurationError) return send(res, 503, { error: 'Account sync is not configured yet.', code: error.message });
    if (error.code === '42P01' || error.code === '42703') {
      return send(res, 503, { error: 'The account database has not been initialized. Run the database setup command.', code: 'DATABASE_SETUP_REQUIRED' });
    }
    // Never print driver errors: they can contain connection strings or SQL data.
    console.error('BITS in Motion API request failed.');
    return send(res, 500, { error: 'The server could not complete this request.', code: 'SERVER_ERROR' });
  }
}
