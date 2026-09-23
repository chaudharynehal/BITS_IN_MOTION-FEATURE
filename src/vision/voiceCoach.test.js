import { describe, expect, it, vi } from 'vitest';
import {
  createVoiceController,
  repVoiceMessage,
  savedVoicePreference,
  selectCoachVoice,
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
    expect(win.speechSynthesis.cancel).toHaveBeenCalledOnce();
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
});
