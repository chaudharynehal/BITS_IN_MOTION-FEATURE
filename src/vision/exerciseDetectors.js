import { measureExercise } from './exerciseMeasurements';
import { createProgressCounter } from './progressCounter';

export const DETECTOR_CONFIGS = Object.freeze({
  squats: {
    name: 'Squat coach',
    placement: 'Stand far enough back for your full standing body to fit in frame, especially shoulders, hips, knees and ankles.',
    setupTip: 'Use a full standing view with the phone steady at about waist to chest height.',
    guide: ['Stand tall to set the start position.', 'Lower until the knee angle reaches the depth threshold.', 'Stand tall again to count one rep.'],
    metricLabel: 'Knee angle',
    met: 5,
    primaryMuscles: ['Quadriceps', 'Glutes'],
  },
  pushups: {
    name: 'Push-up coach',
    placement: 'Place the camera low and side-on so your shoulder, elbow, wrist, hip and ankle remain visible through the full push-up.',
    setupTip: 'Use a side-oriented floor view from a low angle, with your whole body visible from hand to foot.',
    guide: ['Begin with your arms straight.', 'Lower until the elbow reaches the depth range.', 'Press back to straight arms to count one rep.'],
    metricLabel: 'Elbow angle',
    met: 3.8,
    primaryMuscles: ['Chest', 'Triceps', 'Shoulders'],
  },
  crunches: {
    name: 'Crunch coach',
    placement: 'Lie side-on with your shoulder, hip and knee visible. Keep the device low, steady and pointed across your body.',
    setupTip: 'Use a side-oriented floor view. Your shoulder, hip and knee need to stay visible; your ankle is helpful but not required.',
    guide: ['Begin with your torso extended.', 'Curl the shoulders toward the hips.', 'Return with control to count one rep.'],
    metricLabel: 'Torso angle',
    met: 3.8,
    primaryMuscles: ['Abdominals', 'Hip flexors'],
  },
  'jumping-jacks': {
    name: 'Jumping-jack coach',
    placement: 'Face the camera with your full body visible and leave overhead room for raised hands.',
    setupTip: 'Use a full-body front view with extra space above your head and around both feet.',
    guide: ['Begin with feet together and arms down.', 'Move feet apart while raising both hands.', 'Return to the closed position to count one rep.'],
    metricLabel: 'Stance width',
    met: 8,
    primaryMuscles: ['Calves', 'Shoulders', 'Glutes'],
  },
});

function phaseLabel(exerciseId, phase) {
  const labels = {
    squats: { 'finding-start': 'Finding start', standing: 'Standing', lowering: 'Lowering', down: 'Down position', rising: 'Standing up' },
    pushups: { 'finding-start': 'Finding start', top: 'Top position', moving: 'Lowering', bottom: 'Bottom position', returning: 'Pressing up' },
    crunches: { 'finding-start': 'Finding start', extended: 'Extended', flexing: 'Curling up', flexed: 'Curled', extending: 'Returning' },
    'jumping-jacks': { 'finding-start': 'Finding start', closed: 'Closed position', moving: 'Opening', open: 'Open position', returning: 'Closing' },
  };
  return labels[exerciseId]?.[phase] || 'Tracking';
}

function feedbackFor(exerciseId, measurement, state) {
  if (exerciseId === 'pushups'
    && measurement.framingReason === 'ready'
    && Number.isFinite(measurement.bodyAngle)
    && measurement.bodyAngle < 150) {
    return { key: 'body-line', message: 'Bring your hips into a straighter line', tone: 'warning', priority: 6, holdMs: 850 };
  }
  if (!measurement.valid || (measurement.framingReason && measurement.framingReason !== 'ready')) {
    // PERSON vs EXERCISE READY: only say "no person" when MediaPipe genuinely
    // has no credible human pose. A present person with legs out of frame or a
    // weak joint gets a framing cue, never "no person".
    if (!measurement.personDetected) {
      return { key: 'no-person', message: 'Step into frame so we can see you', tone: 'warning', priority: 6, holdMs: 1300 };
    }
    const framing = {
      'no-person': ['full-body', 'Step back so your full body is visible'],
      'move-farther': ['move-farther', 'Move farther away — keep your whole body in frame'],
      'move-closer': ['move-closer', 'Move a little closer so your joints are clear'],
      'full-body': ['full-body', exerciseId === 'squats' ? 'Step back so your knees and ankles are visible' : 'Full body not visible — adjust distance or camera tilt'],
      'key-joints': ['key-joints', exerciseId === 'crunches' ? 'Keep your shoulder, hip and knee visible' : 'Adjust your position so the key joints are visible'],
      'adjust-angle': ['adjust-angle', exerciseId === 'crunches' ? 'Set the camera low and side-on to your shoulders and hips' : 'Turn side-on and lower the camera angle'],
      'improve-lighting': ['improve-lighting', 'Improve lighting so the camera can see your joints'],
      'overhead-room': ['overhead-room', 'Move farther back or tilt up to keep overhead room'],
    }[measurement.framingReason] || ['full-body', 'Full body not visible — adjust your camera'];
    return { key: framing[0], message: framing[1], tone: 'warning', priority: 6, holdMs: 1300 };
  }
  if (state.event === 'rep') return { key: 'great-rep', message: 'Great rep', tone: 'success', priority: 8, holdMs: 1200 };

  if (exerciseId === 'squats') {
    if (state.event === 'target' || state.phase === 'down') return { key: 'good-depth', message: 'Good depth — stand back up', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'lowering' && measurement.primaryValue <= 145) return { key: 'lower', message: 'Go slightly lower', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Stand tall to begin' : 'Ready — lower with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (exerciseId === 'pushups') {
    if (measurement.bodyAngle < 150) return { key: 'body-line', message: 'Bring your hips into a straighter line', tone: 'warning', priority: 6, holdMs: 850 };
    if (state.event === 'target' || state.phase === 'bottom') return { key: 'press-up', message: 'Good depth — press back up', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'moving' && measurement.primaryValue < 135) return { key: 'lower', message: 'Lower a little more', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Straighten your arms to begin' : 'Ready — lower with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (exerciseId === 'crunches') {
    if (state.event === 'target' || state.phase === 'flexed') return { key: 'return', message: 'Good curl — return with control', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'flexing' && measurement.primaryValue < 128) return { key: 'curl-more', message: 'Curl slightly further', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Extend your torso to begin' : 'Ready — curl with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (state.event === 'target' || state.phase === 'open') return { key: 'close', message: 'Good open position — return to centre', tone: 'success', priority: 7, holdMs: 800 };
  if (state.phase === 'moving') return { key: 'wider', message: 'Raise your hands and step wider', tone: 'warning', priority: 4, holdMs: 700 };
  return { key: 'ready', message: state.phase === 'finding-start' ? 'Feet together and arms down to begin' : 'Ready — open arms and legs together', tone: 'neutral', priority: 1, holdMs: 650 };
}

export function createExerciseDetector(exerciseId = 'squats', options = {}) {
  const id = DETECTOR_CONFIGS[exerciseId] ? exerciseId : 'squats';
  let lockedSide = null;
  
  const counter = createProgressCounter({ id, debounceMs: 400, activeThreshold: 0.70, returnThreshold: 0.35 });
  
  // Baselines for personal ROM
  let baselineAngle = null;
  let baselineFeetRatio = null;

  function update(landmarks, timestamp = performance.now()) {
    const isActive = counter.snapshot().active;
    const rawMeasurement = options.measurementProvider
      ? options.measurementProvider(landmarks)
      : measureExercise(id, landmarks, { preferredSide: lockedSide, preferenceThreshold: isActive ? 0 : 0.45 });

    if (rawMeasurement.valid && rawMeasurement.side) {
      lockedSide = rawMeasurement.side;
    }

    let progressRaw = 0;
    
    if (rawMeasurement.valid) {
      if (id === 'squats') {
        const angle = rawMeasurement.primaryValue;
        if (baselineAngle === null || (angle > baselineAngle && !isActive)) baselineAngle = angle;
        const baseline = Math.max(baselineAngle, 160); 
        progressRaw = Math.max(0, Math.min(1, (baseline - angle) / (baseline - 95)));
      } else if (id === 'pushups') {
        const angle = rawMeasurement.primaryValue;
        if (baselineAngle === null || (angle > baselineAngle && !isActive)) baselineAngle = angle;
        const baseline = Math.max(baselineAngle, 155); 
        progressRaw = Math.max(0, Math.min(1, (baseline - angle) / (baseline - 90)));
      } else if (id === 'crunches') {
        const angle = rawMeasurement.primaryValue;
        if (baselineAngle === null || (angle > baselineAngle && !isActive)) baselineAngle = angle;
        const baseline = Math.min(Math.max(baselineAngle, 135), 150);
        const angleProgress = Math.max(0, Math.min(1, (baseline - angle) / 35));
        
        // Torso compression from exerciseMeasurements
        // baselineTorsoCompression is usually larger, it reduces as we crunch
        // So let's combine it with shoulderKneeRatio if needed, but angle is quite reliable if baseline is set.
        progressRaw = angleProgress;
      } else if (id === 'jumping-jacks') {
        const feetRatio = rawMeasurement.feetRatio;
        if (baselineFeetRatio === null || (feetRatio < baselineFeetRatio && !isActive)) baselineFeetRatio = feetRatio;
        const baseline = Math.min(baselineFeetRatio, 1.25);
        const feetProgress = Math.max(0, Math.min(1, (feetRatio - baseline) / 0.45)); // e.g. 1.25 -> 1.70
        const armsProgress = rawMeasurement.armsOpen ? 1 : (rawMeasurement.armsClosed ? 0 : 0.5);
        
        progressRaw = (feetProgress + armsProgress) / 2;
      }
    }

    const state = counter.update(progressRaw, rawMeasurement.valid, timestamp);

    return {
      ...state,
      phaseLabel: phaseLabel(id, state.phase),
      personDetected: Boolean(rawMeasurement.personDetected),
      exerciseReady: Boolean(rawMeasurement.valid),
      measurement: rawMeasurement,
      rawMeasurement: rawMeasurement,
      feedback: feedbackFor(id, rawMeasurement, state),
    };
  }

  return {
    id,
    config: DETECTOR_CONFIGS[id],
    update,
    reset: () => {
      lockedSide = null;
      baselineAngle = null;
      baselineFeetRatio = null;
      return counter.reset();
    },
    snapshot: () => counter.snapshot(),
  };
}

export function classifyExerciseMeasurement(exerciseId, measurement) {
  // Keeping this for compatibility if it's used directly
  return 'invalid'; 
}
