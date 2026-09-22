import { normalizeSpaceClass, SPACE_CLASSES } from './profile.js';

export function getCircuitRounds(minutes) {
  const m = Number(minutes) || 20;
  if (m >= 55) return 8;
  if (m >= 40) return 6;
  if (m >= 25) return 4;
  if (m >= 15) return 2;
  return 1;
}

export function calculateWorkoutDuration(plan) {
  if (!plan?.exercises?.length) return 0;
  const warmup = plan.exercises.find((e) => e.id === 'warmup');
  const cooldown = plan.exercises.find((e) => e.id === 'cooldown');
  const stations = plan.exercises.filter((e) => !['warmup', 'cooldown'].includes(e.id));
  const rounds = plan.rounds || getCircuitRounds(plan.totalMinutes);
  const warmupSeconds = warmup?.estimatedSeconds || 0;
  const cooldownSeconds = cooldown?.estimatedSeconds || 0;
  const stationSeconds = stations.reduce((sum, s) => sum + (s.estimatedSeconds || 0), 0);
  const roundBreakSeconds = rounds > 1 ? (rounds - 1) * (plan.roundBreakSeconds ?? 60) : 0;
  return warmupSeconds + stationSeconds + roundBreakSeconds + cooldownSeconds;
}

// Pure shared rules; callers supply the local or active database catalogue.
const normalize = (value) => String(value || '').trim().toLowerCase();
// Compact student rooms avoid travel and wide arm/leg patterns. Home and
// legacy open-space choices can use the wider catalogue movements.
export const MOVEMENT_SPACE = Object.freeze({ 'jumping-jacks': 'standard', lunges: 'standard' });

// Targets already persist as text in plan_items. Restore structured timing from
// our versioned-by-format labels without changing old plans or database schema.
export function prescriptionFromLabel(label) {
  const roundMatch = /^(\d+) rds × (\d+) \((\d+)s work \/ (\d+)s recovery\) · (\d+) min$/.exec(label || '');
  if (roundMatch) {
    return {
      rounds: Number(roundMatch[1]),
      setsPerRound: Number(roundMatch[2]),
      sets: Number(roundMatch[5]),
      workSeconds: Number(roundMatch[3]),
      restSeconds: Number(roundMatch[4]),
      estimatedSeconds: Number(roundMatch[5]) * 60,
    };
  }
  const intervals = /^(\d+) × (\d+)s work \/ (\d+)s recovery · (\d+) min$/.exec(label || '');
  if (intervals) return { sets: Number(intervals[1]), workSeconds: Number(intervals[2]), restSeconds: Number(intervals[3]), estimatedSeconds: Number(intervals[4]) * 60 };
  const minutes = /^(\d+) min$/.exec(label || '');
  return minutes ? { estimatedSeconds: Number(minutes[1]) * 60 } : {};
}

export function normalizePreferences(profile = {}) {
  const goal = normalize(profile.goal);
  const location = normalize(profile.location);
  const requestedEquipment = normalize(profile.equipment);
  const time = Number(profile.time || profile.availableMinutes);
  const spaceClass = normalizeSpaceClass(profile.location);
  const isCompact = spaceClass === SPACE_CLASSES.COMPACT;
  const isOpen = spaceClass === SPACE_CLASSES.OPEN;
  const equipment = requestedEquipment === 'backpack'
    ? 'Backpack'
    : requestedEquipment === 'dumbbell' || requestedEquipment === 'dumbbells'
      ? 'Dumbbell'
      : requestedEquipment === 'resistance band'
        ? 'Resistance Band'
        : 'None';
  return {
    level: normalize(profile.level || profile.fitnessLevel) === 'intermediate' ? 'Intermediate' : 'Beginner',
    goal: goal.includes('strength') || goal.includes('muscle') ? 'strength' : goal.includes('weight') || goal.includes('fat') ? 'weight-management' : 'stay-fit',
    minutes: Number.isFinite(time) && time > 0 ? Math.max(5, Math.min(120, Math.round(time))) : 20,
    equipment,
    unsupportedEquipment: ['Resistance Band', 'Dumbbell'].includes(equipment),
    equipmentFallback: ['Resistance Band', 'Dumbbell'].includes(equipment) ? equipment : null,
    openSpace: isOpen || location === 'home',
    compactSpace: isCompact,
    spaceLabel: location.includes('pg') ? 'PG Room' : location.includes('hostel') || location.includes('dorm') ? 'Hostel' : location === 'home' ? 'Home' : isOpen ? 'Open space' : 'Room',
    lowImpact: profile.lowImpact === true,
  };
}

export function isEligible(exercise, p) {
  const exerciseEquipment = normalize(exercise.equipment || 'None');
  const bodyweight = exerciseEquipment === 'none';
  return exercise.active !== false
    && (normalize(exercise.minLevel || 'Beginner') === 'beginner' || p.level === 'Intermediate' && normalize(exercise.minLevel) === 'intermediate')
    && (bodyweight || exerciseEquipment === normalize(p.equipment))
    && (!p.lowImpact || normalize(exercise.impact || 'low') === 'low')
    && (p.openSpace || !(exercise.space || MOVEMENT_SPACE[exercise.id]));
}

export function recommendWorkout(profile = {}, catalogue = []) {
  const p = normalizePreferences(profile);
  const byId = new Map(catalogue.filter((item) => item && isEligible(item, p)).map(({ active, ...item }) => [item.id, item]));
  const eligible = [...byId.values()].filter((item) => !['warmup', 'cooldown'].includes(item.id) && item.goalTags?.includes(p.goal));
  const cardio = p.lowImpact || !p.openSpace ? 'marching' : 'jumping-jacks';
  // Bounded variation between equivalent core movements; same setup = same plan.
  const core = (Math.floor(p.minutes / 10) + (p.level === 'Intermediate' ? 1 : 0)) % 2 ? ['plank', 'crunches'] : ['crunches', 'plank'];
  const preference = p.goal === 'strength'
    ? ['squats', 'rows', 'pushups', 'lunges', ...core]
    : p.goal === 'weight-management'
      ? [cardio, 'squats', 'pushups', 'crunches', 'lunges', 'plank']
      : ['squats', cardio, 'rows', 'pushups', ...core];
  const rank = (item) => preference.indexOf(item.id) < 0 ? 100 : preference.indexOf(item.id);
  const candidates = eligible.filter((item) => item.category !== 'Cardio' || item.id === cardio)
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));

  if (!byId.has('warmup') || !byId.has('cooldown') || !candidates.length) {
    throw new Error('A suitable workout could not be built from the available catalogue. Please try again later.');
  }

  const rounds = getCircuitRounds(p.minutes);
  const roundBreakSeconds = 60;
  const roundRecoveriesMinutes = rounds > 1 ? rounds - 1 : 0;

  // Station count: 10m has 3 stations, 20m has 4 stations, 30m+ has 5 stations.
  const count = Math.min(candidates.length, p.minutes <= 10 ? 3 : p.minutes <= 20 ? 4 : 5);
  const selected = candidates.slice(0, count);

  const activeCircuitMinutes = selected.length * rounds;
  const circuitTotalMinutes = activeCircuitMinutes + roundRecoveriesMinutes;
  const remainingMinutes = Math.max(2, p.minutes - circuitTotalMinutes);

  const warmupMinutes = Math.max(1, Math.ceil(remainingMinutes / 2));
  const cooldownMinutes = Math.max(1, remainingMinutes - warmupMinutes);

  const workSeconds = p.goal === 'strength'
    ? (p.level === 'Beginner' ? 20 : 30)
    : p.level === 'Beginner' ? 30 : p.goal === 'weight-management' ? 45 : 40;
  const restSeconds = 60 - workSeconds;

  const timed = (exercise, minutes) => ({ ...exercise, duration: `${minutes} min`, estimatedSeconds: minutes * 60 });
  const exercises = [
    timed(byId.get('warmup'), warmupMinutes),
    ...selected.map((exercise) => {
      const setsPerRound = 1;
      const totalSets = rounds;
      const duration = rounds > 1
        ? `${rounds} rds × 1 (${workSeconds}s work / ${restSeconds}s recovery) · ${rounds} min`
        : `1 × ${workSeconds}s work / ${restSeconds}s recovery · 1 min`;
      return {
        ...exercise,
        sets: totalSets,
        rounds,
        setsPerRound,
        workSeconds,
        restSeconds,
        duration,
        estimatedSeconds: totalSets * 60,
      };
    }),
    timed(byId.get('cooldown'), cooldownMinutes),
  ];

  const usesBackpack = selected.some((item) => normalize(item.equipment) === 'backpack');
  const replacedJumpingJacksForSpace = !p.openSpace && !p.lowImpact && cardio === 'marching';

  const reasons = [
    `${p.level} pacing: ${workSeconds}s work / ${restSeconds}s recovery intervals`,
    `${p.minutes} minutes including warm-up, recovery and cooldown`,
    replacedJumpingJacksForSpace
      ? `Jumping jacks replaced with marching to fit your ${p.spaceLabel}`
      : p.openSpace
        ? `${p.spaceLabel}: wider movements are eligible when impact preference allows`
        : `${p.spaceLabel}: compact, low-travel movements only`,
    usesBackpack
      ? 'uses Backpack'
      : p.unsupportedEquipment
        ? `${p.equipmentFallback} movements are not in the current catalogue yet; using supported bodyweight movements`
        : p.equipment === 'Backpack'
          ? 'Bodyweight fits this goal and level; backpack not needed'
          : 'no equipment needed',
    ...(p.lowImpact ? ['low-impact movements preferred'] : []),
    rounds > 1
      ? `${rounds}-round circuit: cycle through ${selected.length} movements across ${rounds} rounds to build endurance without local muscle burnout`
      : 'Repeat each movement’s intervals before moving on; recovery includes setup time',
  ];

  return {
    title: `${p.minutes}-minute ${p.openSpace ? 'flexible-space' : 'small-space'} ${rounds > 1 ? `${rounds}-round circuit` : 'workout'}`,
    focus: p.goal === 'strength'
      ? 'Controlled strength intervals with longer recovery'
      : p.goal === 'weight-management'
        ? 'Conditioning emphasis with supporting strength movements'
        : 'A balanced mix of lower body, upper body and conditioning',
    rounds,
    circuitStations: selected.length,
    roundBreakSeconds,
    roundRecoveriesMinutes,
    warmupMinutes,
    cooldownMinutes,
    activeCircuitMinutes,
    reasons,
    exercises,
    totalMinutes: p.minutes,
  };
}
