import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createJudgeDemoHistory,
  getProgressSummary,
  isGuestModeActive,
  loadGuestPlan,
  loadGuestProfile,
  loadGuestSessions,
  saveGuestPlan,
  saveGuestProfile,
  saveGuestSession,
  setGuestModeActive,
} from './storage';

let values;

beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  });
});

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('guest-only local persistence', () => {
  it('keeps the guest profile after a fresh read', () => {
    const profile = { displayName: 'Nehal', age: '20', height: '175', weight: '70' };
    expect(saveGuestProfile(profile)).toBe(true);
    expect(loadGuestProfile()).toEqual(profile);
  });

  it('keeps a generated guest plan without creating a workout session', () => {
    const plan = { id: 'guest-plan', title: '20-minute hostel workout', exercises: [] };
    expect(saveGuestPlan(plan)).toBe(true);
    expect(loadGuestPlan()).toEqual(plan);
    expect(loadGuestSessions()).toEqual([]);
  });

  it('remembers an intentional guest session separately from guest data', () => {
    expect(isGuestModeActive()).toBe(false);
    expect(setGuestModeActive(true)).toBe(true);
    expect(isGuestModeActive()).toBe(true);
    expect(setGuestModeActive(false)).toBe(true);
    expect(isGuestModeActive()).toBe(false);
  });

  it('keeps Judge Demo history separate from genuine guest sessions', () => {
    saveGuestSession({ id: 'real-1', completedAt: new Date().toISOString(), reps: 3, source: 'real' });
    const sample = createJudgeDemoHistory();
    const guestSessions = loadGuestSessions();

    expect(guestSessions).toHaveLength(1);
    expect(guestSessions[0].source).toBe('real');
    expect(sample).toHaveLength(3);
    expect(sample.every((session) => session.source === 'sample')).toBe(true);
  });
});

describe('saved progress totals', () => {
  it('shows an empty account without fabricated workouts or streaks', () => {
    expect(getProgressSummary([])).toEqual({ workouts: 0, reps: 0, weeklyActiveDays: 0, streak: 0 });
  });

  it('counts workouts separately from active days and keeps a streak through yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 21, 12));
    const sessions = [
      { completedAt: new Date(2026, 8, 20, 10).toISOString(), reps: 10 },
      { completedAt: new Date(2026, 8, 20, 18).toISOString(), reps: 5 },
      { completedAt: new Date(2026, 8, 19, 12).toISOString(), reps: 7 },
      { completedAt: new Date(2026, 8, 10, 12).toISOString(), reps: 3 },
    ];
    expect(getProgressSummary(sessions)).toEqual({ workouts: 4, reps: 25, weeklyActiveDays: 2, streak: 2 });
  });
});
