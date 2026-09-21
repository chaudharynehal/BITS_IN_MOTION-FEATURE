import { describe, expect, it } from 'vitest';
import { historyDepth, resolveRequestedScreen, screenFromHash } from './navigation';

describe('application navigation', () => {
  it('keeps the public homepage reachable for an incomplete active account', () => {
    expect(resolveRequestedScreen({ requested: null, activeAccount: true, profileComplete: false })).toBe('welcome');
  });

  it('gates only protected screens behind profile completion', () => {
    expect(resolveRequestedScreen({ requested: 'dashboard', activeAccount: true, profileComplete: false })).toBe('profile');
    expect(resolveRequestedScreen({ requested: 'leaderboard', activeAccount: false, profileComplete: false })).toBe('leaderboard');
    expect(resolveRequestedScreen({ requested: 'profile', activeAccount: true, profileComplete: false })).toBe('profile');
  });

  it('allows a completed account to open normal app screens', () => {
    expect(resolveRequestedScreen({ requested: 'coach', activeAccount: true, profileComplete: true })).toBe('coach');
    expect(resolveRequestedScreen({ requested: 'progress', activeAccount: true, profileComplete: true })).toBe('progress');
  });

  it('recognizes every hash-backed screen, including workout results', () => {
    expect(screenFromHash('#/workouts')).toBe('workouts');
    expect(screenFromHash('#result')).toBe('result');
    expect(screenFromHash('#unknown')).toBeNull();
  });

  it('uses only app-owned history depth markers', () => {
    expect(historyDepth({ bitsMotionDepth: 2 })).toBe(2);
    expect(historyDepth({})).toBe(0);
    expect(historyDepth(null)).toBe(0);
  });
});
