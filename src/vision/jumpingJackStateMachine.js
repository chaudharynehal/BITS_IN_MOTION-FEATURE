export const JUMPING_JACK_CONFIG = Object.freeze({
  minFeetRatioOpen: 1.6,
  maxFeetRatioClosed: 1.25, // More forgiving than 1.15
  minimumFeetRange: 0.35,
  minVisibility: 0.58,
  stableDurationMs: 120,
  minOpenDurationMs: 50,
  minRepDurationMs: 400,
  maxRepDurationMs: 8000,
  minRepIntervalMs: 500,
  lostResetMs: 1200,
});

export function createJumpingJackCounter(overrides = {}) {
  const config = { ...JUMPING_JACK_CONFIG, ...overrides };
  let phase = 'finding-start';
  let reps = 0;
  let candidate = null;
  let candidateSince = 0;
  let baselineFeetRatio = null;
  let movementStartedAt = null;
  let openAt = null;
  let maxFeetRatio = null;
  let lastRepAt = -Infinity;
  let missingSince = null;

  function clearCandidate() {
    candidate = null;
    candidateSince = 0;
  }

  function clearMovement() {
    phase = 'finding-start';
    baselineFeetRatio = null;
    movementStartedAt = null;
    openAt = null;
    maxFeetRatio = null;
    clearCandidate();
  }

  function updateMaximums(feetRatio) {
    if (feetRatio === null) return;
    maxFeetRatio = maxFeetRatio === null ? feetRatio : Math.max(maxFeetRatio, feetRatio);
  }

  function calibrateBaseline(feetRatio) {
    if (feetRatio === null) return;
    baselineFeetRatio = baselineFeetRatio === null ? feetRatio : Math.min(baselineFeetRatio, feetRatio);
  }

  function hasStartedOpening(feetRatio, armsOpen) {
    if (baselineFeetRatio === null || feetRatio === null) return false;
    return (feetRatio - baselineFeetRatio >= 0.15) || armsOpen;
  }

  function hasFullOpen(feetRatio, armsOpen) {
    if (baselineFeetRatio === null || feetRatio === null || !armsOpen) return false;
    const ratioRange = feetRatio - baselineFeetRatio;
    if (ratioRange < config.minimumFeetRange) return false;
    return feetRatio >= config.minFeetRatioOpen || (feetRatio >= config.minFeetRatioOpen - 0.2 && ratioRange >= config.minimumFeetRange);
  }

  function hasReturnedToClosed(feetRatio, armsClosed) {
    if (feetRatio === null || !armsClosed) return false;
    if (feetRatio <= config.maxFeetRatioClosed) return true;
    if (baselineFeetRatio !== null && feetRatio <= baselineFeetRatio + 0.15) return true;
    return false;
  }

  function classificationFor(feetRatio, armsOpen, armsClosed) {
    if (baselineFeetRatio === null) {
      return (armsClosed && feetRatio <= config.maxFeetRatioClosed) ? 'closed' : 'transition';
    }
    if (hasReturnedToClosed(feetRatio, armsClosed)) return 'closed';
    if (hasFullOpen(feetRatio, armsOpen)) return 'open';
    return 'transition';
  }

  function update({ feetRatio, armsOpen, armsClosed, visibility = 1, timestamp = performance.now() }) {
    if (!Number.isFinite(feetRatio) || visibility < config.minVisibility) {
      if (missingSince === null) missingSince = timestamp;
      clearCandidate();
      if (timestamp - missingSince >= config.lostResetMs) clearMovement();
      return { reps, phase, event: 'invalid', classification: 'invalid' };
    }
    missingSince = null;

    const classification = classificationFor(feetRatio, armsOpen, armsClosed);

    if (classification === 'transition') {
      clearCandidate();
      if ((phase === 'closed' || phase === 'moving') && hasStartedOpening(feetRatio, armsOpen)) {
        if (movementStartedAt === null) movementStartedAt = timestamp;
        phase = 'moving';
        updateMaximums(feetRatio);
      } else if (phase === 'open' || phase === 'returning') {
        phase = 'returning';
        updateMaximums(feetRatio);
      }
      return { reps, phase, event: null, classification };
    }

    if (candidate !== classification) {
      candidate = classification;
      candidateSince = timestamp;
    }

    const stable = timestamp - candidateSince >= config.stableDurationMs;
    if (!stable) return { reps, phase, event: null, classification };

    let event = null;
    if (classification === 'closed') {
      if (phase === 'finding-start') {
        phase = 'closed';
        calibrateBaseline(feetRatio);
        event = 'ready';
      } else if (phase === 'closed') {
        calibrateBaseline(feetRatio);
      } else if (phase === 'moving') {
        phase = 'closed';
        calibrateBaseline(feetRatio);
        movementStartedAt = null;
        openAt = null;
        maxFeetRatio = null;
      } else if (phase === 'open' || phase === 'returning') {
        const repDuration = movementStartedAt === null ? 0 : timestamp - movementStartedAt;
        const openDuration = openAt === null ? 0 : timestamp - openAt;
        const completedRange = baselineFeetRatio === null || maxFeetRatio === null ? 0 : maxFeetRatio - baselineFeetRatio;
        
        phase = 'closed';
        calibrateBaseline(feetRatio);
        movementStartedAt = null;
        openAt = null;
        maxFeetRatio = null;

        if (
          completedRange >= config.minimumFeetRange
          && openDuration >= config.minOpenDurationMs
          && repDuration >= config.minRepDurationMs
          && repDuration <= config.maxRepDurationMs
          && timestamp - lastRepAt >= config.minRepIntervalMs
        ) {
          reps += 1;
          lastRepAt = timestamp;
          event = 'rep';
        }
      }
    } else if (classification === 'open' && (phase === 'closed' || phase === 'moving')) {
      if (movementStartedAt === null) movementStartedAt = timestamp;
      phase = 'open';
      openAt = timestamp;
      updateMaximums(feetRatio);
      event = 'target';
    } else if (classification === 'open' && phase === 'open') {
      updateMaximums(feetRatio);
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
