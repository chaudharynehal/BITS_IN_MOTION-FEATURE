export function createCycleCounter(overrides = {}) {
  const config = {
    startState: 'start',
    targetState: 'target',
    minVisibility: 0.55,
    stableFrames: 4,
    stableDurationMs: 120,
    minRepIntervalMs: 700,
    ...overrides,
  };
  let phase = 'finding-start';
  let reps = 0;
  let candidate = null;
  let candidateFrames = 0;
  let candidateSince = 0;
  let lastRepAt = -Infinity;
  let reachedTarget = false;

  function clearCandidate() {
    candidate = null;
    candidateFrames = 0;
    candidateSince = 0;
  }

  function update({ classification, visibility = 1, timestamp = performance.now() }) {
    if (!classification || classification === 'invalid' || visibility < config.minVisibility) {
      clearCandidate();
      return { reps, phase, event: 'invalid', classification: 'invalid' };
    }
    if (classification === 'transition') {
      clearCandidate();
      return { reps, phase: phase === config.targetState ? 'returning' : 'moving', event: null, classification };
    }
    if (classification !== config.startState && classification !== config.targetState) {
      clearCandidate();
      return { reps, phase, event: null, classification };
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
    if (classification === config.startState && phase === 'finding-start') {
      phase = config.startState;
      event = 'ready';
    } else if (classification === config.targetState && phase === config.startState) {
      phase = config.targetState;
      reachedTarget = true;
      event = 'target';
    } else if (classification === config.startState && phase === config.targetState && reachedTarget) {
      phase = config.startState;
      reachedTarget = false;
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
    phase = 'finding-start';
    reps = 0;
    lastRepAt = -Infinity;
    reachedTarget = false;
    clearCandidate();
    return snapshot();
  }

  function snapshot() {
    return { reps, phase };
  }

  return { update, reset, snapshot, config };
}
