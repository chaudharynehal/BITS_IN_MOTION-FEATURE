async function request(action, options = {}) {
  const query = new URLSearchParams({ action, ...(options.query || {}) });
  const method = options.method || 'GET';
  const headers = method === 'GET' ? undefined : {
    'X-Bits-Motion-Request': '1',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  let payload;
  try {
    response = await fetch(`/api?${query}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    payload = await response.json();
  } catch (error) {
    throw new Error(controller.signal.aborted ? 'The request timed out. Check your connection and try again.'
      : error instanceof SyntaxError ? 'The server response could not be read. Please try again.'
        : 'Unable to connect. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const error = new Error(payload.error || 'The request could not be completed.');
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}

export const api = {
  status: () => request('status'),
  me: () => request('me'),
  signInWithGoogle: (credential) => request('auth-google', { method: 'POST', body: { credential } }),
  signOut: () => request('logout', { method: 'POST' }),
  saveProfile: (profile) => request('profile', { method: 'PUT', body: profile }),
  generatePlan: () => request('plan', { method: 'POST' }),
  latestPlan: () => request('plan'),
  sessions: (query) => request('sessions', { query }),
  sessionsSummary: () => request('sessions-summary'),
  saveSession: (session) => request('sessions', { method: 'POST', body: session }),
  leaderboard: (period = 'week') => request('leaderboard', { query: { period } }),
};
