export const APP_SCREENS = new Set([
  'dashboard',
  'workouts',
  'meal-scan',
  'plan',
  'coach',
  'self-guided',
  'result',
  'progress',
  'leaderboard',
  'profile',
  'features',
  'how-it-works',
  'terms',
  'privacy',
  'health-disclaimer',
  'preview',
]);

export const PUBLIC_SCREENS = new Set([
  'welcome',
  'leaderboard',
  'features',
  'how-it-works',
  'terms',
  'privacy',
  'health-disclaimer',
  'preview',
]);

export function screenFromHash(hash = '') {
  const route = hash.replace(/^#\/?/, '');
  return APP_SCREENS.has(route) ? route : null;
}

export function resolveRequestedScreen({ requested, activeAccount, profileComplete }) {
  if (!requested) return 'welcome';
  if (PUBLIC_SCREENS.has(requested)) return requested;
  if (!activeAccount) return 'welcome';
  if (requested === 'profile') return 'profile';
  return profileComplete ? requested : 'profile';
}

export function historyDepth(state) {
  return Number.isInteger(state?.bitsMotionDepth) ? state.bitsMotionDepth : 0;
}
