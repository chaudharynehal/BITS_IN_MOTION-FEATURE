import { createSquatCounter, SQUAT_CONFIG } from './squatStateMachine';
import { createCycleCounter } from './cycleStateMachine';
import { createCrunchCounter, CRUNCH_CONFIG } from './crunchStateMachine';
import { measureExercise } from './exerciseMeasurements';

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

function classify(exerciseId, measurement) {
  if (!measurement.valid) return 'invalid';
  if (exerciseId === 'squats') {
    if (measurement.primaryValue >= SQUAT_CONFIG.standingAngle) return 'standing';
    if (measurement.primaryValue <= SQUAT_CONFIG.downAngle) return 'down';
    return 'transition';
  }
  if (exerciseId === 'pushups') {
    if (measurement.primaryValue >= 155) return 'top';
    if (measurement.primaryValue <= 100) return 'bottom';
    return 'transition';
  }
  if (exerciseId === 'crunches') {
    if (measurement.primaryValue >= CRUNCH_CONFIG.extendedAngle) return 'extended';
    if (measurement.primaryValue <= CRUNCH_CONFIG.curledAngle) return 'curled';
    return 'transition';
  }
  if (exerciseId === 'jumping-jacks') {
    if (measurement.armsOpen && measurement.feetRatio >= 1.6) return 'open';
    if (measurement.armsClosed && measurement.feetRatio <= 1.15) return 'closed';
    return 'transition';
  }
  return 'invalid';
}

function phaseLabel(exerciseId, phase) {
  const labels = {
    squats: { 'finding-standing': 'Finding start', standing: 'Standing', lowering: 'Lowering', down: 'Down position', rising: 'Standing up' },
    pushups: { 'finding-start': 'Finding start', top: 'Top position', moving: 'Lowering', bottom: 'Bottom position', returning: 'Pressing up' },
    crunches: { 'finding-start': 'Finding start', extended: 'Extended', flexing: 'Curling up', moving: 'Curling up', flexed: 'Curled', curled: 'Curled', extending: 'Returning', returning: 'Returning' },
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
  if (!measurement.valid || measurement.framingReason && measurement.framingReason !== 'ready') {
    const framing = {
      'no-person': ['no-person', 'No person detected — step into view'],
      'move-farther': ['move-farther', 'Move farther away — keep your whole body in frame'],
      'move-closer': ['move-closer', 'Move a little closer so your joints are clear'],
      'full-body': ['full-body', 'Full body not visible — adjust distance or camera tilt'],
      'key-joints': ['key-joints', exerciseId === 'crunches' ? 'Keep your shoulder, hip and knee visible' : 'Keep the key joints visible'],
      'adjust-angle': ['adjust-angle', exerciseId === 'crunches' ? 'Set the camera low and side-on to your shoulders and hips' : 'Turn side-on and lower the camera angle'],
      'improve-lighting': ['improve-lighting', 'Improve lighting so the camera can see your joints'],
      'overhead-room': ['overhead-room', 'Move farther back or tilt up to keep overhead room'],
    }[measurement.framingReason] || ['full-body', 'Full body not visible — adjust your camera'];
    return { key: framing[0], message: framing[1], tone: 'warning', priority: 6, holdMs: 1300 };
  }
  if (state.event === 'rep') return { key: 'great-rep', message: 'Great rep', tone: 'success', priority: 8, holdMs: 1200 };

  if (exerciseId === 'squats') {
    if (state.event === 'depth' || state.phase === 'down') return { key: 'good-depth', message: 'Good depth — stand back up', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'lowering' && measurement.primaryValue <= SQUAT_CONFIG.shallowCueAngle) return { key: 'lower', message: 'Go slightly lower', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-standing' ? 'Stand tall to begin' : 'Ready — lower with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (exerciseId === 'pushups') {
    if (measurement.bodyAngle < 150) return { key: 'body-line', message: 'Bring your hips into a straighter line', tone: 'warning', priority: 6, holdMs: 850 };
    if (state.event === 'target' || state.phase === 'bottom') return { key: 'press-up', message: 'Good depth — press back up', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'moving' && measurement.primaryValue < 135) return { key: 'lower', message: 'Lower a little more', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Straighten your arms to begin' : 'Ready — lower with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (exerciseId === 'crunches') {
    if (state.event === 'target' || state.phase === 'curled' || state.phase === 'flexed') return { key: 'return', message: 'Good curl — return with control', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'flexing' && measurement.primaryValue < 128) return { key: 'curl-more', message: 'Curl slightly further', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Extend your torso to begin' : 'Ready — curl with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (state.event === 'target' || state.phase === 'open') return { key: 'close', message: 'Good open position — return to centre', tone: 'success', priority: 7, holdMs: 800 };
  if (state.phase === 'moving') return { key: 'wider', message: 'Raise your hands and step wider', tone: 'warning', priority: 4, holdMs: 700 };
  return { key: 'ready', message: state.phase === 'finding-start' ? 'Feet together and arms down to begin' : 'Ready — open arms and legs together', tone: 'neutral', priority: 1, holdMs: 650 };
}

export function createExerciseDetector(exerciseId = 'squats', options = {}) {
  const id = DETECTOR_CONFIGS[exerciseId] ? exerciseId : 'squats';
  const measurementProvider = options.measurementProvider || ((landmarks) => measureExercise(id, landmarks));
  const shouldSmooth = !options.measurementProvider || options.smoothMeasurements === true;
  const counter = id === 'squats'
    ? createSquatCounter()
    : id === 'crunches'
      ? createCrunchCounter()
      : createCycleCounter({
      startState: id === 'pushups' ? 'top' : id === 'crunches' ? 'extended' : 'closed',
      targetState: id === 'pushups' ? 'bottom' : id === 'crunches' ? 'curled' : 'open',
      minRepIntervalMs: id === 'jumping-jacks' ? 500 : 700,
    });
  let measurementWindow = [];

  function smoothMeasurement(measurement) {
    if (!measurement.valid) {
      measurementWindow = [];
      return measurement;
    }
    measurementWindow.push(measurement);
    if (measurementWindow.length > 5) measurementWindow.shift();
    const numericMedian = (key) => {
      const values = measurementWindow.map((item) => item[key]).filter(Number.isFinite).sort((a, b) => a - b);
      return values.length ? values[Math.floor(values.length / 2)] : measurement[key];
    };
    const majority = (key) => measurementWindow.filter((item) => item[key]).length > measurementWindow.length / 2;
    return {
      ...measurement,
      primaryValue: numericMedian('primaryValue'),
      bodyAngle: numericMedian('bodyAngle'),
      feetRatio: numericMedian('feetRatio'),
      shoulderKneeRatio: numericMedian('shoulderKneeRatio'),
      torsoCompression: numericMedian('torsoCompression'),
      shoulderLift: numericMedian('shoulderLift'),
      worldAngle: numericMedian('worldAngle'),
      imageAngle: numericMedian('imageAngle'),
      armsOpen: majority('armsOpen'),
      armsClosed: majority('armsClosed'),
      visibility: Math.min(...measurementWindow.map((item) => item.visibility ?? 0)),
    };
  }

  function update(landmarks, timestamp = performance.now()) {
    const rawMeasurement = measurementProvider(landmarks);
    const measurement = shouldSmooth ? smoothMeasurement(rawMeasurement) : rawMeasurement;
    const classification = classify(id, measurement);
    const counterVisibility = measurement.valid ? measurement.visibility : 0;
    const counterValue = measurement.valid ? measurement.primaryValue : null;
    const state = id === 'squats'
      ? counter.update({ angle: counterValue, visibility: counterVisibility, timestamp })
      : id === 'crunches'
        ? counter.update({
          angle: counterValue,
          shoulderKneeRatio: measurement.shoulderKneeRatio,
          torsoCompression: measurement.torsoCompression,
          visibility: counterVisibility,
          timestamp,
        })
        : counter.update({ classification, visibility: counterVisibility, timestamp });
    return {
      ...state,
      phaseLabel: phaseLabel(id, state.phase),
      measurement,
      feedback: feedbackFor(id, measurement, state),
    };
  }

  return {
    id,
    config: DETECTOR_CONFIGS[id],
    update,
    reset: () => {
      measurementWindow = [];
      return counter.reset();
    },
    snapshot: () => counter.snapshot(),
  };
}

export { classify as classifyExerciseMeasurement };
