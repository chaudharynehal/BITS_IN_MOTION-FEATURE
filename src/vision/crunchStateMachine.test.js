import { describe, expect, it } from 'vitest';
import { createCrunchCounter } from './crunchStateMachine';

function hold(counter, input, start, visibility = 1) {
  let result;
  const sample = typeof input === 'number' ? { angle: input } : input;
  [0, 50, 100, 150].forEach((offset) => {
    result = counter.update({ ...sample, visibility, timestamp: start + offset });
  });
  return result;
}

describe('crunch state machine', () => {
  it('counts one complete extended → flexed → extended repetition exactly once', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    hold(counter, 154, 1450);
    hold(counter, 154, 1800);
    expect(counter.snapshot()).toEqual({ reps: 1, phase: 'extended' });
  });

  it('rejects partial movement without the flexed threshold', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 116, 650);
    hold(counter, 154, 1450);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('counts a soft-angle crunch only when shoulder-to-knee range confirms torso flexion', () => {
    const counter = createCrunchCounter();
    hold(counter, { angle: 160, shoulderKneeRatio: 2.2, torsoCompression: 1.2 }, 0);
    hold(counter, { angle: 118, shoulderKneeRatio: 1.55, torsoCompression: 0.88 }, 700);
    hold(counter, { angle: 160, shoulderKneeRatio: 2.15, torsoCompression: 1.17 }, 1550);
    expect(counter.snapshot()).toEqual({ reps: 1, phase: 'extended' });
  });

  it('rejects soft-angle movement when torso compression does not change enough', () => {
    const counter = createCrunchCounter();
    hold(counter, { angle: 160, shoulderKneeRatio: 2.2, torsoCompression: 1.2 }, 0);
    hold(counter, { angle: 118, shoulderKneeRatio: 2.05, torsoCompression: 1.12 }, 700);
    hold(counter, { angle: 160, shoulderKneeRatio: 2.15, torsoCompression: 1.17 }, 1550);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('rejects noisy single-frame threshold crossings', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    counter.update({ angle: 98, visibility: 1, timestamp: 700 });
    counter.update({ angle: 121, visibility: 1, timestamp: 750 });
    counter.update({ angle: 101, visibility: 1, timestamp: 800 });
    hold(counter, 154, 1450);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('does not double count repeated extended or flexed frames', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    hold(counter, 94, 900);
    hold(counter, 154, 1500);
    hold(counter, 154, 1800);
    expect(counter.snapshot().reps).toBe(1);
  });

  it('rejects a bounce that returns before the minimum rep duration', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 300);
    hold(counter, 154, 560);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('cancels an incomplete repetition after landmarks are lost', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    counter.update({ angle: null, visibility: 0, timestamp: 1000 });
    counter.update({ angle: null, visibility: 0, timestamp: 2300 });
    hold(counter, 154, 2600);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('recovers from temporary tracking loss without losing a valid in-progress rep', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    counter.update({ angle: null, visibility: 0, timestamp: 1000 });
    counter.update({ angle: null, visibility: 0, timestamp: 1120 });
    hold(counter, 154, 1500);
    expect(counter.snapshot()).toEqual({ reps: 1, phase: 'extended' });
  });

  it('reset clears count and calibration', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    hold(counter, 154, 1450);
    expect(counter.snapshot().reps).toBe(1);
    expect(counter.reset()).toEqual({ reps: 0, phase: 'finding-start' });
    hold(counter, 94, 2200);
    hold(counter, 154, 3000);
    expect(counter.snapshot().reps).toBe(0);
  });
});
