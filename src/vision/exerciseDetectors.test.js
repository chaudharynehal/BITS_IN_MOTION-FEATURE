import { describe, expect, it } from 'vitest';
import { createExerciseDetector } from './exerciseDetectors';

function hold(detector, measurement, start) {
  let result;
  [0, 50, 100, 150].forEach((offset) => {
    result = detector.update(measurement, start + offset);
  });
  return result;
}

const provider = (measurement) => ({ visibility: 1, valid: true, metricLabel: 'Angle', metricUnit: '°', ...measurement });

describe('multi-exercise detectors', () => {
  it.each([
    ['pushups', { primaryValue: 170, bodyAngle: 175 }, { primaryValue: 85, bodyAngle: 175 }],
    ['crunches', { primaryValue: 155 }, { primaryValue: 90 }],
    ['jumping-jacks', { feetRatio: 0.9, armsClosed: true, armsOpen: false, primaryValue: 0.9 }, { feetRatio: 1.9, armsClosed: false, armsOpen: true, primaryValue: 1.9 }],
  ])('counts a complete %s start → target → start cycle', (exerciseId, startMeasurement, targetMeasurement) => {
    const detector = createExerciseDetector(exerciseId, { measurementProvider: provider });
    hold(detector, startMeasurement, 0);
    hold(detector, targetMeasurement, 600);
    hold(detector, startMeasurement, 1400);
    expect(detector.snapshot().reps).toBe(1);
  });

  it('rejects low-visibility measurements for push-ups', () => {
    const detector = createExerciseDetector('pushups', { measurementProvider: provider });
    hold(detector, { primaryValue: 170, bodyAngle: 175 }, 0);
    hold(detector, { primaryValue: 85, bodyAngle: 175, visibility: 0.2 }, 600);
    hold(detector, { primaryValue: 170, bodyAngle: 175 }, 1400);
    expect(detector.snapshot().reps).toBe(0);
  });
});
