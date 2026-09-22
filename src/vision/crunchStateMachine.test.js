import { describe, expect, it } from 'vitest';
import { createCrunchCounter } from './crunchStateMachine';

function hold(counter, angle, start, visibility = 1) {
  let result;
  [0, 50, 100, 150].forEach((offset) => {
    result = counter.update({ angle, visibility, timestamp: start + offset });
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

  it('cancels an incomplete repetition after landmarks are lost', () => {
    const counter = createCrunchCounter();
    hold(counter, 154, 0);
    hold(counter, 94, 650);
    counter.update({ angle: null, visibility: 0, timestamp: 1000 });
    counter.update({ angle: null, visibility: 0, timestamp: 2300 });
    hold(counter, 154, 2600);
    expect(counter.snapshot().reps).toBe(0);
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
