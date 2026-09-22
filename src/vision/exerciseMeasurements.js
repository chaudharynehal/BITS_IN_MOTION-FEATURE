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

function framingForPoints(points, { floor = false } = {}) {
  const existing = points.filter(Boolean);
  if (!existing.length) return 'no-person';
  if (existing.some((point) => (point.visibility ?? 0) < 0.35)) return 'full-body';
  const xs = existing.map((point) => point.x);
  const ys = existing.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (Math.max(width, height) < 0.22) return 'move-closer';
  if (Math.min(...xs, ...ys) < 0.025 || Math.max(...xs, ...ys) > 0.975) return 'move-farther';
  if (floor && existing.length >= 3) {
    const shoulder = existing[0];
    const lowerBody = existing[2];
    const horizontal = Math.abs(shoulder.x - lowerBody.x);
    const vertical = Math.abs(shoulder.y - lowerBody.y);
    if (horizontal < vertical * 0.55) return 'adjust-angle';
  }
  return 'ready';
}

export function measureSquat(landmarks, minVisibility = 0.6) {
  const measurement = getBestKneeMeasurement(landmarks, minVisibility);
  const indexes = measurement.side ? SIDE_INDEXES[measurement.side] : SIDE_INDEXES.left;
  const framingReason = framingForPoints([landmarks?.[indexes.shoulder], landmarks?.[indexes.hip], landmarks?.[indexes.knee], landmarks?.[indexes.ankle]]);
  return {
    valid: measurement.valid && framingReason === 'ready',
    visibility: measurement.visibility,
    side: measurement.side,
    primaryValue: measurement.angle,
    metricLabel: 'Knee angle',
    metricUnit: '°',
    framingReason,
  };
}

export function measurePushup(landmarks, minVisibility = 0.55) {
  const side = bestSide(landmarks, ['shoulder', 'elbow', 'wrist', 'hip', 'ankle']);
  const points = side.indexes;
  const elbowAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.elbow], landmarks?.[points.wrist]);
  const bodyAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.ankle]);
  const framingReason = framingForPoints([landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.ankle]], { floor: true });
  return {
    valid: side.visibility >= minVisibility && elbowAngle !== null && bodyAngle !== null && framingReason === 'ready',
    visibility: side.visibility,
    side: side.side,
    primaryValue: elbowAngle,
    bodyAngle,
    metricLabel: 'Elbow angle',
    metricUnit: '°',
    framingReason,
  };
}

export function measureCrunch(landmarks, minVisibility = 0.55) {
  const side = bestSide(landmarks, ['shoulder', 'hip', 'knee']);
  const points = side.indexes;
  const torsoAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.knee]);
  const hipKneeDistance = distance(landmarks?.[points.hip], landmarks?.[points.knee]);
  const framingReason = framingForPoints([landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.knee], landmarks?.[points.ankle]], { floor: true });
  return {
    valid: side.visibility >= minVisibility && torsoAngle !== null && framingReason === 'ready',
    visibility: side.visibility,
    side: side.side,
    primaryValue: torsoAngle,
    shoulderKneeRatio: hipKneeDistance ? distance(landmarks?.[points.shoulder], landmarks?.[points.knee]) / hipKneeDistance : 0,
    metricLabel: 'Torso angle',
    metricUnit: '°',
    framingReason,
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
  const framingReason = framingForPoints(required.map((index) => landmarks?.[index]));
  return {
    valid: visibility >= minVisibility && shoulderWidth > 0.02 && framingReason === 'ready',
    visibility,
    primaryValue: Math.round(feetRatio * 100) / 100,
    feetRatio,
    armsOpen,
    armsClosed,
    metricLabel: 'Stance width',
    metricUnit: '×',
    framingReason,
  };
}

export function measureExercise(exerciseId, landmarks) {
  if (exerciseId === 'pushups') return measurePushup(landmarks);
  if (exerciseId === 'crunches') return measureCrunch(landmarks);
  if (exerciseId === 'jumping-jacks') return measureJumpingJack(landmarks);
  return measureSquat(landmarks);
}
