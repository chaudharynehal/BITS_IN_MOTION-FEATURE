// Simple single-person pose selection for the live Camera Coach pipeline.
//
// This intentionally replaces the frame-to-frame continuity tracker in the live
// loop. Continuity scoring (center/scale deltas) drops poses during fast, large
// movements such as jumping jacks, which caused every frame to be rejected as
// "no person". We only ever coach one person, so we pick the most credible pose
// each frame and never drop a genuine pose because it moved quickly.

const CORE_JOINTS = [11, 12, 23, 24]; // shoulders + hips

function confidence(point) {
  if (!point) return 0;
  const scores = [point.visibility, point.presence].filter(Number.isFinite);
  return scores.length ? Math.min(...scores) : 0;
}

/**
 * Pick the primary human pose from MediaPipe's (possibly multi-pose) output.
 * @returns {{ landmarks: Array, worldLandmarks: Array|null, index: number }|null}
 */
export function selectPrimaryPose(landmarkSets = [], worldLandmarkSets = []) {
  if (!Array.isArray(landmarkSets) || landmarkSets.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;
  let bestIndex = -1;

  landmarkSets.forEach((landmarks, index) => {
    if (!Array.isArray(landmarks) || landmarks.length === 0) return;
    const core = CORE_JOINTS.map((jointIndex) => landmarks[jointIndex]);
    const visibility = core.reduce((sum, point) => sum + confidence(point), 0) / CORE_JOINTS.length;
    const present = core.filter(Boolean);
    const xs = present.map((point) => point.x);
    const ys = present.map((point) => point.y);
    const area = present.length
      ? (Math.max(...xs) - Math.min(...xs) + 0.01) * (Math.max(...ys) - Math.min(...ys) + 0.01)
      : 0;
    const score = visibility * 0.7 + area * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = landmarks;
      bestIndex = index;
    }
  });

  if (!best) return null;
  return {
    landmarks: best,
    worldLandmarks: worldLandmarkSets?.[bestIndex] || null,
    index: bestIndex,
  };
}
