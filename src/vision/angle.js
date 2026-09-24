const toDegrees = (radians) => radians * (180 / Math.PI);

export function calculateAngle(pointA, vertex, pointC) {
  if (![pointA, vertex, pointC].every(Boolean)) return null;

  const vectorA = { x: pointA.x - vertex.x, y: pointA.y - vertex.y };
  const vectorC = { x: pointC.x - vertex.x, y: pointC.y - vertex.y };
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y);
  const magnitudeC = Math.hypot(vectorC.x, vectorC.y);

  if (!magnitudeA || !magnitudeC) return null;

  const cosine = (vectorA.x * vectorC.x + vectorA.y * vectorC.y) / (magnitudeA * magnitudeC);
  return Math.round(toDegrees(Math.acos(Math.min(1, Math.max(-1, cosine)))) * 10) / 10;
}

export function calculateAngle3D(pointA, vertex, pointC) {
  if (![pointA, vertex, pointC].every(Boolean)) return null;

  const vectorA = { x: pointA.x - vertex.x, y: pointA.y - vertex.y, z: (pointA.z ?? 0) - (vertex.z ?? 0) };
  const vectorC = { x: pointC.x - vertex.x, y: pointC.y - vertex.y, z: (pointC.z ?? 0) - (vertex.z ?? 0) };
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y, vectorA.z);
  const magnitudeC = Math.hypot(vectorC.x, vectorC.y, vectorC.z);

  if (!magnitudeA || !magnitudeC) return null;

  const cosine = (vectorA.x * vectorC.x + vectorA.y * vectorC.y + vectorA.z * vectorC.z) / (magnitudeA * magnitudeC);
  return Math.round(toDegrees(Math.acos(Math.min(1, Math.max(-1, cosine)))) * 10) / 10;
}

const SIDES = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
};

function sideVisibility(landmarks, side) {
  const indexes = Object.values(SIDES[side]);
  const points = indexes.map((index) => landmarks?.[index]);
  if (points.some((point) => !point)) return 0;
  return Math.min(...points.map((point) => point.visibility ?? 0));
}

export function getBestKneeMeasurement(landmarks, visibilityThreshold = 0.6, preferredSide = null, preferenceThreshold = 0.45) {
  if (!Array.isArray(landmarks) || landmarks.length < 29) {
    return { valid: false, angle: null, side: null, visibility: 0 };
  }

  const leftVisibility = sideVisibility(landmarks, 'left');
  const rightVisibility = sideVisibility(landmarks, 'right');

  let side = leftVisibility >= rightVisibility ? 'left' : 'right';
  if (preferredSide === 'left' && leftVisibility >= preferenceThreshold) side = 'left';
  if (preferredSide === 'right' && rightVisibility >= preferenceThreshold) side = 'right';

  const visibility = side === 'left' ? leftVisibility : rightVisibility;

  if (visibility < visibilityThreshold) {
    return { valid: false, angle: null, side, visibility };
  }

  const indexes = SIDES[side];
  const angle = calculateAngle(landmarks[indexes.hip], landmarks[indexes.knee], landmarks[indexes.ankle]);
  return { valid: angle !== null, angle, side, visibility };
}
