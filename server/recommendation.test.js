import { describe, expect, it } from 'vitest';
import { buildPlan } from './recommendation.js';
import { EXERCISE_SEED } from './schema.js';
import { generateWorkoutPlan } from '../src/utils/workoutRecommendation.js';
import { PROFILE_OPTIONS } from '../shared/profile.js';

const exercises = EXERCISE_SEED.map((exercise) => ({
  id: exercise[0], name: exercise[1], category: exercise[2], duration_label: exercise[3], instruction: exercise[4],
  icon: exercise[5], camera_supported: exercise[6], detection_type: exercise[7], met: exercise[8],
  primary_muscles: exercise[9], secondary_muscles: exercise[10], goal_tags: exercise[11], min_level: exercise[12],
  equipment: exercise[13], impact: exercise[14],
}));

const profile = {
  level: 'Beginner', goal: 'Stay fit', time: '20', location: 'Hostel', equipment: 'None', lowImpact: false,
};

describe('saved-account recommendation rules', () => {
  it('matches client selection, order, targets and explanations for every supported profile combination', () => {
    for (const level of PROFILE_OPTIONS.level) for (const goal of PROFILE_OPTIONS.goal)
      for (const time of PROFILE_OPTIONS.time) for (const equipment of PROFILE_OPTIONS.equipment)
        for (const lowImpact of [false, true]) for (const location of PROFILE_OPTIONS.location) {
          const input = { level, goal, time, equipment, lowImpact, location };
          const guest = generateWorkoutPlan(input);
          const account = buildPlan(input, exercises);
          const visible = (plan) => ({ ...plan, exercises: plan.exercises.map(({ active, cameraSupported, detectionType, ...item }) => ({ ...item, cameraSupported: Boolean(cameraSupported), detectionType: detectionType || null })) });
          expect(visible(account)).toEqual(visible(guest));
        }
  });

  it('does not select disabled catalogue entries or invent missing equipment exercises', () => {
    const plan = buildPlan({ ...profile, level: 'Intermediate', equipment: 'Backpack', goal: 'Build strength' }, exercises.filter((item) => item.id !== 'rows'));
    expect(plan.exercises.some((item) => item.id === 'rows')).toBe(false);
  });
  it('uses the same low-impact cardio alternative as guest recommendations', () => {
    const plan = buildPlan({ ...profile, goal: 'Support weight management', lowImpact: true }, exercises);
    expect(plan.exercises.map((exercise) => exercise.id)).toContain('marching');
    expect(plan.exercises.map((exercise) => exercise.id)).not.toContain('jumping-jacks');
    expect(plan.reasons).toContain('low-impact movements preferred');
  });

  it('selects a backpack strength movement only for a longer intermediate plan', () => {
    const plan = buildPlan({ ...profile, goal: 'Build strength', level: 'Intermediate', time: '30', equipment: 'Backpack' }, exercises);
    expect(plan.exercises.map((exercise) => exercise.id)).toContain('rows');
  });
});
