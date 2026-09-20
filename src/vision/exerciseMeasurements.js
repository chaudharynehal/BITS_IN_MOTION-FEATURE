import { calculateAngle, getBestKneeMeasurement } from './angle';

const SIDE_INDEXES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

function minimumVisibility(landmarks, indexes) {
  const points = indexes.map((index) => landmarks?.[index]);
  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

function bestSide(landmarks, keys) {
  const scores = Object.entries(SIDE_INDEXES).map(([side, indexes]) => ({
    side,
    indexes,
    visibility: minimumVisibility(landmarks, keys.map((key) => indexes[key])),
  }));
  return scores.sort((a, b) => b.visibility - a.visibility)[0];
}

function distance(a, b) {
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

export function measureSquat(landmarks, minVisibility = 0.6) {
  const measurement = getBestKneeMeasurement(landmarks, minVisibility);
  return {
    valid: measurement.valid,
    visibility: measurement.visibility,
    side: measurement.side,
    primaryValue: measurement.angle,
    metricLabel: 'Knee angle',
    metricUnit: '°',
  };
}

export function measurePushup(landmarks, minVisibility = 0.55) {
  const side = bestSide(landmarks, ['shoulder', 'elbow', 'wrist', 'hip', 'ankle']);
  const points = side.indexes;
  const elbowAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.elbow], landmarks?.[points.wrist]);
  const bodyAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.ankle]);
  return {
    valid: side.visibility >= minVisibility && elbowAngle !== null && bodyAngle !== null,
    visibility: side.visibility,
    side: side.side,
    primaryValue: elbowAngle,
    bodyAngle,
    metricLabel: 'Elbow angle',
    metricUnit: '°',
  };
}

export function measureCrunch(landmarks, minVisibility = 0.55) {
  const side = bestSide(landmarks, ['shoulder', 'hip', 'knee']);
  const points = side.indexes;
  const torsoAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.knee]);
  return {
    valid: side.visibility >= minVisibility && torsoAngle !== null,
    visibility: side.visibility,
    side: side.side,
    primaryValue: torsoAngle,
    metricLabel: 'Torso angle',
    metricUnit: '°',
  };
}

export function measureJumpingJack(landmarks, minVisibility = 0.55) {
  const required = [11, 12, 15, 16, 23, 24, 27, 28];
  const visibility = minimumVisibility(landmarks, required);
  const shoulderWidth = distance(landmarks?.[11], landmarks?.[12]);
  const ankleWidth = distance(landmarks?.[27], landmarks?.[28]);
  const feetRatio = shoulderWidth ? ankleWidth / shoulderWidth : 0;
  const armsOpen = Boolean(landmarks?.[15] && landmarks?.[16] && landmarks?.[11] && landmarks?.[12]
    && landmarks[15].y < landmarks[11].y && landmarks[16].y < landmarks[12].y);
  const armsClosed = Boolean(landmarks?.[15] && landmarks?.[16] && landmarks?.[23] && landmarks?.[24]
    && landmarks[15].y > landmarks[23].y - 0.05 && landmarks[16].y > landmarks[24].y - 0.05);
  return {
    valid: visibility >= minVisibility && shoulderWidth > 0.02,
    visibility,
    primaryValue: Math.round(feetRatio * 100) / 100,
    feetRatio,
    armsOpen,
    armsClosed,
    metricLabel: 'Stance width',
    metricUnit: '×',
  };
}

export function measureExercise(exerciseId, landmarks) {
  if (exerciseId === 'pushups') return measurePushup(landmarks);
  if (exerciseId === 'crunches') return measureCrunch(landmarks);
  if (exerciseId === 'jumping-jacks') return measureJumpingJack(landmarks);
  return measureSquat(landmarks);
}
