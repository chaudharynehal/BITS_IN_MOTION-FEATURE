import { EXERCISES } from '../data/exercises';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function goalTag(goal) {
  if (goal.includes('strength') || goal.includes('muscle')) return 'strength';
  if (goal.includes('weight') || goal.includes('fat')) return 'weight-management';
  return 'stay-fit';
}

function canUse(exercise, { level, equipment, lowImpact, goal }) {
  const requiredLevel = normalize(exercise.minLevel || 'Beginner');
  if (requiredLevel === 'intermediate' && level !== 'intermediate') return false;
  if (normalize(exercise.equipment) !== 'none' && normalize(exercise.equipment) !== equipment) return false;
  if (lowImpact && exercise.impact === 'high') return false;
  return (exercise.goalTags || []).includes(goal);
}

export function generateWorkoutPlan(profile) {
  const level = normalize(profile.level);
  const location = normalize(profile.location);
  const equipment = normalize(profile.equipment);
  const goal = normalize(profile.goal);
  const minutes = Number(profile.time) || 20;
  const goalPreference = goalTag(goal);
  const preferences = { level, equipment, lowImpact: profile.lowImpact === true, goal: goalPreference };
  const catalogue = Object.values(EXERCISES);
  const compatible = catalogue.filter((exercise) => canUse(exercise, preferences));
  const choose = (...ids) => ids.map((id) => compatible.find((exercise) => exercise.id === id)).filter(Boolean);
  const cardio = profile.lowImpact ? 'marching' : 'jumping-jacks';
  const movementIds = goalPreference === 'strength'
    ? ['squats', 'pushups', minutes >= 30 && level === 'intermediate' && equipment !== 'none' ? 'rows' : 'crunches', 'plank']
    : goalPreference === 'weight-management'
      ? [cardio, 'squats', minutes >= 30 && level === 'intermediate' ? 'lunges' : 'plank']
      : ['squats', cardio, 'pushups', minutes >= 30 && level === 'intermediate' && equipment !== 'none' ? 'rows' : 'crunches', 'plank'];
  const exercises = [EXERCISES.warmup, ...choose(...movementIds), EXERCISES.cooldown];

  const reasons = [
    `${profile.level || 'Beginner'} pacing`,
    `${minutes} minutes`,
    `${profile.location || 'Hostel room'} friendly`,
    equipment === 'none' ? 'no equipment needed' : `uses ${profile.equipment}`,
    ...(profile.lowImpact ? ['low-impact movements preferred'] : []),
  ];

  let focus = 'Balanced movement for everyday fitness';
  if (goal.includes('strength') || goal.includes('muscle')) focus = 'A controlled full-body strength session';
  if (goal.includes('weight') || goal.includes('fat')) focus = 'A steady, joint-friendly conditioning session';

  return {
    id: `plan-${minutes}-${level || 'beginner'}`,
    title: `${minutes}-minute ${location.includes('hostel') ? 'hostel' : 'space-smart'} workout`,
    focus,
    reasons,
    exercises,
    totalMinutes: minutes,
  };
}
