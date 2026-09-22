// Pure shared rules; callers supply the local or active database catalogue.
const normalize = (value) => String(value || '').trim().toLowerCase();
const OPEN_SETTINGS = new Set(['campus', 'open indoor space', 'outdoor', 'gym']);
export const MOVEMENT_SPACE = Object.freeze({ 'jumping-jacks': 'open', lunges: 'open' });

// Targets already persist as text in plan_items. Restore structured timing from
// our versioned-by-format labels without changing old plans or database schema.
export function prescriptionFromLabel(label) {
  const intervals = /^(\d+) × (\d+)s work \/ (\d+)s recovery · (\d+) min$/.exec(label || '');
  if (intervals) return { sets: Number(intervals[1]), workSeconds: Number(intervals[2]), restSeconds: Number(intervals[3]), estimatedSeconds: Number(intervals[4]) * 60 };
  const minutes = /^(\d+) min$/.exec(label || '');
  return minutes ? { estimatedSeconds: Number(minutes[1]) * 60 } : {};
}

export function normalizePreferences(profile = {}) {
  const goal = normalize(profile.goal);
  const time = Number(profile.time || profile.availableMinutes);
  return {
    level: normalize(profile.level || profile.fitnessLevel) === 'intermediate' ? 'Intermediate' : 'Beginner',
    goal: goal.includes('strength') || goal.includes('muscle') ? 'strength' : goal.includes('weight') || goal.includes('fat') ? 'weight-management' : 'stay-fit',
    minutes: Number.isFinite(time) && time > 0 ? Math.max(5, Math.min(120, Math.round(time))) : 20,
    equipment: normalize(profile.equipment) === 'backpack' ? 'Backpack' : 'None',
    unsupportedEquipment: ['resistance band', 'dumbbells'].includes(normalize(profile.equipment)),
    openSpace: OPEN_SETTINGS.has(normalize(profile.location)),
    lowImpact: profile.lowImpact === true,
  };
}

export function isEligible(exercise, p) {
  return exercise.active !== false
    && (normalize(exercise.minLevel || 'Beginner') === 'beginner' || p.level === 'Intermediate' && normalize(exercise.minLevel) === 'intermediate')
    && (normalize(exercise.equipment || 'None') === 'none' || normalize(exercise.equipment) === normalize(p.equipment))
    && (!p.lowImpact || normalize(exercise.impact || 'low') === 'low')
    && (p.openSpace || (exercise.space || MOVEMENT_SPACE[exercise.id]) !== 'open');
}

export function recommendWorkout(profile = {}, catalogue = []) {
  const p = normalizePreferences(profile);
  const byId = new Map(catalogue.filter((item) => item && isEligible(item, p)).map(({ active, ...item }) => [item.id, item]));
  const eligible = [...byId.values()].filter((item) => !['warmup', 'cooldown'].includes(item.id) && item.goalTags?.includes(p.goal));
  const cardio = p.lowImpact || !p.openSpace ? 'marching' : 'jumping-jacks';
  // Bounded variation between equivalent core movements; same setup = same plan.
  const core = (Math.floor(p.minutes / 10) + (p.level === 'Intermediate' ? 1 : 0)) % 2 ? ['plank', 'crunches'] : ['crunches', 'plank'];
  const preference = p.goal === 'strength' ? ['squats', 'rows', 'pushups', 'lunges', ...core]
    : p.goal === 'weight-management' ? [cardio, 'squats', 'lunges', 'plank']
      : ['squats', cardio, 'rows', 'pushups', ...core];
  const rank = (item) => preference.indexOf(item.id) < 0 ? 100 : preference.indexOf(item.id);
  const candidates = eligible.filter((item) => item.category !== 'Cardio' || item.id === cardio)
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const warmupMinutes = Math.min(5, Math.max(1, Math.round(p.minutes * 0.1)));
  const cooldownMinutes = Math.min(5, Math.max(1, Math.round(p.minutes * 0.08)));
  const workMinutes = p.minutes - warmupMinutes - cooldownMinutes;
  const count = Math.min(workMinutes, p.minutes <= 10 ? 3 : p.minutes <= 20 ? 4 : p.minutes <= 30 ? 5 : candidates.length);
  const selected = candidates.slice(0, count);
  if (!byId.has('warmup') || !byId.has('cooldown') || !selected.length) throw new Error('A suitable workout could not be built from the available catalogue. Please try again later.');

  // Whole-minute intervals include recovery and position changes. The exact sum
  // matches chosen time; longer plans add intervals and eligible movements.
  const blocks = selected.map(() => 1);
  const weightedOrder = selected.flatMap((item, index) => {
    const emphasis = p.goal === 'weight-management' && item.category === 'Cardio' ? 3
      : p.goal === 'strength' && ['Upper body', 'Lower body'].includes(item.category) ? 2 : 1;
    return Array(emphasis).fill(index);
  });
  for (let minute = selected.length; minute < workMinutes; minute += 1) blocks[weightedOrder[(minute - selected.length) % weightedOrder.length]] += 1;
  const workSeconds = p.goal === 'strength' ? (p.level === 'Beginner' ? 20 : 30) : p.level === 'Beginner' ? 30 : p.goal === 'weight-management' ? 45 : 40;
  const timed = (exercise, minutes) => ({ ...exercise, duration: `${minutes} min`, estimatedSeconds: minutes * 60 });
  const exercises = [
    timed(byId.get('warmup'), warmupMinutes),
    ...selected.map((exercise, index) => ({ ...exercise,
      duration: `${blocks[index]} × ${workSeconds}s work / ${60 - workSeconds}s recovery · ${blocks[index]} min`,
      sets: blocks[index], workSeconds, restSeconds: 60 - workSeconds, estimatedSeconds: blocks[index] * 60,
    })),
    timed(byId.get('cooldown'), cooldownMinutes),
  ];
  const usesBackpack = selected.some((item) => normalize(item.equipment) === 'backpack');
  return {
    title: `${p.minutes}-minute ${p.openSpace ? 'open-space' : 'small-space'} workout`,
    focus: p.goal === 'strength' ? 'Controlled strength intervals with longer recovery'
      : p.goal === 'weight-management' ? 'Conditioning emphasis with supporting strength movements' : 'A balanced mix of lower body, upper body and conditioning',
    reasons: [
      `${p.level} pacing: ${workSeconds}s work per interval`,
      `${p.minutes} minutes including warm-up, recovery and cooldown`,
      p.openSpace ? 'Open space: stepping and wider movements are eligible' : 'Small space: no jumping or travelling lunges',
      usesBackpack ? 'uses Backpack' : p.unsupportedEquipment ? 'Bands and dumbbells are not supported yet; bodyweight plan'
        : p.equipment === 'Backpack' ? 'Bodyweight fits this goal and level; backpack not needed' : 'no equipment needed',
      ...(p.lowImpact ? ['low-impact movements preferred'] : []),
      'Repeat each movement’s intervals before moving on; recovery includes setup time',
    ],
    exercises, totalMinutes: p.minutes,
  };
}
