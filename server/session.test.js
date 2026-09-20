import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionCookie, createSessionToken, readSessionUserId, setSessionCookie } from './session.js';

function response() {
  const headers = new Map();
  return {
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
  };
}

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-session-secret-that-is-longer-than-thirty-two-characters';
  delete process.env.VERCEL;
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.VERCEL;
});

describe('signed session cookies', () => {
  it('round-trips a valid signed user and rejects a modified token', () => {
    const token = createSessionToken('00000000-0000-4000-8000-000000000001');
    expect(readSessionUserId({ headers: { cookie: `bits_motion_session=${token}` } })).toBe('00000000-0000-4000-8000-000000000001');

    const modified = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    expect(readSessionUserId({ headers: { cookie: `bits_motion_session=${modified}` } })).toBeNull();
  });

  it('rejects an expired session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const token = createSessionToken('00000000-0000-4000-8000-000000000001');
    vi.setSystemTime(new Date('2026-02-02T00:00:00.000Z'));

    expect(readSessionUserId({ headers: { cookie: `bits_motion_session=${token}` } })).toBeNull();
  });

  it('uses HttpOnly, SameSite and production Secure attributes and clears the same cookie scope', () => {
    process.env.VERCEL = '1';
    const setResponse = response();
    setSessionCookie(setResponse, createSessionToken('00000000-0000-4000-8000-000000000001'));
    expect(setResponse.getHeader('set-cookie')).toContain('HttpOnly');
    expect(setResponse.getHeader('set-cookie')).toContain('SameSite=Lax');
    expect(setResponse.getHeader('set-cookie')).toContain('Secure');
    expect(setResponse.getHeader('set-cookie')).toContain('Path=/');

    const clearResponse = response();
    clearSessionCookie(clearResponse);
    expect(clearResponse.getHeader('set-cookie')).toContain('Max-Age=0');
    expect(clearResponse.getHeader('set-cookie')).toContain('Secure');
    expect(clearResponse.getHeader('set-cookie')).toContain('Path=/');
  });
});
