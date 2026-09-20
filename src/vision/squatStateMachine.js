export const SQUAT_CONFIG = Object.freeze({
  standingAngle: 160,
  downAngle: 110,
  shallowCueAngle: 145,
  minVisibility: 0.6,
  stableFrames: 4,
  stableDurationMs: 120,
  minRepIntervalMs: 800,
});

function classifyAngle(angle, config) {
  if (angle >= config.standingAngle) return 'standing';
  if (angle <= config.downAngle) return 'down';
  return 'transition';
}

export function createSquatCounter(overrides = {}) {
  const config = { ...SQUAT_CONFIG, ...overrides };
  let phase = 'finding-standing';
  let reps = 0;
  let candidate = null;
  let candidateFrames = 0;
  let candidateSince = 0;
  let lastRepAt = -Infinity;
  let hasReachedDown = false;

  function clearCandidate() {
    candidate = null;
    candidateFrames = 0;
    candidateSince = 0;
  }

  function update({ angle, visibility = 1, timestamp = performance.now() }) {
    if (!Number.isFinite(angle) || visibility < config.minVisibility) {
      clearCandidate();
      return { reps, phase, event: 'invalid', classification: 'invalid' };
    }

    const classification = classifyAngle(angle, config);
    if (classification === 'transition') {
      clearCandidate();
      const movementStage = phase === 'down' ? 'rising' : phase === 'standing' ? 'lowering' : phase;
      return { reps, phase: movementStage, event: null, classification };
    }

    if (candidate !== classification) {
      candidate = classification;
      candidateFrames = 1;
      candidateSince = timestamp;
    } else {
      candidateFrames += 1;
    }

    const stable = candidateFrames >= config.stableFrames && timestamp - candidateSince >= config.stableDurationMs;
    if (!stable) return { reps, phase, event: null, classification };

    let event = null;
    if (classification === 'standing' && phase === 'finding-standing') {
      phase = 'standing';
      event = 'ready';
    } else if (classification === 'down' && phase === 'standing') {
      phase = 'down';
      hasReachedDown = true;
      event = 'depth';
    } else if (classification === 'standing' && phase === 'down' && hasReachedDown) {
      phase = 'standing';
      hasReachedDown = false;
      if (timestamp - lastRepAt >= config.minRepIntervalMs) {
        reps += 1;
        lastRepAt = timestamp;
        event = 'rep';
      }
    }

    clearCandidate();
    return { reps, phase, event, classification };
  }

  function reset() {
    phase = 'finding-standing';
    reps = 0;
    lastRepAt = -Infinity;
    hasReachedDown = false;
    clearCandidate();
    return snapshot();
  }

  function snapshot() {
    return { reps, phase };
  }

  return { update, reset, snapshot, config };
}
