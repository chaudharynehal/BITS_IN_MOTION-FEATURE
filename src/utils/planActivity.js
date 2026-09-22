export function planActivity(plan, sessions = []) {
  const practicedIds = new Set(sessions.filter((session) => Number(session.reps) > 0
    && plan?.createdAt && new Date(session.completedAt) >= new Date(plan.createdAt)).map((session) => session.exerciseId));
  const cameraExercises = plan?.exercises?.filter((exercise) => exercise.cameraSupported) || [];
  return {
    practicedIds, cameraExercises,
    nextExercise: cameraExercises.find((exercise) => !practicedIds.has(exercise.id)) || cameraExercises[0],
  };
}
