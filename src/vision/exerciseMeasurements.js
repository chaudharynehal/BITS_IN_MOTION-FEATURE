import { calculateAngle, calculateAngle3D, getBestKneeMeasurement } from './angle';

const SIDE_INDEXES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

const LOW_LIGHT_THRESHOLD = 0.12;

function poseInput(input) {
  if (Array.isArray(input)) {
    return { landmarks: input, worldLandmarks: null, frameBrightness: null };
  }
  return {
    landmarks: input?.landmarks,
    worldLandmarks: input?.worldLandmarks || null,
    frameBrightness: input?.frameBrightness ?? null,
  };
}

function landmarkConfidence(point) {
  if (!point) return 0;
  const scores = [point.visibility, point.presence].filter(Number.isFinite);
  return scores.length ? Math.min(...scores) : 0;
}

function minimumVisibility(landmarks, indexes) {
  const points = indexes.map((index) => landmarks?.[index]);
  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map(landmarkConfidence));
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

function distance3D(a, b) {
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)) : 0;
}

function lowLight(frameBrightness) {
  return Number.isFinite(frameBrightness) && frameBrightness < LOW_LIGHT_THRESHOLD;
}

function framingForPoints(points, {
  floor = false,
  frameBrightness = null,
  requiredReason = 'full-body',
  minSpan = 0.22,
  overheadRoom = false,
} = {}) {
  const existing = points.filter(Boolean);
  if (!existing.length) return lowLight(frameBrightness) ? 'improve-lighting' : 'no-person';
  if (lowLight(frameBrightness)) return 'improve-lighting';
  if (existing.some((point) => landmarkConfidence(point) < 0.35)) return requiredReason;
  const xs = existing.map((point) => point.x);
  const ys = existing.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (Math.max(width, height) < minSpan) return 'move-closer';
  if (overheadRoom && Math.min(...ys) < 0.055) return 'overhead-room';
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

export function measureSquat(input, minVisibility = 0.6) {
  const { landmarks, frameBrightness } = poseInput(input);
  const measurement = getBestKneeMeasurement(landmarks, minVisibility);
  const indexes = measurement.side ? SIDE_INDEXES[measurement.side] : SIDE_INDEXES.left;
  const framingReason = framingForPoints(
    [landmarks?.[indexes.shoulder], landmarks?.[indexes.hip], landmarks?.[indexes.knee], landmarks?.[indexes.ankle]],
    { frameBrightness, requiredReason: 'full-body' },
  );
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

export function measurePushup(input, minVisibility = 0.55) {
  const { landmarks, frameBrightness } = poseInput(input);
  const side = bestSide(landmarks, ['shoulder', 'elbow', 'wrist', 'hip', 'ankle']);
  const points = side.indexes;
  const elbowAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.elbow], landmarks?.[points.wrist]);
  const bodyAngle = calculateAngle(landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.ankle]);
  const framingReason = framingForPoints(
    [landmarks?.[points.shoulder], landmarks?.[points.hip], landmarks?.[points.ankle]],
    { floor: true, frameBrightness, requiredReason: 'full-body' },
  );
  return {
    valid: side.visibility >= minVisibility && elbowAngle !== null && bodyAngle !== null && bodyAngle >= 150 && framingReason === 'ready',
    visibility: side.visibility,
    side: side.side,
    primaryValue: elbowAngle,
    bodyAngle,
    metricLabel: 'Elbow angle',
    metricUnit: '°',
    framingReason,
  };
}

export function measureCrunch(input, minVisibility = 0.55) {
  const { landmarks, worldLandmarks, frameBrightness } = poseInput(input);
  const side = bestSide(landmarks, ['shoulder', 'hip', 'knee']);
  const points = side.indexes;
  const shoulder = landmarks?.[points.shoulder];
  const hip = landmarks?.[points.hip];
  const knee = landmarks?.[points.knee];
  const worldShoulder = worldLandmarks?.[points.shoulder];
  const worldHip = worldLandmarks?.[points.hip];
  const worldKnee = worldLandmarks?.[points.knee];
  const imageAngle = calculateAngle(shoulder, hip, knee);
  const worldAngle = calculateAngle3D(worldShoulder, worldHip, worldKnee);
  const torsoAngle = imageAngle ?? worldAngle;
  const hipKneeDistance = distance(landmarks?.[points.hip], landmarks?.[points.knee]);
  const shoulderHipDistance = distance(shoulder, hip);
  const shoulderKneeDistance = distance(shoulder, knee);
  const worldHipKneeDistance = distance3D(worldHip, worldKnee);
  const framingReason = framingForPoints(
    [shoulder, hip, knee],
    { floor: true, frameBrightness, requiredReason: 'key-joints', minSpan: 0.18 },
  );
  return {
    valid: side.visibility >= minVisibility && torsoAngle !== null && hipKneeDistance > 0.035 && framingReason === 'ready',
    visibility: side.visibility,
    side: side.side,
    primaryValue: torsoAngle,
    imageAngle,
    worldAngle,
    shoulderKneeRatio: hipKneeDistance ? shoulderKneeDistance / hipKneeDistance : 0,
    torsoCompression: hipKneeDistance ? shoulderHipDistance / hipKneeDistance : 0,
    shoulderLift: hipKneeDistance ? (hip.y - shoulder.y) / hipKneeDistance : 0,
    worldTorsoCompression: worldHipKneeDistance ? distance3D(worldShoulder, worldHip) / worldHipKneeDistance : 0,
    metricLabel: 'Torso angle',
    metricUnit: '°',
    framingReason,
  };
}

export function measureJumpingJack(input, minVisibility = 0.55) {
  const { landmarks, frameBrightness } = poseInput(input);
  const required = [11, 12, 15, 16, 23, 24, 27, 28];
  const visibility = minimumVisibility(landmarks, required);
  const shoulderWidth = distance(landmarks?.[11], landmarks?.[12]);
  const ankleWidth = distance(landmarks?.[27], landmarks?.[28]);
  const feetRatio = shoulderWidth ? ankleWidth / shoulderWidth : 0;
  const armsOpen = Boolean(landmarks?.[15] && landmarks?.[16] && landmarks?.[11] && landmarks?.[12]
    && landmarks[15].y < landmarks[11].y && landmarks[16].y < landmarks[12].y);
  const armsClosed = Boolean(landmarks?.[15] && landmarks?.[16] && landmarks?.[23] && landmarks?.[24]
    && landmarks[15].y > landmarks[23].y - 0.05 && landmarks[16].y > landmarks[24].y - 0.05);
  const framingReason = framingForPoints(required.map((index) => landmarks?.[index]), {
    frameBrightness,
    requiredReason: 'full-body',
    overheadRoom: true,
  });
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

export function measureExercise(exerciseId, input) {
  if (exerciseId === 'pushups') return measurePushup(input);
  if (exerciseId === 'crunches') return measureCrunch(input);
  if (exerciseId === 'jumping-jacks') return measureJumpingJack(input);
  return measureSquat(input);
}
