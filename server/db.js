import { neon } from '@neondatabase/serverless';
import { EXERCISE_SEED, SCHEMA_STATEMENTS } from './schema.js';

let sqlClient;
let setupPromise;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getClient() {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_NOT_CONFIGURED');
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export async function query(text, params = []) {
  return getClient().query(text, params);
}

async function seedExercises() {
  for (const exercise of EXERCISE_SEED) {
    await query(
      `INSERT INTO exercises (
        id, name, category, duration_label, instruction, icon, camera_supported,
        detection_type, met, primary_muscles, secondary_muscles, goal_tags,
        min_level, equipment, impact
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb,
        $12::jsonb, $13, $14, $15
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        duration_label = EXCLUDED.duration_label,
        instruction = EXCLUDED.instruction,
        icon = EXCLUDED.icon,
        camera_supported = EXCLUDED.camera_supported,
        detection_type = EXCLUDED.detection_type,
        met = EXCLUDED.met,
        primary_muscles = EXCLUDED.primary_muscles,
        secondary_muscles = EXCLUDED.secondary_muscles,
        goal_tags = EXCLUDED.goal_tags,
        min_level = EXCLUDED.min_level,
        equipment = EXCLUDED.equipment,
        impact = EXCLUDED.impact`,
      [
        ...exercise.slice(0, 9),
        JSON.stringify(exercise[9]),
        JSON.stringify(exercise[10]),
        JSON.stringify(exercise[11]),
        exercise[12],
        exercise[13],
        exercise[14],
      ],
    );
  }
}

export function ensureDatabase() {
  if (!isDatabaseConfigured()) return Promise.reject(new Error('DATABASE_NOT_CONFIGURED'));
  if (!setupPromise) {
    setupPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) await query(statement);
      await seedExercises();
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}
