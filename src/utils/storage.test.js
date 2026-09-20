import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJudgeDemoHistory, loadGuestProfile, loadGuestSessions, saveGuestProfile, saveGuestSession } from './storage';

let values;

beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('guest-only local persistence', () => {
  it('keeps the guest profile after a fresh read', () => {
    const profile = { age: '20', height: '175', weight: '70' };
    expect(saveGuestProfile(profile)).toBe(true);
    expect(loadGuestProfile()).toEqual(profile);
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
