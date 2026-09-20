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
  };
}

export function buildPlan(profile, exerciseRows) {
  const byId = Object.fromEntries(exerciseRows.map((row) => [row.id, toExercise(row)]));
  const minutes = Number(profile.time || profile.availableMinutes) || 20;
  const level = String(profile.level || profile.fitnessLevel || 'Beginner');
  const equipment = String(profile.equipment || 'None');
  const location = String(profile.location || 'Hostel room');
  const ids = ['warmup', 'squats', 'jumping-jacks', 'pushups', 'crunches', 'plank', 'cooldown'];

  if (minutes >= 30 && level.toLowerCase() !== 'beginner') {
    ids.splice(5, 0, equipment === 'None' ? 'lunges' : 'rows');
  }

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
    ],
    exercises: ids.map((id) => byId[id]).filter(Boolean),
    totalMinutes: minutes,
  };
}
