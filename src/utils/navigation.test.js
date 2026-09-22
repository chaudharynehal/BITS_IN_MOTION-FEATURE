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

  it('allows visitors and unauthenticated users to access public informational screens and anonymous preview', () => {
    expect(resolveRequestedScreen({ requested: 'features', activeAccount: false, profileComplete: false })).toBe('features');
    expect(resolveRequestedScreen({ requested: 'how-it-works', activeAccount: false, profileComplete: false })).toBe('how-it-works');
    expect(resolveRequestedScreen({ requested: 'terms', activeAccount: false, profileComplete: false })).toBe('terms');
    expect(resolveRequestedScreen({ requested: 'preview', activeAccount: false, profileComplete: false })).toBe('preview');
  });

  it('allows a completed account to open normal app screens', () => {
    expect(resolveRequestedScreen({ requested: 'coach', activeAccount: true, profileComplete: true })).toBe('coach');
    expect(resolveRequestedScreen({ requested: 'progress', activeAccount: true, profileComplete: true })).toBe('progress');
  });

  it('recognizes every hash-backed screen, including workout results and new public screens', () => {
    expect(screenFromHash('#/workouts')).toBe('workouts');
    expect(screenFromHash('#result')).toBe('result');
    expect(screenFromHash('#features')).toBe('features');
    expect(screenFromHash('#/how-it-works')).toBe('how-it-works');
    expect(screenFromHash('#terms')).toBe('terms');
    expect(screenFromHash('#preview')).toBe('preview');
    expect(screenFromHash('#/preview')).toBe('preview');
    expect(screenFromHash('#unknown')).toBeNull();
  });

  it('uses only app-owned history depth markers', () => {
    expect(historyDepth({ bitsMotionDepth: 2 })).toBe(2);
    expect(historyDepth({})).toBe(0);
    expect(historyDepth(null)).toBe(0);
  });
});
