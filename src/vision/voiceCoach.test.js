import { describe, expect, it, vi } from 'vitest';
import {
  createVoiceController,
  repVoiceMessage,
  savedVoicePreference,
  selectCoachVoice,
  SPEECH_PRIORITY,
} from './voiceCoach';

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
  }
}

function fakeWindow({ voices = [], storageValue = 'true' } = {}) {
  const listeners = {};
  const speech = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn((event, handler) => { listeners[event] = handler; }),
    removeEventListener: vi.fn((event, handler) => {
      if (listeners[event] === handler) delete listeners[event];
    }),
    dispatch(event) {
      listeners[event]?.();
    },
    pending: false,
    speaking: false,
    paused: false,
  };
  return {
    SpeechSynthesisUtterance: FakeUtterance,
    speechSynthesis: speech,
    localStorage: {
      getItem: vi.fn(() => storageValue),
      setItem: vi.fn(),
    },
  };
}

describe('voice coach', () => {
  it('selects a natural English voice with the configured regional priority', () => {
    const selected = selectCoachVoice([
      { name: 'Plain US', lang: 'en-US' },
      { name: 'Natural India', lang: 'en-IN' },
      { name: 'Enhanced UK', lang: 'en-GB' },
    ]);
    expect(selected).toMatchObject({ name: 'Natural India', lang: 'en-IN' });
  });

  it('falls back to another English voice when en-IN is unavailable', () => {
    expect(selectCoachVoice([
      { name: 'Standard US', lang: 'en-US' },
      { name: 'Natural UK', lang: 'en-GB' },
    ])).toMatchObject({ name: 'Natural UK', lang: 'en-GB' });
  });

  it('speaks when enabled and applies selected voice settings', () => {
    let now = 1000;
    const win = fakeWindow({ voices: [{ name: 'Natural India', lang: 'en-IN' }] });
    const controller = createVoiceController({ windowRef: win, clock: () => now });

    expect(controller.speak('Good rep.', { enabled: true })).toBe(true);
    expect(win.speechSynthesis.speak).toHaveBeenCalledOnce();
    expect(win.speechSynthesis.speak.mock.calls[0][0]).toMatchObject({
      text: 'Good rep.',
      lang: 'en-IN',
      rate: 0.98,
      volume: 0.9,
      voice: { name: 'Natural India', lang: 'en-IN' },
    });

    now += 6000;
    expect(controller.speak('Move back.', { enabled: true })).toBe(true);
    expect(win.speechSynthesis.speak).toHaveBeenCalledTimes(2);
  });

  it('does not speak when disabled or unsupported', () => {
    const win = fakeWindow();
    const controller = createVoiceController({ windowRef: win });
    expect(controller.speak('Ready.', { enabled: false })).toBe(false);
    expect(win.speechSynthesis.speak).not.toHaveBeenCalled();

    const unsupported = createVoiceController({ windowRef: { localStorage: win.localStorage } });
    expect(unsupported.speak('Ready.', { enabled: true })).toBe(false);
  });

  it('throttles repeated cues but lets forced rep counts interrupt', () => {
    let now = 1000;
    const win = fakeWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => now, throttleMs: 5500 });

    expect(controller.speak('Ready.', { enabled: true })).toBe(true);
    expect(controller.speak('Ready.', { enabled: true })).toBe(false);
    now += 1000;
    expect(controller.speak('Move back.', { enabled: true })).toBe(false);
    expect(controller.speak(repVoiceMessage(3), { enabled: true, force: true })).toBe(true);
    expect(win.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    expect(win.speechSynthesis.speak.mock.calls[1][0].text).toBe('Three.');
  });

  it('updates cached voices after voiceschanged and cancels on dispose', () => {
    const voices = [{ name: 'Plain US', lang: 'en-US' }];
    const win = fakeWindow({ voices });
    const controller = createVoiceController({ windowRef: win });
    expect(controller.selectVoice()).toMatchObject({ name: 'Plain US' });

    voices.unshift({ name: 'Natural India', lang: 'en-IN' });
    win.speechSynthesis.dispatch('voiceschanged');
    expect(controller.selectVoice()).toMatchObject({ name: 'Natural India' });

    controller.dispose();
    expect(win.speechSynthesis.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    expect(win.speechSynthesis.cancel).toHaveBeenCalled();
    expect(controller.speak('Ready.', { enabled: true })).toBe(false);
  });

  it('reads the saved preference only when speech is available', () => {
    expect(savedVoicePreference(fakeWindow({ storageValue: 'true' }))).toBe(true);
    expect(savedVoicePreference(fakeWindow({ storageValue: 'false' }))).toBe(false);
    expect(savedVoicePreference({ localStorage: { getItem: () => 'true' } })).toBe(false);
  });

  describe('speech cancellation protection', () => {
    it('TEST VOICE is not cancelled by lower-priority coaching cue', () => {
      let now = 1000;
      const win = fakeWindow({ voices: [{ name: 'Natural India', lang: 'en-IN' }] });
      const controller = createVoiceController({ windowRef: win, clock: () => now });

      // User clicks TEST VOICE
      expect(controller.directTestSpeak('Voice test successful.')).toBe(true);
      const testGen = controller.snapshot().activeGeneration;
      expect(testGen).toBeGreaterThan(0);

      // Pose frame immediately updates with a coaching cue
      now += 50;
      const spoken = controller.speak('Step into view.', { enabled: true, priority: SPEECH_PRIORITY.SETUP });

      // The coaching cue should NOT have been spoken because TEST has higher priority
      expect(spoken).toBe(false);
      // The test utterance should still be the active one
      expect(controller.snapshot().activeGeneration).toBe(testGen);
    });

    it('cancel tracks reason and source', () => {
      let now = 1000;
      let lastTelemetry = {};
      const win = fakeWindow();
      const controller = createVoiceController({
        windowRef: win,
        clock: () => now,
        onTelemetry: (t) => { lastTelemetry = t; },
      });

      controller.cancel('voice-off', 'toggle-button');
      expect(lastTelemetry.lastCancelReason).toBe('voice-off');
      expect(lastTelemetry.lastCancelSource).toBe('toggle-button');
    });

    it('higher-priority cue can preempt lower-priority speech', () => {
      let now = 1000;
      const win = fakeWindow({ voices: [{ name: 'Test', lang: 'en-US' }] });
      const controller = createVoiceController({ windowRef: win, clock: () => now });

      // Start a low-priority coaching cue
      controller.speak('Go lower.', { enabled: true, priority: SPEECH_PRIORITY.FORM });
      const firstGen = controller.snapshot().activeGeneration;

      // Higher priority rep count arrives
      now += 100;
      controller.speak('Three.', { enabled: true, force: true, priority: SPEECH_PRIORITY.REP_COUNT });

      // The rep count should have replaced the coaching cue
      expect(controller.snapshot().activeGeneration).toBeGreaterThan(firstGen);
      expect(win.speechSynthesis.cancel).toHaveBeenCalled();
    });

    it('Voice ON click is not cancelled by subsequent pose frame', () => {
      let now = 1000;
      const win = fakeWindow({ voices: [{ name: 'Test', lang: 'en-US' }] });
      const controller = createVoiceController({ windowRef: win, clock: () => now });

      // Voice toggle ON speaks the announcement
      controller.speak('Voice coach on.', { enabled: true, force: true, priority: SPEECH_PRIORITY.POSITIVE });
      const onGen = controller.snapshot().activeGeneration;

      // Immediate pose frame with readiness change
      now += 30;
      const interrupted = controller.speak('Step into view.', { enabled: true, priority: SPEECH_PRIORITY.SETUP });

      // Setup cue (priority 6) should NOT preempt positive (priority 7)
      expect(interrupted).toBe(false);
      expect(controller.snapshot().activeGeneration).toBe(onGen);
    });
  });
});
