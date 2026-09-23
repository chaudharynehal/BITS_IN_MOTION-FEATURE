import { describe, expect, it } from 'vitest';
import { measureCrunch, measurePushup } from './exerciseMeasurements';
import { createExerciseDetector } from './exerciseDetectors';

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

function feed(detector, landmarks, start, frames = 12) {
  let state;
  for (let frame = 0; frame < frames; frame += 1) state = detector.update(landmarks, start + frame * 50);
  return state;
}

describe('exercise landmark measurements', () => {
  it('selects the visible side and measures extended and flexed crunch geometry', () => {
    const extended = measureCrunch(sidePose());
    const flexed = measureCrunch(sidePose({ shoulder: [0.48, 0.35] }));
    expect(extended).toMatchObject({ valid: true, side: 'left', primaryValue: 180, framingReason: 'ready' });
    expect(flexed.valid).toBe(true);
    expect(flexed.primaryValue).toBeLessThan(105);
  });

  it('rejects low-confidence floor landmarks and reports useful framing', () => {
    const measurement = measureCrunch(sidePose({ visibility: 0.2 }));
    expect(measurement.valid).toBe(false);
    expect(measurement.framingReason).toBe('key-joints');
  });

  it('does not require ankle visibility for crunch setup', () => {
    const measurement = measureCrunch(sidePose({ ankleVisibility: 0.05 }));
    expect(measurement).toMatchObject({ valid: true, framingReason: 'ready' });
  });

  it('reports low light before claiming the body is ready', () => {
    const measurement = measureCrunch({ landmarks: sidePose(), frameBrightness: 0.06 });
    expect(measurement).toMatchObject({ valid: false, framingReason: 'improve-lighting' });
  });

  it('identifies a vertical camera setup for a floor movement', () => {
    const measurement = measurePushup(sidePose({ shoulder: [0.5, 0.2], hip: [0.5, 0.48], ankle: [0.52, 0.86] }));
    expect(measurement.valid).toBe(false);
    expect(measurement.framingReason).toBe('adjust-angle');
  });

  it('counts a synthetic full crunch once through smoothing and visibility gates', () => {
    const detector = createExerciseDetector('crunches');
    feed(detector, sidePose(), 0);
    feed(detector, sidePose({ shoulder: [0.48, 0.35] }), 800);
    feed(detector, sidePose(), 1800);
    expect(detector.snapshot()).toEqual({ reps: 1, phase: 'extended' });
  });

  it('does not count a synthetic partial crunch', () => {
    const detector = createExerciseDetector('crunches');
    feed(detector, sidePose(), 0);
    feed(detector, sidePose({ shoulder: [0.4, 0.43] }), 800);
    feed(detector, sidePose(), 1800);
    expect(detector.snapshot().reps).toBe(0);
  });
});
