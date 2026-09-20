import { describe, expect, it } from 'vitest';
import { generateWorkoutPlan } from './workoutRecommendation';

const judgeProfile = {
  level: 'Beginner',
  goal: 'Stay fit',
  time: '20',
  location: 'Hostel room',
  equipment: 'None',
};

describe('workout recommendation rules', () => {
  it('creates the required 20-minute no-equipment judge plan', () => {
    const plan = generateWorkoutPlan(judgeProfile);
    expect(plan.totalMinutes).toBe(20);
    expect(plan.exercises.map((exercise) => exercise.name)).toEqual([
      'Mobility warm-up',
      'Bodyweight squats',
      'Jumping jacks',
      'Incline or knee push-ups',
      'Controlled crunches',
      'Supported plank',
      'Cooldown & breathing',
    ]);
    expect(plan.reasons).toContain('no equipment needed');
  });

  it('adds a suitable movement for a longer intermediate session', () => {
    const plan = generateWorkoutPlan({ ...judgeProfile, level: 'Intermediate', time: '30', equipment: 'Backpack' });
    expect(plan.exercises.some((exercise) => exercise.id === 'rows')).toBe(true);
    expect(plan.reasons).toContain('uses Backpack');
  });
});
