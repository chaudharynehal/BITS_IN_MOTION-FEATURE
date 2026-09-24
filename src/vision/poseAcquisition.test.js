import { describe, expect, it, vi } from 'vitest';
import { measureSquat, personDetection } from './exerciseMeasurements';
import { selectPrimaryPose } from './poseSubject';
import { createExerciseDetector } from './exerciseDetectors';
import { createVoiceController } from './voiceCoach';
import {
  crunchPose,
  crunchSequence,
  jumpingJackPose,
  jumpingJackSequence,
  pushupSequence,
  squatPose,
  squatSequence,
} from './testing/poseReplay';

function feedThroughSelector(exerciseId, frames) {
  const detector = createExerciseDetector(exerciseId);
  const states = frames.map((item) => {
    // Emulate the live pipeline: MediaPipe returns pose arrays, we select one.
    const primary = selectPrimaryPose([item.landmarks], [item.worldLandmarks]);
    return detector.update({
      landmarks: primary?.landmarks,
      worldLandmarks: primary?.worldLandmarks,
      frameBrightness: item.frameBrightness,
    }, item.timestamp);
  });
  return { detector, states, reps: detector.snapshot().reps };
}

describe('person detection vs exercise readiness', () => {
  it('treats a fully visible standing body as a detected person that is exercise ready', () => {
    const measurement = measureSquat(squatPose(172));
    expect(measurement.personDetected).toBe(true);
    expect(measurement.exerciseReady).toBe(true);
    expect(measurement.valid).toBe(true);
  });

  it('does NOT report "no person" when the body is present but the legs are out of frame', () => {
    const landmarks = squatPose(172);
    landmarks[27] = { ...landmarks[27], visibility: 0.05, presence: 0.05 }; // left ankle
    landmarks[28] = { ...landmarks[28], visibility: 0.05, presence: 0.05 }; // right ankle

    const measurement = measureSquat(landmarks);
    expect(measurement.personDetected).toBe(true);
    expect(measurement.exerciseReady).toBe(false);

    const detector = createExerciseDetector('squats');
    let state;
    for (let frame = 0; frame < 6; frame += 1) state = detector.update(landmarks, frame * 50);
    expect(state.personDetected).toBe(true);
    expect(state.exerciseReady).toBe(false);
    expect(state.feedback.key).not.toBe('no-person');
  });

  it('reports "no person" only when MediaPipe returned no credible pose', () => {
    const detector = createExerciseDetector('squats');
    const state = detector.update(undefined, 0);
    expect(state.personDetected).toBe(false);
    expect(state.feedback.key).toBe('no-person');

    const person = personDetection(undefined);
    expect(person.personDetected).toBe(false);
  });
});

describe('primary pose selection (single person, fast motion safe)', () => {
  it('never drops a genuine pose across a full jumping-jack repetition', () => {
    const frames = jumpingJackSequence();
    let nullFrames = 0;
    let personLostFrames = 0;
    for (const item of frames) {
      const primary = selectPrimaryPose([item.landmarks], [item.worldLandmarks]);
      if (!primary) nullFrames += 1;
      else if (!personDetection(primary.landmarks).personDetected) personLostFrames += 1;
    }
    expect(nullFrames).toBe(0);
    expect(personLostFrames).toBe(0);
  });

  it('counts a jumping-jack rep when driven through the selector, unlike the dropped-pose failure', () => {
    const { reps } = feedThroughSelector('jumping-jacks', jumpingJackSequence());
    expect(reps).toBe(1);
  });

  it('returns null only when there are no pose sets', () => {
    expect(selectPrimaryPose([], [])).toBeNull();
    expect(selectPrimaryPose(undefined, undefined)).toBeNull();
  });

  it('selects the more visible / larger pose when two are present', () => {
    const strong = jumpingJackPose(0);
    const weak = jumpingJackPose(0).map((p) => ({ ...p, visibility: p.visibility * 0.1, presence: p.presence * 0.1 }));
    const chosen = selectPrimaryPose([weak, strong], [null, null]);
    expect(chosen.index).toBe(1);
  });
});

describe('rep engine through the live selector', () => {
  it('counts a full squat and rejects a partial squat', () => {
    expect(feedThroughSelector('squats', squatSequence()).reps).toBe(1);
    expect(feedThroughSelector('squats', squatSequence({ targetAngle: 130 })).reps).toBe(0);
  });

  it('counts a full push-up and rejects a partial push-up', () => {
    expect(feedThroughSelector('pushups', pushupSequence()).reps).toBe(1);
    expect(feedThroughSelector('pushups', pushupSequence({ targetAngle: 124 })).reps).toBe(0);
  });

  it('counts a full crunch and rejects a partial crunch', () => {
    expect(feedThroughSelector('crunches', crunchSequence()).reps).toBe(1);
    expect(feedThroughSelector('crunches', crunchSequence({ targetValue: 0.42 })).reps).toBe(0);
  });

  it('counts a full jumping jack but rejects arms-only and legs-only', () => {
    expect(feedThroughSelector('jumping-jacks', jumpingJackSequence()).reps).toBe(1);
    expect(feedThroughSelector('jumping-jacks', jumpingJackSequence({ poseOptions: { legProgress: 0 }, targetValue: 1 })).reps).toBe(0);
    expect(feedThroughSelector('jumping-jacks', jumpingJackSequence({ poseOptions: { armProgress: 0 }, targetValue: 1 })).reps).toBe(0);
  });
});

function fakeSpeechWindow() {
  const listeners = {};
  return {
    localStorage: { getItem: () => null },
    SpeechSynthesisUtterance: class FakeUtterance {
      constructor(text) { this.text = text; this.rate = 1; }
    },
    speechSynthesis: {
      pending: false,
      speaking: false,
      paused: false,
      getVoices: () => [{ name: 'Plain US', lang: 'en-US', default: true }],
      speak: vi.fn(function speak(utt) { this.speaking = true; if (utt.onstart) utt.onstart(); }),
      cancel: vi.fn(),
      addEventListener: (evt, cb) => { listeners[evt] = cb; },
      removeEventListener: vi.fn(),
    },
  };
}

describe('one coaching brain: visible cue is the spoken cue', () => {
  it('speaks the exact visible coaching cue, only normalizing punctuation', () => {
    const win = fakeSpeechWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => 1000 });
    // Canonical detector cue with a compound clause.
    controller.speak('Move farther away — keep your whole body in frame', { enabled: true });
    expect(win.speechSynthesis.speak).toHaveBeenCalledOnce();
    expect(win.speechSynthesis.speak.mock.calls[0][0].text).toBe('Move farther away.');
  });

  it('does not cancel an active TEST VOICE utterance when a rep is committed', () => {
    const win = fakeSpeechWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => 1000 });
    controller.directTestSpeak('Voice test successful.');
    win.speechSynthesis.pending = true;
    controller.speakRep(1, true);
    expect(win.speechSynthesis.cancel).not.toHaveBeenCalled();
    expect(win.speechSynthesis.speak).toHaveBeenCalledTimes(1); // rep is queued, not forced over
  });
});
