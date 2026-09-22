import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('API failure handling', () => {
  it('bounds a stalled network request and gives a retryable message', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const request = api.latestPlan();
    const assertion = expect(request).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves authentication status and mutation protection', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Sign in required.', code: 'AUTH_REQUIRED' }) });
    vi.stubGlobal('fetch', fetch);
    await expect(api.saveSession({ reps: 3 })).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin', method: 'POST', headers: { 'X-Bits-Motion-Request': '1' } });
  });
});
