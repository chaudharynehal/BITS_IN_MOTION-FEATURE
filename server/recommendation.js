function toExercise(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    duration: row.duration_label,
    instruction: row.instruction,
    icon: row.icon,
    cameraSupported: row.camera_supported,
    detectionType: row.detection_type,
    met: Number(row.met),
    primaryMuscles: row.primary_muscles || [],
    secondaryMuscles: row.secondary_muscles || [],
    goalTags: row.goal_tags || [],
    minLevel: row.min_level || 'Beginner',
    equipment: row.equipment || 'None',
    impact: row.impact || 'low',
  };
}

function goalTag(goal) {
  const normalized = String(goal || '').toLowerCase();
  if (normalized.includes('strength') || normalized.includes('muscle')) return 'strength';
  if (normalized.includes('weight') || normalized.includes('fat')) return 'weight-management';
  return 'stay-fit';
}

function canUse(exercise, { level, equipment, lowImpact, goal }) {
  if (String(exercise.minLevel).toLowerCase() === 'intermediate' && String(level).toLowerCase() !== 'intermediate') return false;
  if (String(exercise.equipment).toLowerCase() !== 'none' && String(exercise.equipment).toLowerCase() !== String(equipment).toLowerCase()) return false;
  if (lowImpact && exercise.impact === 'high') return false;
  return exercise.goalTags.includes(goal);
}

export function buildPlan(profile, exerciseRows) {
  const byId = Object.fromEntries(exerciseRows.map((row) => [row.id, toExercise(row)]));
  const minutes = Number(profile.time || profile.availableMinutes) || 20;
  const level = String(profile.level || profile.fitnessLevel || 'Beginner');
  const equipment = String(profile.equipment || 'None');
  const location = String(profile.location || 'Hostel room');
  const goal = goalTag(profile.goal);
  const lowImpact = profile.lowImpact === true;
  const compatible = Object.values(byId).filter((exercise) => canUse(exercise, { level, equipment, lowImpact, goal }));
  const choose = (...ids) => ids.map((id) => compatible.find((exercise) => exercise.id === id)).filter(Boolean);
  const cardio = lowImpact ? 'marching' : 'jumping-jacks';
  const ids = goal === 'strength'
    ? ['warmup', 'squats', 'pushups', minutes >= 30 && String(level).toLowerCase() === 'intermediate' && String(equipment).toLowerCase() !== 'none' ? 'rows' : 'crunches', 'plank', 'cooldown']
    : goal === 'weight-management'
      ? ['warmup', cardio, 'squats', minutes >= 30 && String(level).toLowerCase() === 'intermediate' ? 'lunges' : 'plank', 'cooldown']
      : ['warmup', 'squats', cardio, 'pushups', minutes >= 30 && String(level).toLowerCase() === 'intermediate' && String(equipment).toLowerCase() !== 'none' ? 'rows' : 'crunches', 'plank', 'cooldown'];

  return {
    title: `${minutes}-minute ${location.toLowerCase().includes('hostel') ? 'hostel' : 'space-smart'} workout`,
    focus: String(profile.goal || '').toLowerCase().includes('strength')
      ? 'A controlled full-body strength session'
      : String(profile.goal || '').toLowerCase().includes('weight')
        ? 'A steady full-body conditioning session'
        : 'Balanced movement for everyday fitness',
    reasons: [
      `${level} pacing`,
      `${minutes} minutes`,
      `${location} friendly`,
      equipment.toLowerCase() === 'none' ? 'no equipment needed' : `uses ${equipment}`,
      ...(lowImpact ? ['low-impact movements preferred'] : []),
    ],
    exercises: ids.filter((id) => id === 'warmup' || id === 'cooldown').map((id) => byId[id]).filter(Boolean).length
      ? [byId.warmup, ...choose(...ids.filter((id) => !['warmup', 'cooldown'].includes(id))), byId.cooldown].filter(Boolean)
      : choose(...ids),
    totalMinutes: minutes,
  };
}
