import { describe, expect, it } from 'vitest';
import { createSquatCounter } from './squatStateMachine';

function hold(counter, angle, start, visibility = 1) {
  let result;
  [0, 50, 100, 150].forEach((offset) => {
    result = counter.update({ angle, visibility, timestamp: start + offset });
  });
  return result;
}

describe('squat state machine', () => {
  it('counts three slow Standing → Down → Standing cycles exactly once each', () => {
    const counter = createSquatCounter();
    hold(counter, 172, 0);

    for (let rep = 0; rep < 3; rep += 1) {
      const base = 600 + rep * 1900;
      hold(counter, 96, base);
      hold(counter, 172, base + 900);
    }

    expect(counter.snapshot()).toEqual({ reps: 3, phase: 'standing' });
  });

  it('does not count a partial squat without reaching the down threshold', () => {
    const counter = createSquatCounter();
    hold(counter, 172, 0);
    hold(counter, 130, 600);
    hold(counter, 172, 1200);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('does not count low-visibility measurements', () => {
    const counter = createSquatCounter();
    hold(counter, 172, 0);
    hold(counter, 95, 700, 0.3);
    hold(counter, 172, 1500);
    expect(counter.snapshot().reps).toBe(0);
  });

  it('enforces the minimum interval between repetitions', () => {
    const counter = createSquatCounter({ minRepIntervalMs: 1200 });
    hold(counter, 172, 0);
    hold(counter, 95, 500);
    hold(counter, 172, 900);
    expect(counter.snapshot().reps).toBe(1);
    hold(counter, 95, 1100);
    hold(counter, 172, 1500);
    expect(counter.snapshot().reps).toBe(1);
  });
});
