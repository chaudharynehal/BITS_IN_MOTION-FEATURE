import { describe, expect, it } from 'vitest';
import { planActivity } from './planActivity';

describe('plan continuation', () => {
  const plan = { createdAt: '2026-09-20T12:00:00Z', exercises: [{ id: 'squats', cameraSupported: true }, { id: 'plank' }, { id: 'pushups', cameraSupported: true }] };
  it('continues with the next unpracticed camera movement', () => {
    expect(planActivity(plan, [{ exerciseId: 'squats', reps: 3, completedAt: '2026-09-21T12:00:00Z' }]).nextExercise.id).toBe('pushups');
  });
  it('does not count zero-rep or older sessions as practice', () => {
    expect(planActivity(plan, [{ exerciseId: 'squats', reps: 0, completedAt: '2026-09-21T12:00:00Z' }, { exerciseId: 'squats', reps: 3, completedAt: '2026-09-19T12:00:00Z' }]).nextExercise.id).toBe('squats');
  });
});
