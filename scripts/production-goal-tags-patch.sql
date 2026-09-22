-- Production catalogue parity patch (NOT executed by this repository or any script).
--
-- Purpose: synchronize the live `exercises.goal_tags` values with the local
-- catalogue source of truth (`src/data/exercises.js` / `server/schema.js`
-- EXERCISE_SEED), which already list these tags. Confirmed drift:
--   pushups  is missing 'weight-management'
--   crunches is missing 'weight-management'
--   lunges   is missing 'stay-fit'
--
-- Safety properties:
--   * Additive only: appends a single missing tag to the JSONB array.
--     Never replaces or reassigns the whole array, so any other tags already
--     present in production (added manually or by a future migration) are preserved.
--   * Idempotent: the WHERE clause guards on the tag being absent, so running
--     this script multiple times (or against a database already patched) is a no-op.
--   * Scoped: touches only the three named rows, by primary key `id`.
--
-- Apply manually against the production Neon database only after explicit
-- approval. Do not run this automatically from application code, CI, or any
-- setup script.

-- 1. Capture the exact pre-patch values for the three affected rows, so a
--    rollback can restore precisely what was there before (see bottom of file).
--    Save this SELECT's output somewhere durable before applying the UPDATEs.
SELECT id, goal_tags FROM exercises WHERE id IN ('pushups', 'crunches', 'lunges');

-- 2. Additive, idempotent patch.
UPDATE exercises
SET goal_tags = goal_tags || '["weight-management"]'::jsonb
WHERE id = 'pushups' AND NOT (goal_tags ? 'weight-management');

UPDATE exercises
SET goal_tags = goal_tags || '["weight-management"]'::jsonb
WHERE id = 'crunches' AND NOT (goal_tags ? 'weight-management');

UPDATE exercises
SET goal_tags = goal_tags || '["stay-fit"]'::jsonb
WHERE id = 'lunges' AND NOT (goal_tags ? 'stay-fit');

-- 3. Verify.
SELECT id, goal_tags FROM exercises WHERE id IN ('pushups', 'crunches', 'lunges');

-- ---------------------------------------------------------------------------
-- Rollback (only needed if this exact patch must be reverted; safe/idempotent
-- because it only removes the specific tag this patch adds, and is a no-op if
-- the tag is already absent):
--
-- UPDATE exercises SET goal_tags = goal_tags - 'weight-management' WHERE id = 'pushups';
-- UPDATE exercises SET goal_tags = goal_tags - 'weight-management' WHERE id = 'crunches';
-- UPDATE exercises SET goal_tags = goal_tags - 'stay-fit' WHERE id = 'lunges';
--
-- If step 1's captured pre-patch values differ from a plain tag removal
-- (e.g. tag order matters to another consumer), restore the exact captured
-- arrays instead:
--
-- UPDATE exercises SET goal_tags = '<captured JSON array>'::jsonb WHERE id = 'pushups';
-- UPDATE exercises SET goal_tags = '<captured JSON array>'::jsonb WHERE id = 'crunches';
-- UPDATE exercises SET goal_tags = '<captured JSON array>'::jsonb WHERE id = 'lunges';
