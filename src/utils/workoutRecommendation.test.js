import { describe, expect, it } from 'vitest';
import { generateWorkoutPlan } from './workoutRecommendation';
import { recommendWorkout, normalizePreferences, isEligible } from '../../shared/recommendation.js';
import { PROFILE_OPTIONS } from '../../shared/profile.js';
import { EXERCISES } from '../data/exercises.js';

const base = { level: 'Beginner', goal: 'Stay fit', time: '20', location: 'Hostel room', equipment: 'None', lowImpact: false };
const ids = (plan) => plan.exercises.map((item) => item.id);
const signature = (plan) => plan.exercises.map(({ id, duration }) => [id, duration]);
const cases = PROFILE_OPTIONS.level.flatMap((level) => PROFILE_OPTIONS.goal.flatMap((goal) =>
  PROFILE_OPTIONS.time.flatMap((time) => PROFILE_OPTIONS.equipment.flatMap((equipment) =>
    [false, true].flatMap((lowImpact) => PROFILE_OPTIONS.location.map((location) => ({ level, goal, time, equipment, lowImpact, location })))))));

describe('recommendation eligibility and exact time budgets', () => {
  it.each(cases)('respects the complete profile %#', (profile) => {
    const plan = generateWorkoutPlan(profile);
    const p = normalizePreferences(profile);
    expect(plan.exercises[0].id).toBe('warmup');
    expect(plan.exercises.at(-1).id).toBe('cooldown');
    expect(plan.exercises.reduce((sum, item) => sum + item.estimatedSeconds, 0)).toBe(Number(profile.time) * 60);
    expect(new Set(ids(plan)).size).toBe(plan.exercises.length);
    for (const item of plan.exercises) {
      expect(isEligible(item, p)).toBe(true);
      if (item.sets) {
        expect(item.sets * (item.workSeconds + item.restSeconds)).toBe(item.estimatedSeconds);
        expect(item.goalTags).toContain(p.goal);
      }
    }
    expect(generateWorkoutPlan(profile)).toEqual(plan);
  });

  it('changes actual composition and volume for 10, 30, 45 and 60 minutes', () => {
    const plans = [10, 30, 45, 60].map((time) => generateWorkoutPlan({ ...base, time }));
    expect(plans[0].exercises.length).toBeLessThan(plans[1].exercises.length);
    expect(new Set(plans.map((plan) => JSON.stringify(signature(plan)))).size).toBe(4);
    const work = plans.map((plan) => plan.exercises.reduce((sum, item) => sum + (item.sets || 0) * (item.workSeconds || 0), 0));
    expect(work).toEqual([...work].sort((a, b) => a - b));
    expect(work[3]).toBeGreaterThan(work[2]);
  });

  it('uses a backpack even in a short eligible strength session', () => {
    const profile = { ...base, level: 'Intermediate', goal: 'Build strength', time: 10 };
    const bodyweight = generateWorkoutPlan(profile);
    const backpack = generateWorkoutPlan({ ...profile, equipment: 'Backpack' });
    expect(ids(bodyweight)).not.toContain('rows');
    expect(ids(backpack)).toContain('rows');
    expect(signature(bodyweight)).not.toEqual(signature(backpack));
    expect(ids(generateWorkoutPlan({ ...profile, level: 'Beginner', equipment: 'Backpack' }))).not.toContain('rows');
  });

  it('reduces impact without restricting normal-impact open-space plans', () => {
    const profile = { ...base, location: 'Outdoor', level: 'Intermediate', goal: 'Support weight management', time: 45 };
    const normal = generateWorkoutPlan(profile);
    const low = generateWorkoutPlan({ ...profile, lowImpact: true });
    expect(ids(normal)).toContain('jumping-jacks');
    expect(ids(normal)).toContain('lunges');
    expect(ids(low)).toContain('marching');
    expect(low.exercises.every((item) => item.impact === 'low')).toBe(true);
  });

  it('changes level through both eligibility and work/rest targets', () => {
    const profile = { ...base, goal: 'Build strength', location: 'Gym', time: 30, equipment: 'Backpack' };
    const beginner = generateWorkoutPlan(profile);
    const intermediate = generateWorkoutPlan({ ...profile, level: 'Intermediate' });
    expect(ids(beginner)).not.toContain('lunges');
    expect(ids(intermediate)).toContain('lunges');
    expect(intermediate.exercises.find((item) => item.id === 'squats').workSeconds)
      .toBeGreaterThan(beginner.exercises.find((item) => item.id === 'squats').workSeconds);
  });

  it('changes goal selection, order and emphasis', () => {
    const plans = PROFILE_OPTIONS.goal.map((goal) => generateWorkoutPlan({ ...base, goal, time: 30, location: 'Outdoor' }));
    expect(new Set(plans.map((plan) => JSON.stringify(signature(plan)))).size).toBe(3);
    expect(ids(plans[1])).not.toContain('jumping-jacks');
    expect(plans[2].exercises[1].id).toBe('jumping-jacks');
    expect(plans[2].exercises[1].estimatedSeconds).toBeGreaterThan(plans[2].exercises.find((item) => item.id === 'plank').estimatedSeconds);
  });

  it('uses existing location to exclude wide and travelling movements', () => {
    const open = generateWorkoutPlan({ ...base, location: 'Campus', time: 45, level: 'Intermediate', goal: 'Support weight management' });
    const small = generateWorkoutPlan({ ...base, time: 45, level: 'Intermediate', goal: 'Support weight management' });
    expect(ids(open)).toContain('jumping-jacks');
    expect(ids(open)).toContain('lunges');
    expect(ids(small)).not.toContain('jumping-jacks');
    expect(ids(small)).not.toContain('lunges');
  });

  it.each([{}, { time: 'NaN' }, { time: -10 }, { time: Infinity }, { level: 'Advanced', equipment: 'unknown', location: 'unknown' }])('handles invalid legacy preferences %#', (profile) => {
    const plan = generateWorkoutPlan(profile);
    expect(plan.totalMinutes).toBe(20);
    expect(plan.exercises.every((item) => item.equipment === 'None' && item.minLevel === 'Beginner')).toBe(true);
  });

  it('normalizes legacy aliases and whitespace identically', () => {
    expect(generateWorkoutPlan({ fitnessLevel: ' intermediate ', availableMinutes: 30, goal: ' BUILD STRENGTH ', equipment: ' backpack ', location: ' gym ' }))
      .toEqual(generateWorkoutPlan({ level: 'Intermediate', time: 30, goal: 'Build strength', equipment: 'Backpack', location: 'Gym' }));
  });

  it('explains unsupported legacy equipment and never promises its use', () => {
    const plan = generateWorkoutPlan({ ...base, level: 'Intermediate', equipment: 'Dumbbells' });
    expect(plan.exercises.every((item) => item.equipment === 'None')).toBe(true);
    expect(plan.reasons.join(' ')).toContain('not supported yet');
  });

  it('fails closed if required catalogue entries are unavailable', () => {
    expect(() => recommendWorkout(base, [])).toThrow('suitable workout');
    expect(() => recommendWorkout(base, Object.values(EXERCISES).filter((item) => item.id !== 'warmup'))).toThrow('suitable workout');
  });
});
