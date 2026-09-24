import { describe, expect, it, vi } from 'vitest';
import { createVoiceController, savedVoicePreference, isSpeechSupported } from './voiceCoach';

function fakeWindow({ voices = [], storageValue = null } = {}) {
  const listeners = {};
  return {
    localStorage: {
      getItem: () => storageValue,
    },
    SpeechSynthesisUtterance: class FakeUtterance {
      constructor(text) {
        this.text = text;
        this.rate = 1;
        this.volume = 1;
      }
    },
    speechSynthesis: {
      pending: false,
      speaking: false,
      paused: false,
      getVoices: () => voices,
      speak: vi.fn(function speak(utt) {
        this.speaking = true;
        if (utt.onstart) utt.onstart();
        setTimeout(() => {
          this.speaking = false;
          if (utt.onend) utt.onend();
        }, 10);
      }),
      cancel: vi.fn(),
      addEventListener: (evt, cb) => { listeners[evt] = cb; },
      removeEventListener: vi.fn(),
      dispatch: (evt) => { if (listeners[evt]) listeners[evt](); },
    },
  };
}

describe('voice coach', () => {
  it('speaks when enabled and applies selected voice settings', () => {
    let now = 1000;
    const win = fakeWindow({ voices: [{ name: 'Natural India', lang: 'en-IN' }] });
    const controller = createVoiceController({ windowRef: win, clock: () => now });

    expect(controller.speak('Good rep.', { enabled: true })).toBe(true);
    expect(win.speechSynthesis.speak).toHaveBeenCalledOnce();
    
    const callArgs = win.speechSynthesis.speak.mock.calls[0][0];
    expect(callArgs.text).toBe('Good rep.');
    expect(callArgs.lang).toBe('en-IN');
    expect(callArgs.voice.name).toBe('Natural India');
    expect(callArgs.rate).toBe(0.98);

    now += 6000;
    win.speechSynthesis.speaking = false;
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
    const controller = createVoiceController({ windowRef: win, clock: () => now, throttleMs: 5000 });

    expect(controller.speak('Ready.', { enabled: true })).toBe(true);
    expect(controller.speak('Ready.', { enabled: true })).toBe(false);
    
    // Within throttle, different message, but speak() is occupied so it drops unless isRepCount
    now += 1000;
    win.speechSynthesis.speaking = true;
    expect(controller.speak('Move back.', { enabled: true })).toBe(false);
    
    // Rep counts can interrupt
    expect(controller.speakRep(3, true)).toBe(true);
    expect(win.speechSynthesis.cancel).toHaveBeenCalled();
    expect(win.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    expect(win.speechSynthesis.speak.mock.calls[1][0].text).toBe('Three.');
  });

  it('adds period to cues lacking punctuation', () => {
    let now = 1000;
    const win = fakeWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => now });

    expect(controller.speak('Move back', { enabled: true })).toBe(true);
    expect(win.speechSynthesis.speak.mock.calls[0][0].text).toBe('Move back.');
  });

  it('normalizes compound hyphenated cues', () => {
    let now = 1000;
    const win = fakeWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => now });

    expect(controller.speak('Step into frame — no body detected', { enabled: true })).toBe(true);
    expect(win.speechSynthesis.speak.mock.calls[0][0].text).toBe('Step into frame.');
  });
  
  it('reads the saved preference only when speech is available', () => {
    expect(savedVoicePreference(fakeWindow({ storageValue: 'true' }))).toBe(true);
    expect(savedVoicePreference(fakeWindow({ storageValue: 'false' }))).toBe(false);
    expect(savedVoicePreference({ localStorage: { getItem: () => 'true' } })).toBe(false);
  });

  it('directTestSpeak is forced and bypasses normal rules', () => {
    let now = 1000;
    const win = fakeWindow();
    const controller = createVoiceController({ windowRef: win, clock: () => now });

    controller.directTestSpeak('Voice test successful.');
    expect(win.speechSynthesis.speak).toHaveBeenCalledOnce();
    expect(win.speechSynthesis.speak.mock.calls[0][0].text).toBe('Voice test successful.');
  });
});
