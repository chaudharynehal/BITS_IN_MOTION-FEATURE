export const PUSHUP_CONFIG = Object.freeze({
  topAngle: 155,
  bottomAngle: 100,
  softBottomAngle: 120,
  minimumRange: 35,
  lowerStartRange: 15,
  minVisibility: 0.58,
  stableDurationMs: 140,
  minBottomDurationMs: 50,
  minRepDurationMs: 350,
  maxRepDurationMs: 8000,
  minRepIntervalMs: 600,
  lostResetMs: 1200,
});

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

export function createPushupCounter(overrides = {}) {
  const config = { ...PUSHUP_CONFIG, ...overrides };
  let phase = 'finding-start';
  let reps = 0;
  let candidate = null;
  let candidateSince = 0;
  let baselineAngle = null;
  let movementStartedAt = null;
  let bottomAt = null;
  let minAngle = null;
  let lastRepAt = -Infinity;
  let missingSince = null;

  function clearCandidate() {
    candidate = null;
    candidateSince = 0;
  }

  function clearMovement() {
    phase = 'finding-start';
    baselineAngle = null;
    movementStartedAt = null;
    bottomAt = null;
    minAngle = null;
    clearCandidate();
  }

  function updateMinimums(angle) {
    if (angle === null) return;
    minAngle = minAngle === null ? angle : Math.min(minAngle, angle);
  }

  function calibrateBaseline(angle) {
    if (angle === null) return;
    baselineAngle = baselineAngle === null ? angle : Math.max(baselineAngle, angle);
  }

  function hasStartedLowering(angle) {
    if (baselineAngle === null || angle === null) return false;
    return baselineAngle - angle >= config.lowerStartRange;
  }

  function hasFullDepth(angle) {
    if (baselineAngle === null || angle === null) return false;
    const angleRange = baselineAngle - angle;
    if (angleRange < config.minimumRange) return false;
    return angle <= config.softBottomAngle;
  }

  function hasReturnedToTop(angle) {
    if (angle === null) return false;
    // Must return to a reasonable top angle, and close to personal baseline
    if (angle < config.topAngle) return false;
    if (baselineAngle !== null && angle >= baselineAngle - 15) return true;
    return angle >= config.topAngle;
  }

  function classificationFor(angle) {
    if (baselineAngle === null) {
      return angle >= 140 ? 'top' : 'transition';
    }
    if (hasReturnedToTop(angle)) return 'top';
    if (hasFullDepth(angle)) return 'bottom';
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
      if ((phase === 'top' || phase === 'moving') && hasStartedLowering(angle)) {
        if (movementStartedAt === null) movementStartedAt = timestamp;
        phase = 'moving';
        updateMinimums(angle);
      } else if (phase === 'bottom' || phase === 'returning') {
        phase = 'returning';
        updateMinimums(angle);
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
    if (classification === 'top') {
      if (phase === 'finding-start') {
        phase = 'top';
        calibrateBaseline(angle);
        event = 'ready';
      } else if (phase === 'top') {
        calibrateBaseline(angle);
      } else if (phase === 'moving') {
        phase = 'top';
        calibrateBaseline(angle);
        movementStartedAt = null;
        bottomAt = null;
        minAngle = null;
      } else if (phase === 'bottom' || phase === 'returning') {
        const repDuration = movementStartedAt === null ? 0 : timestamp - movementStartedAt;
        const bottomDuration = bottomAt === null ? 0 : timestamp - bottomAt;
        const completedRange = baselineAngle === null || minAngle === null ? 0 : baselineAngle - minAngle;
        const hadHardAngle = minAngle !== null && minAngle <= config.bottomAngle;

        phase = 'top';
        calibrateBaseline(angle);
        movementStartedAt = null;
        bottomAt = null;
        minAngle = null;

        if (
          completedRange >= config.minimumRange
          && (hadHardAngle || completedRange >= config.minimumRange + 15) // requires a good ROM if not quite bottomAngle
          && bottomDuration >= config.minBottomDurationMs
          && repDuration >= config.minRepDurationMs
          && repDuration <= config.maxRepDurationMs
          && timestamp - lastRepAt >= config.minRepIntervalMs
        ) {
          reps += 1;
          lastRepAt = timestamp;
          event = 'rep';
        }
      }
    } else if (classification === 'bottom' && (phase === 'top' || phase === 'moving')) {
      if (movementStartedAt === null) movementStartedAt = timestamp;
      phase = 'bottom';
      bottomAt = timestamp;
      updateMinimums(angle);
      event = 'target';
    } else if (classification === 'bottom' && phase === 'bottom') {
      updateMinimums(angle);
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
