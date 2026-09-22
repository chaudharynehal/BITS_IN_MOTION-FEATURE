import { EXERCISES } from '../data/exercises';

function getExercise(exerciseId) {
  return Object.values(EXERCISES).find((exercise) => exercise.id === exerciseId) || EXERCISES.squats;
}

export function buildWorkoutImpact({ exerciseId, reps, durationSeconds, cueCounts = {} }) {
  const exercise = getExercise(exerciseId);
  const frequentCue = Object.entries(cueCounts)
    .filter(([key]) => !['ready', 'great-rep'].includes(key))
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const cueText = {
    framing: 'Camera framing was the most frequent reminder.',
    lower: 'Reaching the configured movement depth was the most frequent reminder.',
    'body-line': 'Torso alignment was the most frequent visible reminder.',
    'curl-more': 'Curling through the configured range was the most frequent reminder.',
    wider: 'Opening the arms and stance together was the most frequent reminder.',
  }[frequentCue];

  return {
    primaryMuscles: exercise.primaryMuscles || [],
    secondaryMuscles: exercise.secondaryMuscles || [],
    movementSummary: reps > 0
      ? `${reps} complete repetitions of ${exercise.name.toLowerCase()} were observed across ${Math.max(1, Math.round(durationSeconds / 60))} minute${durationSeconds >= 90 ? 's' : ''}.`
      : `Completed ${exercise.name.toLowerCase()} session across ${Math.max(1, Math.round(durationSeconds / 60))} minute${durationSeconds >= 90 ? 's' : ''}.`,
    coachingSummary: cueText || (reps === 0 ? 'Consistent self-guided effort sustained through the session.' : 'No repeated movement correction dominated this session.'),
    disclaimer: 'This describes the movements completed and muscle groups commonly involved; it does not measure internal body changes or provide medical assessment.',
  };
}
