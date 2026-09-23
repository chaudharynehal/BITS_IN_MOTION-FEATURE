import { describe, expect, it } from 'vitest';
import {
  appendSequences,
  createSeededRandom,
  crunchPose,
  crunchSequence,
  jumpingJackPose,
  jumpingJackSequence,
  pushupPose,
  pushupSequence,
  runExerciseReplay,
  squatPose,
  squatSequence,
  stationarySequence,
  withBrightness,
  withJitter,
  withVisibilityDrop,
} from './testing/poseReplay';

function expectReps(exerciseId, frames, expected) {
  const result = runExerciseReplay(exerciseId, frames);
  expect(result.reps).toBe(expected);
  expect(result.maxReps).toBe(expected);
  expect(result.states.every((state) => state.reps >= 0)).toBe(true);
  return result;
}

function partialSequence(factory, targetValue, options = {}) {
  return factory({ targetValue, ...options });
}

function incompleteTail(factory, targetValue, options = {}) {
  return factory({
    targetValue,
    targetHoldMs: 220,
    returnMs: 0,
    endHoldMs: 0,
    ...options,
  }).slice(0, -1);
}

describe('crunch replay corpus', () => {
  it.each([
    ['clean normal-speed crunch', crunchSequence(), 1],
    ['slow controlled crunch', crunchSequence({ moveToTargetMs: 1600, targetHoldMs: 700, returnMs: 1500 }), 1],
    ['faster valid crunch', crunchSequence({ moveToTargetMs: 430, targetHoldMs: 240, returnMs: 450 }), 1],
    ['partial crunch', partialSequence(crunchSequence, 0.42), 0],
    ['tiny shoulder movement', partialSequence(crunchSequence, 0.16), 0],
    ['held flexed position', crunchSequence({ targetHoldMs: 2600 }), 1],
    ['threshold rocking', withJitter(crunchSequence({ targetHoldMs: 1200 }), { seed: 42, amplitude: 0.007 }), 1],
    ['valid rep with landmark jitter', withJitter(crunchSequence(), { seed: 7, amplitude: 0.006, visibilityAmplitude: 0.05 }), 1],
    ['temporary shoulder visibility loss', withVisibilityDrop(crunchSequence(), { fromMs: 860, toMs: 1040, indexes: [11, 12] }), 1],
    ['temporary hip visibility loss', withVisibilityDrop(crunchSequence(), { fromMs: 860, toMs: 1040, indexes: [23, 24] }), 1],
    ['ankle landmarks unavailable', crunchSequence({ poseOptions: { ankleVisibility: 0.04 } }), 1],
    ['ten repeated crunches', crunchSequence({ reps: 10, betweenRepHoldMs: 360 }), 10],
    ['nine reps and one incomplete final rep', appendSequences(crunchSequence({ reps: 9 }), incompleteTail(crunchSequence, 0.38)), 9],
    ['pause between flexed and extended', crunchSequence({ targetHoldMs: 1700, returnMs: 950 }), 1],
    ['movement starts mid-rep', appendSequences(stationarySequence({ poseFactory: crunchPose, value: 1, durationMs: 650 }), crunchSequence()), 1],
    ['abrupt tracking reacquisition', withVisibilityDrop(crunchSequence({ reps: 2 }), { fromMs: 2100, toMs: 3400, indexes: [11, 12, 23, 24, 25, 26] }), 2],
  ])('%s', (_name, frames, expected) => {
    expectReps('crunches', frames, expected);
  });

  it('does not count a phantom rep when a trace starts flexed and only extends', () => {
    const frames = appendSequences(
      stationarySequence({ poseFactory: crunchPose, value: 1, durationMs: 800 }),
      partialSequence(crunchSequence, 0.2),
    );
    expectReps('crunches', frames, 0);
  });

  it('retains valid crunch counts across deterministic body and camera variation', () => {
    const random = createSeededRandom(1001);
    for (let index = 0; index < 120; index += 1) {
      const side = random() > 0.45 ? 'left' : 'right';
      const frames = withJitter(crunchSequence({
        poseOptions: {
          side,
          centerX: 0.46 + random() * 0.07,
          centerY: 0.53 + random() * 0.06,
          torsoLength: 0.27 + random() * 0.06,
          legLength: 0.23 + random() * 0.06,
          shoulderLift: 0.18 + random() * 0.06,
          foldForward: 0.88 + random() * 0.08,
          cameraTilt: (random() - 0.5) * 0.9,
          otherSideVisibility: 0.2 + random() * 0.35,
        },
        moveToTargetMs: 520 + random() * 900,
        returnMs: 520 + random() * 900,
        targetHoldMs: 260 + random() * 650,
      }), { seed: 2000 + index, amplitude: 0.004 + random() * 0.004 });
      expectReps('crunches', frames, 1);
    }
  });

  it('stationary crunch jitter cannot generate repetitions', () => {
    const frames = withJitter(
      stationarySequence({ poseFactory: crunchPose, value: 0.18, durationMs: 12000 }),
      { seed: 88, amplitude: 0.012, visibilityAmplitude: 0.08 },
    );
    expectReps('crunches', frames, 0);
  });
});

describe('squat replay corpus', () => {
  it.each([
    ['clean rep', squatSequence(), 1],
    ['slow rep', squatSequence({ moveToTargetMs: 1500, targetHoldMs: 700, returnMs: 1500 }), 1],
    ['fast valid rep', squatSequence({ moveToTargetMs: 430, targetHoldMs: 260, returnMs: 460 }), 1],
    ['partial depth', squatSequence({ targetAngle: 130 }), 0],
    ['threshold bouncing', withJitter(squatSequence({ targetAngle: 106, targetHoldMs: 1200 }), { seed: 31, amplitude: 0.006 }), 1],
    ['pause at bottom', squatSequence({ targetHoldMs: 2500 }), 1],
    ['pause standing', squatSequence({ startHoldMs: 2200, endHoldMs: 2200 }), 1],
    ['ten continuous reps', squatSequence({ reps: 10, betweenRepHoldMs: 320 }), 10],
    ['temporary knee loss', withVisibilityDrop(squatSequence(), { fromMs: 780, toMs: 980, indexes: [25, 26] }), 1],
    ['temporary ankle loss', withVisibilityDrop(squatSequence(), { fromMs: 780, toMs: 980, indexes: [27, 28] }), 1],
    ['body slightly rotated', squatSequence({ poseOptions: { otherSideVisibility: 0.84, upperBodyShift: 0.03 } }), 1],
    ['small unrelated upper-body motion', withJitter(squatSequence(), { seed: 41, amplitude: 0.004, indexes: [11, 12] }), 1],
  ])('%s', (_name, frames, expected) => {
    expectReps('squats', frames, expected);
  });

  it('standing hold and jitter do not repeatedly increment squats', () => {
    const frames = withJitter(
      stationarySequence({ poseFactory: squatPose, value: 172, durationMs: 15000 }),
      { seed: 202, amplitude: 0.01 },
    );
    expectReps('squats', frames, 0);
  });
});

describe('push-up replay corpus', () => {
  it.each([
    ['full push-up', pushupSequence(), 1],
    ['partial elbow bend', pushupSequence({ targetAngle: 124 }), 0],
    ['ten valid reps', pushupSequence({ reps: 10, betweenRepHoldMs: 360 }), 10],
    ['pause at bottom', pushupSequence({ targetHoldMs: 2400 }), 1],
    ['pause at top', pushupSequence({ startHoldMs: 2200, endHoldMs: 2200 }), 1],
    ['threshold jitter', withJitter(pushupSequence({ targetAngle: 94, targetHoldMs: 1000 }), { seed: 14, amplitude: 0.006 }), 1],
    ['temporary wrist loss', withVisibilityDrop(pushupSequence(), { fromMs: 850, toMs: 1050, indexes: [15, 16] }), 1],
    ['temporary shoulder loss', withVisibilityDrop(pushupSequence(), { fromMs: 850, toMs: 1050, indexes: [11, 12] }), 1],
    ['side-view variation', pushupSequence({ poseOptions: { side: 'right', shoulderX: 0.24, shoulderY: 0.54, otherSideVisibility: 0.18 } }), 1],
  ])('%s', (_name, frames, expected) => {
    expectReps('pushups', frames, expected);
  });

  it('hip sag blocks counting and surfaces a body-line cue', () => {
    const result = expectReps('pushups', pushupSequence({ poseOptions: { hipSag: 0.16 } }), 0);
    expect(result.states.some((state) => state.feedback.key === 'body-line')).toBe(true);
  });
});

describe('jumping-jack replay corpus', () => {
  it.each([
    ['full jack', jumpingJackSequence(), 1],
    ['partial arms only', jumpingJackSequence({ poseOptions: { legProgress: 0 }, targetValue: 1 }), 0],
    ['partial legs only', jumpingJackSequence({ poseOptions: { armProgress: 0 }, targetValue: 1 }), 0],
    ['ten valid repetitions', jumpingJackSequence({ reps: 10, betweenRepHoldMs: 240 }), 10],
    ['rapid motion', jumpingJackSequence({ moveToTargetMs: 300, targetHoldMs: 180, returnMs: 300 }), 1],
    ['slow motion', jumpingJackSequence({ moveToTargetMs: 1500, targetHoldMs: 700, returnMs: 1500 }), 1],
    ['overhead landmark loss', withVisibilityDrop(jumpingJackSequence(), { fromMs: 560, toMs: 1550, indexes: [15, 16] }), 1],
    ['threshold jitter', withJitter(jumpingJackSequence({ targetHoldMs: 1000 }), { seed: 71, amplitude: 0.007 }), 1],
  ])('%s', (_name, frames, expected) => {
    expectReps('jumping-jacks', frames, expected);
  });
});

describe('detector replay properties', () => {
  it.each([
    ['crunches', crunchSequence],
    ['squats', squatSequence],
    ['pushups', pushupSequence],
    ['jumping-jacks', jumpingJackSequence],
  ])('keeps one-rep counts stable at %s frame rates', (exerciseId, factory) => {
    for (const fps of [15, 24, 30, 60]) {
      expectReps(exerciseId, factory({ fps }), 1);
    }
  });

  it.each([
    ['crunches', crunchPose, 0],
    ['squats', squatPose, 172],
    ['pushups', pushupPose, 170],
    ['jumping-jacks', jumpingJackPose, 0],
  ])('stationary %s traces never drift upward during long sessions', (exerciseId, poseFactory, value) => {
    const frames = withJitter(
      stationarySequence({ poseFactory, value, durationMs: 20 * 60 * 1000, fps: 15 }),
      { seed: 909, amplitude: 0.003, visibilityAmplitude: 0.02 },
    );
    const result = expectReps(exerciseId, frames, 0);
    expect(result.states.length).toBeLessThanOrEqual(18000);
  });

  it('brightness gates readiness without changing valid geometry', () => {
    const normal = runExerciseReplay('crunches', withBrightness(crunchSequence(), 0.35));
    expect(normal.finalState.measurement.framingReason).toBe('ready');

    const dim = runExerciseReplay('crunches', withBrightness(crunchSequence(), 0.15));
    expect(dim.finalState.measurement.framingReason).toBe('ready');

    const low = runExerciseReplay('crunches', withBrightness(crunchSequence(), 0.05));
    expect(low.reps).toBe(0);
    expect(low.states.some((state) => state.feedback.key === 'improve-lighting')).toBe(true);
  });
});
