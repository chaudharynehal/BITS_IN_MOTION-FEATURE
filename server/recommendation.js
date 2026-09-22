import { recommendWorkout } from '../shared/recommendation.js';

export function buildPlan(profile, exerciseRows) {
  return recommendWorkout(profile, exerciseRows.map((row) => ({
    id: row.id, name: row.name, category: row.category, duration: row.duration_label,
    instruction: row.instruction, icon: row.icon, cameraSupported: row.camera_supported,
    detectionType: row.detection_type, met: Number(row.met),
    primaryMuscles: row.primary_muscles || [], secondaryMuscles: row.secondary_muscles || [],
    goalTags: row.goal_tags || [], minLevel: row.min_level || 'Beginner',
    equipment: row.equipment || 'None', impact: row.impact || 'low', active: row.active,
  })));
}
