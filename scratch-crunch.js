import { measureCrunch } from './src/vision/exerciseMeasurements.js';
import { createExerciseDetector } from './src/vision/exerciseDetectors.js';

function sidePose({
  shoulder = [0.2, 0.55],
  elbow = [0.3, 0.55],
  wrist = [0.4, 0.55],
  hip = [0.5, 0.55],
  knee = [0.75, 0.55],
  ankle = [0.9, 0.55],
  visibility = 0.96,
  ankleVisibility = visibility,
} = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  for (const [index, point, pointVisibility] of [[11, shoulder, visibility], [13, elbow, visibility], [15, wrist, visibility], [23, hip, visibility], [25, knee, visibility], [27, ankle, ankleVisibility]]) {
    landmarks[index] = { x: point[0], y: point[1], visibility: pointVisibility };
  }
  return landmarks;
}

const detector = createExerciseDetector('crunches');

console.log("Feed 1 (Extended):");
let state;
for(let i=0; i<12; i++) {
  state = detector.update(sidePose(), i * 50);
  console.log(state.measurement.primaryValue, state.progress, state.active);
}

console.log("Feed 2 (Partial Crunch):");
for(let i=0; i<12; i++) {
  state = detector.update(sidePose({ shoulder: [0.4, 0.43] }), 800 + i * 50);
  console.log(state.measurement.primaryValue, state.progress, state.active);
}

console.log("Feed 3 (Return to Extended):");
for(let i=0; i<12; i++) {
  state = detector.update(sidePose(), 1800 + i * 50);
  console.log(state.measurement.primaryValue, state.progress, state.active);
}

console.log(detector.snapshot());
