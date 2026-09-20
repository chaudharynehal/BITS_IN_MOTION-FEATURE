export const SCHEMA_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    leaderboard_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    age SMALLINT NOT NULL CHECK (age BETWEEN 16 AND 80),
    height_cm NUMERIC(5,1) NOT NULL CHECK (height_cm BETWEEN 120 AND 230),
    weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 250),
    fitness_level TEXT NOT NULL,
    goal TEXT NOT NULL,
    available_minutes SMALLINT NOT NULL CHECK (available_minutes BETWEEN 5 AND 120),
    location TEXT NOT NULL,
    equipment TEXT NOT NULL,
    low_impact BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_label TEXT NOT NULL,
    instruction TEXT NOT NULL,
    icon TEXT NOT NULL,
    camera_supported BOOLEAN NOT NULL DEFAULT FALSE,
    detection_type TEXT,
    met NUMERIC(4,2) NOT NULL DEFAULT 3.8,
    primary_muscles JSONB NOT NULL DEFAULT '[]'::jsonb,
    secondary_muscles JSONB NOT NULL DEFAULT '[]'::jsonb,
    goal_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    min_level TEXT NOT NULL DEFAULT 'Beginner',
    equipment TEXT NOT NULL DEFAULT 'None',
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    focus TEXT NOT NULL,
    total_minutes SMALLINT NOT NULL,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    position SMALLINT NOT NULL,
    target_label TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_session_id UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    estimated_calories NUMERIC(8,2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'real',
    form_summary TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS exercise_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
    framing_interruptions INTEGER NOT NULL DEFAULT 0 CHECK (framing_interruptions >= 0),
    cue_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    movement_metrics JSONB NOT NULL DEFAULT '{}'::jsonb
  )`,
  `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS client_session_id UUID`,
  `CREATE INDEX IF NOT EXISTS workout_plans_user_created_idx ON workout_plans(user_id, created_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS plan_items_plan_position_uidx ON plan_items(plan_id, position)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_completed_idx ON sessions(user_id, completed_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_client_uidx ON sessions(user_id, client_session_id)`,
  `CREATE INDEX IF NOT EXISTS exercise_results_session_idx ON exercise_results(session_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS exercise_results_session_exercise_uidx ON exercise_results(session_id, exercise_id)`,
];

export const EXERCISE_SEED = [
  ['warmup', 'Mobility warm-up', 'Warm-up', '3 min', 'March in place, roll your shoulders, then open the hips gently.', 'activity', false, null, 2.8, ['Shoulders', 'Hips'], [], ['stay-fit'], 'Beginner', 'None'],
  ['squats', 'Bodyweight squats', 'Lower body', '3 × 8 reps', 'Stand tall, sit the hips back, reach a comfortable depth, then stand.', 'scan', true, 'squat', 5.0, ['Quadriceps', 'Glutes'], ['Hamstrings', 'Core'], ['stay-fit', 'strength', 'weight-management'], 'Beginner', 'None'],
  ['jumping-jacks', 'Jumping jacks', 'Cardio', '3 × 30 sec', 'Move from feet-together and arms-down to feet-apart and hands overhead.', 'zap', true, 'jumping-jack', 8.0, ['Calves', 'Shoulders'], ['Glutes', 'Cardiovascular system'], ['stay-fit', 'weight-management'], 'Beginner', 'None'],
  ['pushups', 'Incline or knee push-ups', 'Upper body', '3 × 6 reps', 'Use a stable desk edge or your knees; keep a straight line through the torso.', 'move', true, 'pushup', 3.8, ['Chest', 'Triceps'], ['Shoulders', 'Core'], ['stay-fit', 'strength'], 'Beginner', 'None'],
  ['crunches', 'Controlled crunches', 'Core', '3 × 8 reps', 'Lie side-on to the camera, curl the shoulders toward the hips, then return with control.', 'activity', true, 'crunch', 3.8, ['Abdominals'], ['Hip flexors'], ['stay-fit', 'strength'], 'Beginner', 'None'],
  ['plank', 'Supported plank', 'Core', '2 × 20 sec', 'Brace gently and hold a straight, comfortable position. Stop if it feels painful.', 'timer', false, null, 3.5, ['Core'], ['Shoulders', 'Glutes'], ['stay-fit', 'strength'], 'Beginner', 'None'],
  ['cooldown', 'Cooldown & breathing', 'Recovery', '3 min', 'Walk slowly, breathe evenly and stretch only within a comfortable range.', 'wind', false, null, 2.3, ['Whole body'], [], ['stay-fit', 'strength', 'weight-management'], 'Beginner', 'None'],
  ['lunges', 'Reverse lunges', 'Lower body', '3 × 6 / side', 'Step back under control and use a wall for support if needed.', 'footprints', false, null, 4.0, ['Quadriceps', 'Glutes'], ['Hamstrings', 'Core'], ['strength'], 'Intermediate', 'None'],
  ['rows', 'Backpack rows', 'Upper body', '3 × 10 reps', 'Use a lightly loaded backpack and pull it toward your ribs with a long spine.', 'briefcase', false, null, 3.8, ['Upper back'], ['Biceps', 'Core'], ['strength'], 'Intermediate', 'Backpack'],
];
