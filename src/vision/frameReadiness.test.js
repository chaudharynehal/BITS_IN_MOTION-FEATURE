import { describe, expect, it } from 'vitest';
import { averageLumaFromRgba, classifyBrightness } from './frameReadiness';

describe('frame readiness', () => {
  it('calculates normalized luminance from sampled pixels', () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      0, 0, 0, 255,
    ]);
    expect(averageLumaFromRgba(data)).toBeCloseTo(0.5, 3);
  });

  it('classifies near darkness separately from normal indoor brightness', () => {
    expect(classifyBrightness(0.05)).toBe('low');
    expect(classifyBrightness(0.15)).toBe('dim');
    expect(classifyBrightness(0.28)).toBe('ok');
  });
});
