import { EXERCISES } from '../data/exercises.js';
import { recommendWorkout } from '../../shared/recommendation.js';

export function generateWorkoutPlan(profile) {
  return recommendWorkout(profile, Object.values(EXERCISES));
}
