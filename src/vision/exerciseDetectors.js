import { createSquatCounter, SQUAT_CONFIG } from './squatStateMachine';
import { createCycleCounter } from './cycleStateMachine';
import { measureExercise } from './exerciseMeasurements';

export const DETECTOR_CONFIGS = Object.freeze({
  squats: {
    name: 'Squat coach',
    placement: 'Stand mostly side-on and move back until your hips, knees and ankles are visible.',
    guide: ['Stand tall to set the start position.', 'Lower until the knee angle reaches the depth threshold.', 'Stand tall again to count one rep.'],
    metricLabel: 'Knee angle',
    met: 5,
    primaryMuscles: ['Quadriceps', 'Glutes'],
  },
  pushups: {
    name: 'Push-up coach',
    placement: 'Place the camera side-on so your shoulder, elbow, wrist, hip and ankle remain visible.',
    guide: ['Begin with your arms straight.', 'Lower until the elbow reaches the depth range.', 'Press back to straight arms to count one rep.'],
    metricLabel: 'Elbow angle',
    met: 3.8,
    primaryMuscles: ['Chest', 'Triceps', 'Shoulders'],
  },
  crunches: {
    name: 'Crunch coach',
    placement: 'Lie side-on with your shoulder, hip and knee visible. Keep the device stable.',
    guide: ['Begin with your torso extended.', 'Curl the shoulders toward the hips.', 'Return with control to count one rep.'],
    metricLabel: 'Torso angle',
    met: 3.8,
    primaryMuscles: ['Abdominals', 'Hip flexors'],
  },
  'jumping-jacks': {
    name: 'Jumping-jack coach',
    placement: 'Face the camera and keep both hands and both feet inside the frame.',
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
    if (measurement.primaryValue >= 140) return 'extended';
    if (measurement.primaryValue <= 105) return 'curled';
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
    crunches: { 'finding-start': 'Finding start', extended: 'Extended', moving: 'Curling up', curled: 'Curled', returning: 'Returning' },
    'jumping-jacks': { 'finding-start': 'Finding start', closed: 'Closed position', moving: 'Opening', open: 'Open position', returning: 'Closing' },
  };
  return labels[exerciseId]?.[phase] || 'Tracking';
}

function feedbackFor(exerciseId, measurement, state) {
  if (!measurement.valid) return { key: 'framing', message: 'Move back — keep your full body visible', tone: 'warning', priority: 6, holdMs: 900 };
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
    if (state.event === 'target' || state.phase === 'curled') return { key: 'return', message: 'Good curl — return with control', tone: 'success', priority: 7, holdMs: 850 };
    if (state.phase === 'moving' && measurement.primaryValue < 125) return { key: 'curl-more', message: 'Curl slightly further', tone: 'warning', priority: 4, holdMs: 750 };
    return { key: 'ready', message: state.phase === 'finding-start' ? 'Extend your torso to begin' : 'Ready — curl with control', tone: 'neutral', priority: 1, holdMs: 650 };
  }
  if (state.event === 'target' || state.phase === 'open') return { key: 'close', message: 'Good open position — return to centre', tone: 'success', priority: 7, holdMs: 800 };
  if (state.phase === 'moving') return { key: 'wider', message: 'Raise your hands and step wider', tone: 'warning', priority: 4, holdMs: 700 };
  return { key: 'ready', message: state.phase === 'finding-start' ? 'Feet together and arms down to begin' : 'Ready — open arms and legs together', tone: 'neutral', priority: 1, holdMs: 650 };
}

export function createExerciseDetector(exerciseId = 'squats', options = {}) {
  const id = DETECTOR_CONFIGS[exerciseId] ? exerciseId : 'squats';
  const measurementProvider = options.measurementProvider || ((landmarks) => measureExercise(id, landmarks));
  const counter = id === 'squats'
    ? createSquatCounter()
    : createCycleCounter({
      startState: id === 'pushups' ? 'top' : id === 'crunches' ? 'extended' : 'closed',
      targetState: id === 'pushups' ? 'bottom' : id === 'crunches' ? 'curled' : 'open',
      minRepIntervalMs: id === 'jumping-jacks' ? 500 : 700,
    });

  function update(landmarks, timestamp = performance.now()) {
    const measurement = measurementProvider(landmarks);
    const classification = classify(id, measurement);
    const state = id === 'squats'
      ? counter.update({ angle: measurement.primaryValue, visibility: measurement.visibility, timestamp })
      : counter.update({ classification, visibility: measurement.visibility, timestamp });
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
    reset: () => counter.reset(),
    snapshot: () => counter.snapshot(),
  };
}

export { classify as classifyExerciseMeasurement };
