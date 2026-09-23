const TRACK_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28];

function confidence(point) {
  if (!point) return 0;
  const scores = [point.visibility, point.presence].filter(Number.isFinite);
  return scores.length ? Math.min(...scores) : 0;
}

export function describePose(landmarks, minConfidence = 0.35) {
  if (!Array.isArray(landmarks)) return null;
  const visible = TRACK_LANDMARKS
    .map((index) => landmarks[index])
    .filter((point) => confidence(point) >= minConfidence);

  if (visible.length < 3) return null;

  const xs = visible.map((point) => point.x);
  const ys = visible.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height, 0.05);
  const visibility = visible.reduce((sum, point) => sum + confidence(point), 0) / visible.length;

  return {
    center: {
      x: visible.reduce((sum, point) => sum + point.x, 0) / visible.length,
      y: visible.reduce((sum, point) => sum + point.y, 0) / visible.length,
    },
    scale,
    visibleCount: visible.length,
    visibility,
    quality: visibility * 0.7 + (visible.length / TRACK_LANDMARKS.length) * 0.3,
  };
}

function continuityScore(previous, next) {
  const centerDistance = Math.hypot(previous.center.x - next.center.x, previous.center.y - next.center.y);
  const normalizedCenter = centerDistance / Math.max(previous.scale, next.scale, 0.08);
  const scaleDelta = Math.abs(previous.scale - next.scale) / Math.max(previous.scale, 0.08);
  const qualityBonus = Math.max(0, next.quality - 0.7) * 0.15;
  return normalizedCenter + scaleDelta * 0.45 - qualityBonus;
}

function candidateFrom(landmarks, worldLandmarks, index, minConfidence) {
  const signature = describePose(landmarks, minConfidence);
  if (!signature) return null;
  return { index, landmarks, worldLandmarks, signature };
}

function sameAcquisitionCandidate(a, b, threshold) {
  if (!a || !b) return false;
  return continuityScore(a.signature, b.signature) <= threshold;
}

export function createSubjectTracker(overrides = {}) {
  const config = {
    minConfidence: 0.35,
    minStableFrames: 3,
    lostFrameLimit: 12,
    matchThreshold: 0.95,
    continuousThreshold: 0.38,
    switchThreshold: 0.22,
    acquisitionThreshold: 0.8,
    ...overrides,
  };

  let track = null;
  let pending = null;
  let pendingFrames = 0;
  let lostFrames = 0;

  function acquire(candidates) {
    const next = candidates[0];
    if (!next) return null;

    if (sameAcquisitionCandidate(pending, next, config.acquisitionThreshold)) {
      pendingFrames += 1;
    } else {
      pending = next;
      pendingFrames = 1;
    }

    if (pendingFrames >= config.minStableFrames) {
      track = {
        signature: pending.signature,
        index: pending.index,
      };
      lostFrames = 0;
    }

    return {
      index: pending.index,
      landmarks: pending.landmarks,
      worldLandmarks: pending.worldLandmarks,
      locked: Boolean(track),
      reacquiring: !track,
    };
  }

  function update(landmarkSets = [], worldLandmarkSets = []) {
    const candidates = landmarkSets
      .map((landmarks, index) => candidateFrom(landmarks, worldLandmarkSets?.[index], index, config.minConfidence))
      .filter(Boolean);

    if (!candidates.length) {
      lostFrames += 1;
      pending = null;
      pendingFrames = 0;
      if (lostFrames > config.lostFrameLimit) track = null;
      return null;
    }

    if (track) {
      const scored = candidates
        .map((candidate) => ({ candidate, score: continuityScore(track.signature, candidate.signature) }))
        .sort((a, b) => a.score - b.score);
      const match = scored[0];
      if (match && match.score <= config.matchThreshold) {
        if (match.score > config.continuousThreshold
          || (match.candidate.index !== track.index && match.score > config.switchThreshold)) {
          lostFrames += 1;
          if (lostFrames <= config.lostFrameLimit) return null;
          track = null;
          pending = null;
          pendingFrames = 0;
        } else {
          track = {
            signature: match.candidate.signature,
            index: match.candidate.index,
          };
          lostFrames = 0;
          pending = null;
          pendingFrames = 0;
          return {
            index: match.candidate.index,
            landmarks: match.candidate.landmarks,
            worldLandmarks: match.candidate.worldLandmarks,
            locked: true,
            reacquiring: false,
          };
        }
      }

      lostFrames += 1;
      if (lostFrames <= config.lostFrameLimit) return null;
      track = null;
      pending = null;
      pendingFrames = 0;
    }

    lostFrames = 0;
    return acquire(candidates);
  }

  function reset() {
    track = null;
    pending = null;
    pendingFrames = 0;
    lostFrames = 0;
  }

  function snapshot() {
    return {
      locked: Boolean(track),
      pendingFrames,
      lostFrames,
      index: track?.index ?? pending?.index ?? null,
    };
  }

  return { update, reset, snapshot, config };
}
