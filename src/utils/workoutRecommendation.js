import { EXERCISES } from '../data/exercises';

const DEMO_EXERCISES = [
  EXERCISES.warmup,
  EXERCISES.squats,
  EXERCISES.jumpingJacks,
  EXERCISES.pushups,
  EXERCISES.crunches,
  EXERCISES.plank,
  EXERCISES.cooldown,
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function generateWorkoutPlan(profile) {
  const level = normalize(profile.level);
  const location = normalize(profile.location);
  const equipment = normalize(profile.equipment);
  const goal = normalize(profile.goal);
  const minutes = Number(profile.time) || 20;

  const exercises = [...DEMO_EXERCISES];

  if (minutes >= 30 && level !== 'beginner') {
    exercises.splice(4, 0, equipment === 'none' ? EXERCISES.lunges : EXERCISES.rows);
  }

  const reasons = [
    `${profile.level || 'Beginner'} pacing`,
    `${minutes} minutes`,
    `${profile.location || 'Hostel room'} friendly`,
    equipment === 'none' ? 'no equipment needed' : `uses ${profile.equipment}`,
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
