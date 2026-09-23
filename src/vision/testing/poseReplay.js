import { createExerciseDetector } from '../exerciseDetectors';

export function createSeededRandom(seed = 1) {
  let state = seed >>> 0;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function lerp(a, b, progress) {
  return a + (b - a) * progress;
}

function easeInOut(progress) {
  return 0.5 - Math.cos(Math.PI * progress) / 2;
}

function point(x, y, { z = 0, visibility = 0.96, presence = visibility } = {}) {
  return { x, y, z, visibility, presence };
}

function blankLandmarks() {
  return Array.from({ length: 33 }, () => point(0.5, 0.5, { visibility: 0.02, presence: 0.02 }));
}

function cloneLandmarks(landmarks) {
  return landmarks.map((item) => ({ ...item }));
}

function setLandmark(landmarks, index, x, y, options) {
  landmarks[index] = point(x, y, options);
}

function worldFrom(landmarks) {
  return landmarks.map((item) => ({
    x: (item.x - 0.5) * 2,
    y: (item.y - 0.5) * 2,
    z: item.z ?? 0,
    visibility: item.visibility,
    presence: item.presence,
  }));
}

function frame(timestamp, landmarks, overrides = {}) {
  return {
    timestamp,
    landmarks,
    worldLandmarks: worldFrom(landmarks),
    frameBrightness: 0.35,
    width: 1280,
    height: 720,
    ...overrides,
  };
}

function defaultSideIndexes(side) {
  return side === 'right'
    ? { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 }
    : { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
}

function fillOtherSide(landmarks, side, indexes, visibility) {
  const other = side === 'right' ? defaultSideIndexes('left') : defaultSideIndexes('right');
  const shift = side === 'right' ? -0.018 : 0.018;
  for (const key of Object.keys(indexes)) {
    const source = landmarks[indexes[key]];
    if (source) setLandmark(landmarks, other[key], source.x + shift, source.y + 0.006, { z: source.z, visibility, presence: visibility });
  }
}

export function crunchPose(progress = 0, options = {}) {
  const {
    side = 'left',
    centerX = 0.5,
    centerY = 0.56,
    torsoLength = 0.3,
    legLength = 0.26,
    shoulderLift = 0.21,
    foldForward = 0.94,
    visibility = 0.96,
    otherSideVisibility = 0.42,
    cameraTilt = 0,
    ankleVisibility = visibility,
  } = options;
  const indexes = defaultSideIndexes(side);
  const landmarks = blankLandmarks();
  const eased = easeInOut(progress);
  const hip = { x: centerX, y: centerY };
  const knee = { x: centerX + legLength, y: centerY + cameraTilt * 0.03 };
  const ankle = { x: centerX + legLength + 0.15, y: centerY + cameraTilt * 0.04 };
  const extendedShoulder = { x: centerX - torsoLength, y: centerY + cameraTilt * 0.03 };
  const flexedShoulder = { x: centerX - torsoLength * (1 - foldForward), y: centerY - shoulderLift };
  const shoulder = {
    x: lerp(extendedShoulder.x, flexedShoulder.x, eased),
    y: lerp(extendedShoulder.y, flexedShoulder.y, eased),
  };
  setLandmark(landmarks, indexes.shoulder, shoulder.x, shoulder.y, { visibility });
  setLandmark(landmarks, indexes.hip, hip.x, hip.y, { visibility });
  setLandmark(landmarks, indexes.knee, knee.x, knee.y, { visibility });
  setLandmark(landmarks, indexes.ankle, ankle.x, ankle.y, { visibility: ankleVisibility, presence: ankleVisibility });
  setLandmark(landmarks, indexes.elbow, lerp(shoulder.x, hip.x, 0.35), shoulder.y + 0.08, { visibility: visibility * 0.88 });
  setLandmark(landmarks, indexes.wrist, lerp(shoulder.x, hip.x, 0.48), shoulder.y + 0.16, { visibility: visibility * 0.82 });
  fillOtherSide(landmarks, side, indexes, otherSideVisibility);
  return landmarks;
}

export function squatPose(angle = 172, options = {}) {
  const {
    side = 'left',
    centerX = 0.48,
    kneeY = 0.64,
    thigh = 0.22,
    shin = 0.24,
    torso = 0.22,
    visibility = 0.97,
    otherSideVisibility = 0.52,
    upperBodyShift = 0,
  } = options;
  const indexes = defaultSideIndexes(side);
  const landmarks = blankLandmarks();
  const radians = angle * Math.PI / 180;
  const knee = { x: centerX, y: kneeY };
  const hip = { x: centerX - upperBodyShift, y: kneeY - thigh };
  const ankle = { x: centerX + Math.sin(radians) * shin, y: kneeY - Math.cos(radians) * shin };
  const shoulder = { x: hip.x - upperBodyShift * 0.3, y: hip.y - torso };
  setLandmark(landmarks, indexes.shoulder, shoulder.x, shoulder.y, { visibility });
  setLandmark(landmarks, indexes.hip, hip.x, hip.y, { visibility });
  setLandmark(landmarks, indexes.knee, knee.x, knee.y, { visibility });
  setLandmark(landmarks, indexes.ankle, ankle.x, ankle.y, { visibility });
  fillOtherSide(landmarks, side, indexes, otherSideVisibility);
  return landmarks;
}

export function pushupPose(elbowAngle = 170, options = {}) {
  const {
    side = 'left',
    shoulderX = 0.28,
    shoulderY = 0.5,
    upperArm = 0.13,
    forearm = 0.15,
    hipSag = 0,
    visibility = 0.96,
    otherSideVisibility = 0.4,
  } = options;
  const indexes = defaultSideIndexes(side);
  const landmarks = blankLandmarks();
  const shoulder = { x: shoulderX, y: shoulderY };
  const elbow = { x: shoulderX + upperArm, y: shoulderY + 0.005 };
  const vectorAngle = Math.PI - elbowAngle * Math.PI / 180;
  const wrist = { x: elbow.x + Math.cos(vectorAngle) * forearm, y: elbow.y + Math.sin(vectorAngle) * forearm };
  const hip = { x: shoulderX + 0.29, y: shoulderY + 0.02 + hipSag };
  const ankle = { x: shoulderX + 0.56, y: shoulderY + 0.04 };
  setLandmark(landmarks, indexes.shoulder, shoulder.x, shoulder.y, { visibility });
  setLandmark(landmarks, indexes.elbow, elbow.x, elbow.y, { visibility });
  setLandmark(landmarks, indexes.wrist, wrist.x, wrist.y, { visibility });
  setLandmark(landmarks, indexes.hip, hip.x, hip.y, { visibility });
  setLandmark(landmarks, indexes.knee, shoulderX + 0.43, shoulderY + 0.03 + hipSag * 0.35, { visibility: visibility * 0.88 });
  setLandmark(landmarks, indexes.ankle, ankle.x, ankle.y, { visibility });
  fillOtherSide(landmarks, side, indexes, otherSideVisibility);
  return landmarks;
}

export function jumpingJackPose(progress = 0, options = {}) {
  const {
    centerX = 0.5,
    shoulderY = 0.28,
    hipY = 0.56,
    ankleY = 0.86,
    shoulderWidth = 0.22,
    closedAnkleWidth = 0.11,
    openAnkleWidth = 0.5,
    visibility = 0.96,
    armProgress = progress,
    legProgress = progress,
  } = options;
  const landmarks = blankLandmarks();
  const arm = easeInOut(armProgress);
  const leg = easeInOut(legProgress);
  const hipWidth = shoulderWidth * 0.82;
  const ankleWidth = lerp(closedAnkleWidth, openAnkleWidth, leg);
  const wristY = lerp(hipY + 0.06, shoulderY - 0.16, arm);
  const wristSpread = lerp(shoulderWidth * 0.48, shoulderWidth * 1.25, arm);
  setLandmark(landmarks, 11, centerX - shoulderWidth / 2, shoulderY, { visibility });
  setLandmark(landmarks, 12, centerX + shoulderWidth / 2, shoulderY, { visibility });
  setLandmark(landmarks, 23, centerX - hipWidth / 2, hipY, { visibility });
  setLandmark(landmarks, 24, centerX + hipWidth / 2, hipY, { visibility });
  setLandmark(landmarks, 15, centerX - wristSpread, wristY, { visibility });
  setLandmark(landmarks, 16, centerX + wristSpread, wristY, { visibility });
  setLandmark(landmarks, 27, centerX - ankleWidth / 2, ankleY, { visibility });
  setLandmark(landmarks, 28, centerX + ankleWidth / 2, ankleY, { visibility });
  return landmarks;
}

function addFrames(frames, poseFactory, { startValue, endValue, durationMs, fps, timestamp, brightness = 0.35, dimensions = {} }) {
  const frameMs = 1000 / fps;
  const count = Math.max(1, Math.round(durationMs / frameMs));
  let currentTimestamp = timestamp;
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 1 : index / (count - 1);
    const value = lerp(startValue, endValue, easeInOut(progress));
    frames.push(frame(currentTimestamp, poseFactory(value), { frameBrightness: brightness, ...dimensions }));
    currentTimestamp += frameMs;
  }
  return currentTimestamp;
}

function addHold(frames, poseFactory, { value, durationMs, fps, timestamp, brightness = 0.35, dimensions = {} }) {
  return addFrames(frames, poseFactory, { startValue: value, endValue: value, durationMs, fps, timestamp, brightness, dimensions });
}

export function movementSequence({
  poseFactory,
  reps = 1,
  startValue,
  targetValue,
  fps = 30,
  startHoldMs = 450,
  moveToTargetMs = 650,
  targetHoldMs = 300,
  returnMs = 650,
  endHoldMs = 450,
  betweenRepHoldMs = 250,
  timestamp = 0,
  brightness = 0.35,
  dimensions,
} = {}) {
  const frames = [];
  let time = addHold(frames, poseFactory, { value: startValue, durationMs: startHoldMs, fps, timestamp, brightness, dimensions });
  for (let rep = 0; rep < reps; rep += 1) {
    time = addFrames(frames, poseFactory, { startValue, endValue: targetValue, durationMs: moveToTargetMs, fps, timestamp: time, brightness, dimensions });
    time = addHold(frames, poseFactory, { value: targetValue, durationMs: targetHoldMs, fps, timestamp: time, brightness, dimensions });
    time = addFrames(frames, poseFactory, { startValue: targetValue, endValue: startValue, durationMs: returnMs, fps, timestamp: time, brightness, dimensions });
    time = addHold(frames, poseFactory, { value: startValue, durationMs: rep === reps - 1 ? endHoldMs : betweenRepHoldMs, fps, timestamp: time, brightness, dimensions });
  }
  return frames;
}

export function crunchSequence(options = {}) {
  const { poseOptions = {}, targetValue = 1, ...rest } = options;
  return movementSequence({
    poseFactory: (progress) => crunchPose(progress, poseOptions),
    startValue: 0,
    targetValue,
    ...rest,
  });
}

export function squatSequence(options = {}) {
  const { poseOptions = {}, targetAngle = 96, ...rest } = options;
  return movementSequence({
    poseFactory: (angle) => squatPose(angle, poseOptions),
    startValue: 172,
    targetValue: targetAngle,
    ...rest,
  });
}

export function pushupSequence(options = {}) {
  const { poseOptions = {}, targetAngle = 86, ...rest } = options;
  return movementSequence({
    poseFactory: (angle) => pushupPose(angle, poseOptions),
    startValue: 170,
    targetValue: targetAngle,
    ...rest,
  });
}

export function jumpingJackSequence(options = {}) {
  const { poseOptions = {}, targetValue = 1, ...rest } = options;
  return movementSequence({
    poseFactory: (progress) => jumpingJackPose(progress, poseOptions),
    startValue: 0,
    targetValue,
    ...rest,
  });
}

export function withJitter(frames, { seed = 1, amplitude = 0.004, visibilityAmplitude = 0.03, indexes = null } = {}) {
  const random = createSeededRandom(seed);
  const indexSet = indexes ? new Set(indexes) : null;
  return frames.map((item) => {
    const landmarks = cloneLandmarks(item.landmarks).map((landmark, index) => {
      if (indexSet && !indexSet.has(index)) return landmark;
      if ((landmark.visibility ?? 0) < 0.2) return landmark;
      const dx = (random() - 0.5) * amplitude * 2;
      const dy = (random() - 0.5) * amplitude * 2;
      const visibility = Math.max(0, Math.min(1, landmark.visibility + (random() - 0.5) * visibilityAmplitude * 2));
      return { ...landmark, x: landmark.x + dx, y: landmark.y + dy, visibility, presence: visibility };
    });
    return { ...item, landmarks, worldLandmarks: worldFrom(landmarks) };
  });
}

export function withVisibilityDrop(frames, { fromMs, toMs, indexes, visibility = 0.05 } = {}) {
  const indexSet = new Set(indexes);
  return frames.map((item) => {
    if (item.timestamp < fromMs || item.timestamp > toMs) return item;
    const landmarks = cloneLandmarks(item.landmarks);
    for (const index of indexSet) {
      if (landmarks[index]) {
        landmarks[index].visibility = visibility;
        landmarks[index].presence = visibility;
      }
    }
    return { ...item, landmarks, worldLandmarks: worldFrom(landmarks) };
  });
}

export function withBrightness(frames, frameBrightness) {
  return frames.map((item) => ({ ...item, frameBrightness }));
}

export function appendSequences(...sequences) {
  const combined = [];
  let offset = 0;
  for (const sequence of sequences) {
    const first = sequence[0]?.timestamp ?? 0;
    for (const item of sequence) combined.push({ ...item, timestamp: item.timestamp - first + offset });
    offset = (combined[combined.length - 1]?.timestamp ?? offset) + 1000 / 30;
  }
  return combined;
}

export function runExerciseReplay(exerciseId, frames) {
  const detector = createExerciseDetector(exerciseId);
  const states = frames.map((item) => detector.update({
    landmarks: item.landmarks,
    worldLandmarks: item.worldLandmarks,
    frameBrightness: item.frameBrightness,
  }, item.timestamp));
  return {
    detector,
    frames,
    states,
    finalState: states[states.length - 1],
    reps: detector.snapshot().reps,
    maxReps: Math.max(0, ...states.map((state) => state.reps)),
  };
}

export function stationarySequence({ poseFactory, value, durationMs = 5000, fps = 30, brightness = 0.35 } = {}) {
  const frames = [];
  addHold(frames, poseFactory, { value, durationMs, fps, timestamp: 0, brightness });
  return frames;
}
