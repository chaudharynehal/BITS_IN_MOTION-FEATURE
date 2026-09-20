export const SQUAT_SESSION_MET = 3.8;

export const EXERCISE_MET = Object.freeze({
  squats: 5,
  pushups: 3.8,
  crunches: 3.8,
  'jumping-jacks': 8,
});

export function getExerciseMet(exerciseId) {
  return EXERCISE_MET[exerciseId] || SQUAT_SESSION_MET;
}

export function estimateCalories({ weightKg, durationSeconds, met = SQUAT_SESSION_MET }) {
  const weight = Number(weightKg);
  const seconds = Number(durationSeconds);

  if (!Number.isFinite(weight) || !Number.isFinite(seconds) || weight <= 0 || seconds <= 0) {
    return 0;
  }

  return Math.round(met * weight * (seconds / 3600) * 10) / 10;
}
