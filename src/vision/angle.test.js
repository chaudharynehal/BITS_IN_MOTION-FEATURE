import { describe, expect, it } from 'vitest';
import { calculateAngle, calculateAngle3D, getBestKneeMeasurement } from './angle';

describe('calculateAngle', () => {
  it('calculates a straight knee as 180 degrees', () => {
    expect(calculateAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBe(180);
  });

  it('calculates a right angle', () => {
    expect(calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(90);
  });

  it('rejects a zero-length vector', () => {
    expect(calculateAngle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  it('calculates angles with depth when world landmarks are available', () => {
    expect(calculateAngle3D({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(90);
  });
});

describe('getBestKneeMeasurement', () => {
  it('chooses the leg with better minimum visibility', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
    landmarks[23] = { x: 0, y: 0, visibility: 0.7 };
    landmarks[25] = { x: 0, y: 1, visibility: 0.8 };
    landmarks[27] = { x: 0, y: 2, visibility: 0.9 };
    landmarks[24] = { x: 0, y: 0, visibility: 0.95 };
    landmarks[26] = { x: 0, y: 1, visibility: 0.95 };
    landmarks[28] = { x: 0, y: 2, visibility: 0.95 };

    expect(getBestKneeMeasurement(landmarks)).toMatchObject({ valid: true, side: 'right', angle: 180, visibility: 0.95 });
  });

  it('rejects a measurement when landmark visibility is low', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0.2 }));
    expect(getBestKneeMeasurement(landmarks)).toMatchObject({ valid: false, angle: null });
  });
});
