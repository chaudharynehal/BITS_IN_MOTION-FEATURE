export const CRUNCH_CONFIG = Object.freeze({
  extendedAngle: 138,
  curledAngle: 105,
  minimumRange: 28,
  minVisibility: 0.58,
  stableFrames: 4,
  stableDurationMs: 140,
  minRepDurationMs: 450,
  maxRepDurationMs: 8000,
  minRepIntervalMs: 900,
  lostResetMs: 1200,
});

// Crunches need stronger safeguards than a generic two-threshold counter. A
// valid repetition must establish an extended baseline, demonstrate meaningful
// range of motion, hold the flexed position, and return under visibility.
export function createCrunchCounter(overrides = {}) {
  const config = { ...CRUNCH_CONFIG, ...overrides };
  let phase = 'finding-start';
  let reps = 0;
  let candidate = null;
  let candidateFrames = 0;
  let candidateSince = 0;
  let extendedBaseline = null;
  let flexedAt = null;
  let lastRepAt = -Infinity;
  let missingSince = null;

  function clearCandidate() {
    candidate = null;
    candidateFrames = 0;
    candidateSince = 0;
  }

  function clearMovement() {
    phase = 'finding-start';
    extendedBaseline = null;
    flexedAt = null;
    clearCandidate();
  }

  function classificationFor(angle) {
    if (angle >= config.extendedAngle) return 'extended';
    if (angle <= config.curledAngle) return 'curled';
    return 'transition';
  }

  function update({ angle, visibility = 1, timestamp = performance.now() }) {
    if (!Number.isFinite(angle) || visibility < config.minVisibility) {
      if (missingSince === null) missingSince = timestamp;
      clearCandidate();
      if (timestamp - missingSince >= config.lostResetMs) clearMovement();
      return { reps, phase, event: 'invalid', classification: 'invalid' };
    }
    missingSince = null;

    const classification = classificationFor(angle);
    if (classification === 'transition') {
      clearCandidate();
      return {
        reps,
        phase: phase === 'flexed' ? 'returning' : phase === 'extended' ? 'moving' : phase,
        event: null,
        classification,
      };
    }

    if (candidate !== classification) {
      candidate = classification;
      candidateFrames = 1;
      candidateSince = timestamp;
    } else {
      candidateFrames += 1;
    }

    const stable = candidateFrames >= config.stableFrames
      && timestamp - candidateSince >= config.stableDurationMs;
    if (!stable) return { reps, phase, event: null, classification };

    let event = null;
    if (classification === 'extended') {
      if (phase === 'finding-start') {
        phase = 'extended';
        extendedBaseline = angle;
        event = 'ready';
      } else if (phase === 'extended') {
        extendedBaseline = Math.max(extendedBaseline ?? angle, angle);
      } else if (phase === 'flexed') {
        const duration = flexedAt === null ? 0 : timestamp - flexedAt;
        phase = 'extended';
        extendedBaseline = angle;
        flexedAt = null;
        if (
          duration >= config.minRepDurationMs
          && duration <= config.maxRepDurationMs
          && timestamp - lastRepAt >= config.minRepIntervalMs
        ) {
          reps += 1;
          lastRepAt = timestamp;
          event = 'rep';
        }
      }
    } else if (
      classification === 'curled'
      && phase === 'extended'
      && extendedBaseline !== null
      && extendedBaseline - angle >= config.minimumRange
    ) {
      phase = 'flexed';
      flexedAt = timestamp;
      event = 'target';
    }

    clearCandidate();
    return { reps, phase, event, classification };
  }

  function reset() {
    reps = 0;
    lastRepAt = -Infinity;
    missingSince = null;
    clearMovement();
    return snapshot();
  }

  function snapshot() {
    return { reps, phase };
  }

  return { update, reset, snapshot, config };
}
