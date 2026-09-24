export function createProgressCounter({
  id,
  activeThreshold = 0.80,
  returnThreshold = 0.25,
  debounceMs = 400,
  lostResetMs = 1200,
} = {}) {
  let reps = 0;
  let phase = 'finding-start';
  let active = false;
  let lastRepAt = -Infinity;
  let maxProgress = 0;
  let missingSince = null;
  
  let smoothedProgress = 0;
  const emaAlpha = 0.35; // Light smoothing

  let baseline = null;
  let previousProgress = 0;

  function reset() {
    reps = 0;
    phase = 'finding-start';
    active = false;
    lastRepAt = -Infinity;
    maxProgress = 0;
    missingSince = null;
    smoothedProgress = 0;
    baseline = null;
    previousProgress = 0;
    return snapshot();
  }

  function snapshot() {
    return { reps, phase, active, maxProgress };
  }

  function determinePhase(progress, active, lastProgress) {
    if (baseline === null) return 'finding-start';
    if (active) {
      if (progress > activeThreshold) return id === 'squats' ? 'down' : id === 'pushups' ? 'bottom' : id === 'crunches' ? 'flexed' : 'open';
      return id === 'squats' ? 'rising' : id === 'pushups' ? 'returning' : id === 'crunches' ? 'extending' : 'returning';
    }
    if (progress <= returnThreshold) {
      return id === 'squats' ? 'standing' : id === 'pushups' ? 'top' : id === 'crunches' ? 'extended' : 'closed';
    }
    return id === 'squats' ? 'lowering' : id === 'pushups' ? 'moving' : id === 'crunches' ? 'flexing' : 'moving';
  }

  function update(progressRaw, valid, timestamp = performance.now()) {
    if (!valid) {
      if (missingSince === null) missingSince = timestamp;
      if (timestamp - missingSince >= lostResetMs) {
        active = false;
        maxProgress = 0;
      }
      return { reps, phase, event: 'invalid', progress: smoothedProgress };
    }
    missingSince = null;

    if (baseline === null) {
      // Just waiting for the first valid frame with progress ~ 0 to set baseline
      if (progressRaw < 0.2) {
        baseline = true;
        phase = determinePhase(0, false, 0);
        return { reps, phase, event: 'ready', progress: 0 };
      }
      return { reps, phase, event: null, progress: 0 };
    }

    // Apply EMA smoothing
    smoothedProgress += emaAlpha * (progressRaw - smoothedProgress);
    
    let event = null;
    
    if (!active && smoothedProgress >= activeThreshold) {
      active = true;
      maxProgress = smoothedProgress;
      event = 'target';
    }
    
    if (active) {
      maxProgress = Math.max(maxProgress, smoothedProgress);
      
      if (smoothedProgress <= returnThreshold) {
        if (timestamp - lastRepAt >= debounceMs) {
          reps += 1;
          lastRepAt = timestamp;
          event = 'rep';
        }
        active = false;
        maxProgress = 0;
      }
    }

    const currentPhase = determinePhase(smoothedProgress, active, previousProgress);
    phase = currentPhase;
    previousProgress = smoothedProgress;

    return { reps, phase, event, progress: smoothedProgress, progressRaw, active, maxProgress };
  }

  return { update, reset, snapshot };
}
