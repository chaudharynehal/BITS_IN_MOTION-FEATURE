export const SPACE_CLASSES = Object.freeze({
  COMPACT: 'COMPACT',
  STANDARD: 'STANDARD',
  OPEN: 'OPEN',
});

export function normalizeSpaceClass(location) {
  const loc = String(location || '').trim().toLowerCase();
  if (!loc) return SPACE_CLASSES.STANDARD;
  if (
    loc.includes('hostel') ||
    loc.includes('pg') ||
    loc.includes('dorm') ||
    loc.includes('compact') ||
    loc.includes('bedroom')
  ) {
    return SPACE_CLASSES.COMPACT;
  }
  if (
    loc.includes('open') ||
    loc.includes('gym') ||
    loc.includes('campus') ||
    loc.includes('outdoor') ||
    loc.includes('park') ||
    loc.includes('ground') ||
    loc.includes('yard')
  ) {
    return SPACE_CLASSES.OPEN;
  }
  return SPACE_CLASSES.STANDARD;
}

export const PROFILE_OPTIONS = {
  level: ['Beginner', 'Intermediate'],
  goal: ['Stay fit', 'Build strength', 'Support weight management'],
  time: ['10', '20', '30', '45', '60'],
  location: ['PG Room', 'Hostel', 'Home'],
  equipment: ['None', 'Dumbbell', 'Resistance Band', 'Backpack'],
};
export const LEGACY_LOCATIONS = [
  'Hostel room',
  'Open indoor space',
  'Open space / Gym',
  'Campus',
  'PG room',
  'Outdoor',
  'Gym',
  'Park / outdoor ground',
  'Campus gym',
];
export const LEGACY_EQUIPMENT = ['Resistance band', 'Dumbbells'];
export const LOCATION_LABELS = {
  'PG Room': 'PG Room',
  Hostel: 'Hostel',
  'Hostel room': 'Hostel / Dorm room (compact space)',
  Home: 'Home',
  'Open space / Gym': 'Open space / Gym (stepping & wider movements)',
  'Open indoor space': 'Open space / Gym (stepping & wider movements)',
  'PG room': 'PG room (compact space)',
  Campus: 'Campus (open space)',
  'Campus gym': 'Campus gym (open space)',
  Outdoor: 'Outdoor (open space)',
  'Park / outdoor ground': 'Outdoor / Park (open space)',
  Gym: 'Gym (open space)',
};

export const EQUIPMENT_LABELS = {
  None: 'None / Bodyweight',
  Dumbbell: 'Dumbbell',
  'Resistance Band': 'Resistance Band',
  Backpack: 'Backpack',
  'Resistance band': 'Resistance Band (previous selection)',
  Dumbbells: 'Dumbbells (previous selection)',
};

export function profileErrors(profile = {}) {
  const errors = {};
  const name = String(profile.displayName || '').trim();
  if (!name || name.length > 80) errors.displayName = 'Enter a preferred name between 1 and 80 characters.';
  for (const [field, min, max, label] of [['age', 16, 80, 'Age'], ['height', 120, 230, 'Height'], ['weight', 30, 250, 'Weight']]) {
    const value = Number(profile[field]);
    if (!Number.isFinite(value) || value < min || value > max) errors[field] = `${label} must be between ${min} and ${max}.`;
  }
  if (!Number.isInteger(Number(profile.age))) errors.age = 'Enter your age in whole years.';
  const time = Number(profile.time);
  if (!Number.isInteger(time) || time < 5 || time > 120) errors.time = 'Choose between 5 and 120 whole minutes.';
  for (const field of ['level', 'goal', 'location', 'equipment']) {
    const allowed = field === 'equipment'
      ? [...PROFILE_OPTIONS.equipment, ...LEGACY_EQUIPMENT]
      : field === 'location'
        ? [...PROFILE_OPTIONS.location, ...LEGACY_LOCATIONS]
        : PROFILE_OPTIONS[field];
    if (!allowed.includes(profile[field])) errors[field] = 'Please choose a valid option.';
  }
  if (profile.leaderboardOptIn && (!String(profile.leaderboardName || '').trim() || String(profile.leaderboardName).trim().length > 40)) errors.leaderboardName = 'Choose a public alias between 1 and 40 characters.';
  return errors;
}
