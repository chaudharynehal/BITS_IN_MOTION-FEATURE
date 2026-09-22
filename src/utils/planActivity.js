export function planActivity(plan, sessions = []) {
  const practicedIds = new Set(sessions.filter((session) => {
    if (!plan?.createdAt || new Date(session.completedAt) < new Date(plan.createdAt)) return false;
    if (session.source === 'self-guided') return (Number(session.durationSeconds) || 0) > 0;
    return Number(session.reps) > 0;
  }).map((session) => session.exerciseId));
  const cameraExercises = plan?.exercises?.filter((exercise) => exercise.cameraSupported) || [];
  const allExercises = plan?.exercises || [];
  return {
    practicedIds,
    cameraExercises,
    allExercises,
    nextExercise: cameraExercises.find((exercise) => !practicedIds.has(exercise.id)) || cameraExercises[0],
    nextAnyExercise: allExercises.find((exercise) => !practicedIds.has(exercise.id)) || allExercises[0],
  };
}
