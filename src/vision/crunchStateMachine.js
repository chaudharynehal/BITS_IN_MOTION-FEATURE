export const CRUNCH_CONFIG = Object.freeze({
  extendedAngle: 138,
  curledAngle: 112,
  softCurledAngle: 122,
  minimumRange: 28,
  flexStartRange: 10,
  returnRange: 10,
  minimumShoulderKneeRange: 0.22,
  minimumCompressionRange: 0.16,
  returnRatioTolerance: 0.16,
  minVisibility: 0.58,
  stableFrames: 4,
  stableDurationMs: 140,
  minFlexedDurationMs: 120,
  minRepDurationMs: 450,
  maxRepDurationMs: 8000,
  minRepIntervalMs: 900,
  lostResetMs: 1200,
});

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function hasRatioRange(baseline, current, minimumRange) {
  if (baseline === null || current === null) return false;
  return baseline - current >= minimumRange;
}

// Crunches need stronger safeguards than a generic two-threshold counter. A
// valid repetition must begin from a stable extended baseline, show meaningful
// torso flexion, hold a flexed position, and return to the baseline once.
export function createCrunchCounter(overrides = {}) {
  const config = { ...CRUNCH_CONFIG, ...overrides };
  let phase = 'finding-start';
  let reps = 0;
  let candidate = null;
  let candidateFrames = 0;
  let candidateSince = 0;
  let baselineAngle = null;
  let baselineShoulderKneeRatio = null;
  let baselineTorsoCompression = null;
  let movementStartedAt = null;
  let flexedAt = null;
  let minAngle = null;
  let minShoulderKneeRatio = null;
  let minTorsoCompression = null;
  let lastRepAt = -Infinity;
  let missingSince = null;

  function clearCandidate() {
    candidate = null;
    candidateFrames = 0;
    candidateSince = 0;
  }

  function clearMovement() {
    phase = 'finding-start';
    baselineAngle = null;
    baselineShoulderKneeRatio = null;
    baselineTorsoCompression = null;
    movementStartedAt = null;
    flexedAt = null;
    minAngle = null;
    minShoulderKneeRatio = null;
    minTorsoCompression = null;
    clearCandidate();
  }

  function sampleFrom(input) {
    return {
      angle: finiteOrNull(input.angle),
      shoulderKneeRatio: finiteOrNull(input.shoulderKneeRatio),
      torsoCompression: finiteOrNull(input.torsoCompression),
    };
  }

  function updateMinimums(sample) {
    minAngle = minAngle === null ? sample.angle : Math.min(minAngle, sample.angle);
    if (sample.shoulderKneeRatio !== null) {
      minShoulderKneeRatio = minShoulderKneeRatio === null
        ? sample.shoulderKneeRatio
        : Math.min(minShoulderKneeRatio, sample.shoulderKneeRatio);
    }
    if (sample.torsoCompression !== null) {
      minTorsoCompression = minTorsoCompression === null
        ? sample.torsoCompression
        : Math.min(minTorsoCompression, sample.torsoCompression);
    }
  }

  function calibrateBaseline(sample) {
    baselineAngle = baselineAngle === null ? sample.angle : Math.max(baselineAngle, sample.angle);
    if (sample.shoulderKneeRatio !== null) {
      baselineShoulderKneeRatio = baselineShoulderKneeRatio === null
        ? sample.shoulderKneeRatio
        : Math.max(baselineShoulderKneeRatio, sample.shoulderKneeRatio);
    }
    if (sample.torsoCompression !== null) {
      baselineTorsoCompression = baselineTorsoCompression === null
        ? sample.torsoCompression
        : Math.max(baselineTorsoCompression, sample.torsoCompression);
    }
  }

  function hasStartedFlexion(sample) {
    if (baselineAngle === null) return false;
    return baselineAngle - sample.angle >= config.flexStartRange;
  }

  function hasSupplementalFlexion(sample) {
    return hasRatioRange(baselineShoulderKneeRatio, sample.shoulderKneeRatio, config.minimumShoulderKneeRange)
      || hasRatioRange(baselineTorsoCompression, sample.torsoCompression, config.minimumCompressionRange);
  }

  function hasFullFlexion(sample) {
    if (baselineAngle === null) return false;
    const angleRange = baselineAngle - sample.angle;
    if (angleRange < config.minimumRange) return false;
    if (sample.angle <= config.curledAngle) return true;
    return sample.angle <= config.softCurledAngle && hasSupplementalFlexion(sample);
  }

  function hasReturnedToExtended(sample) {
    if (sample.angle < config.extendedAngle) return false;
    if (baselineShoulderKneeRatio !== null && sample.shoulderKneeRatio !== null) {
      return sample.shoulderKneeRatio >= baselineShoulderKneeRatio - config.returnRatioTolerance;
    }
    if (baselineTorsoCompression !== null && sample.torsoCompression !== null) {
      return sample.torsoCompression >= baselineTorsoCompression - config.returnRatioTolerance;
    }
    return true;
  }

  function classificationFor(sample) {
    if (baselineAngle === null) {
      // If no baseline, just wait for a stable position that is somewhat extended (e.g. >= 115)
      return sample.angle >= 115 ? 'extended' : 'transition';
    }
    if (hasReturnedToExtended(sample)) return 'extended';
    if (hasFullFlexion(sample)) return 'flexed';
    return 'transition';
  }

  function update({ angle, shoulderKneeRatio = null, torsoCompression = null, visibility = 1, timestamp = performance.now() }) {
    if (!Number.isFinite(angle) || visibility < config.minVisibility) {
      if (missingSince === null) missingSince = timestamp;
      clearCandidate();
      if (timestamp - missingSince >= config.lostResetMs) clearMovement();
      return { reps, phase, event: 'invalid', classification: 'invalid' };
    }
    missingSince = null;

    const sample = sampleFrom({ angle, shoulderKneeRatio, torsoCompression });
    const classification = classificationFor(sample);

    if (classification === 'transition') {
      clearCandidate();
      if ((phase === 'extended' || phase === 'flexing') && hasStartedFlexion(sample)) {
        if (movementStartedAt === null) movementStartedAt = timestamp;
        phase = 'flexing';
        updateMinimums(sample);
      } else if (phase === 'flexed' || phase === 'extending') {
        phase = 'extending';
        updateMinimums(sample);
      }
      return { reps, phase, event: null, classification };
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
        calibrateBaseline(sample);
        event = 'ready';
      } else if (phase === 'extended') {
        calibrateBaseline(sample);
      } else if (phase === 'flexing') {
        phase = 'extended';
        calibrateBaseline(sample);
        movementStartedAt = null;
        flexedAt = null;
        minAngle = null;
        minShoulderKneeRatio = null;
        minTorsoCompression = null;
      } else if (phase === 'flexed' || phase === 'extending') {
        const repDuration = movementStartedAt === null ? 0 : timestamp - movementStartedAt;
        const flexedDuration = flexedAt === null ? 0 : timestamp - flexedAt;
        const completedRange = baselineAngle === null || minAngle === null ? 0 : baselineAngle - minAngle;
        const hadHardAngle = minAngle !== null && minAngle <= config.curledAngle;
        const hadSupplementalRange = hasRatioRange(baselineShoulderKneeRatio, minShoulderKneeRatio, config.minimumShoulderKneeRange)
          || hasRatioRange(baselineTorsoCompression, minTorsoCompression, config.minimumCompressionRange);

        phase = 'extended';
        calibrateBaseline(sample);
        movementStartedAt = null;
        flexedAt = null;
        minAngle = null;
        minShoulderKneeRatio = null;
        minTorsoCompression = null;

        if (
          completedRange >= config.minimumRange
          && (hadHardAngle || hadSupplementalRange)
          && flexedDuration >= config.minFlexedDurationMs
          && repDuration >= config.minRepDurationMs
          && repDuration <= config.maxRepDurationMs
          && timestamp - lastRepAt >= config.minRepIntervalMs
        ) {
          reps += 1;
          lastRepAt = timestamp;
          event = 'rep';
        }
      }
    } else if (classification === 'flexed' && (phase === 'extended' || phase === 'flexing')) {
      if (movementStartedAt === null) movementStartedAt = timestamp;
      phase = 'flexed';
      flexedAt = timestamp;
      updateMinimums(sample);
      event = 'target';
    } else if (classification === 'flexed' && phase === 'flexed') {
      updateMinimums(sample);
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
