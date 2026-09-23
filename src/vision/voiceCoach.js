export const VOICE_STORAGE_KEY = 'bits-motion-voice-coach';

export const VOICE_CUES = Object.freeze({
  ready: 'Ready.',
  'no-person': 'Step into frame.',
  'move-farther': 'Move a little farther back.',
  'move-closer': 'Move a little closer.',
  'full-body': 'Keep your full body in frame.',
  'key-joints': 'Keep the key joints visible.',
  'adjust-angle': 'Adjust the camera angle.',
  'improve-lighting': 'Improve the lighting.',
  'overhead-room': 'Leave overhead room.',
  lower: 'Go lower.',
  'curl-more': 'Curl a little further.',
  'body-line': 'Straighten your body line.',
  wider: 'Open wider.',
});

const NUMBER_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
  'Nineteen', 'Twenty',
];

function langRank(lang = '') {
  const normalized = lang.toLowerCase();
  if (normalized.startsWith('en-in')) return 0;
  if (normalized.startsWith('en-gb')) return 1;
  if (normalized.startsWith('en-us')) return 2;
  if (normalized.startsWith('en')) return 3;
  return 9;
}

function nameQuality(name = '') {
  const normalized = name.toLowerCase();
  if (/(neural|natural|premium|enhanced|siri|google|microsoft|online)/.test(normalized)) return 0;
  if (/(female|male|voice)/.test(normalized)) return 1;
  return 2;
}

export function selectCoachVoice(voices = []) {
  const english = voices.filter((voice) => voice?.lang?.toLowerCase().startsWith('en'));
  if (!english.length) return null;
  return [...english].sort((a, b) => {
    const byLang = langRank(a.lang) - langRank(b.lang);
    if (byLang) return byLang;
    const byQuality = nameQuality(a.name) - nameQuality(b.name);
    if (byQuality) return byQuality;
    return String(a.name || '').localeCompare(String(b.name || ''));
  })[0];
}

export function repVoiceMessage(count) {
  return NUMBER_WORDS[count] ? `${NUMBER_WORDS[count]}.` : `${count}.`;
}

export function isSpeechSupported(windowRef = globalThis.window) {
  return Boolean(windowRef?.speechSynthesis && windowRef?.SpeechSynthesisUtterance);
}

export function savedVoicePreference(windowRef = globalThis.window) {
  try {
    return isSpeechSupported(windowRef) && windowRef.localStorage?.getItem(VOICE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function createVoiceController({
  windowRef = globalThis.window,
  clock = () => performance.now(),
  throttleMs = 5500,
  onTelemetry = () => {},
} = {}) {
  const supported = () => isSpeechSupported(windowRef);
  let lastSpokenCue = '';
  let lastSpokenAt = -Infinity;
  let voices = null;
  let disposed = false;
  let previousVoicesChanged = null;

  let debugData = {
    supported: supported(),
    voicesLoaded: 0,
    selectedVoiceName: 'None',
    selectedVoiceLang: 'None',
    pending: false,
    speaking: false,
    paused: false,
    lastRequested: '',
    lastStartText: '',
    lastStartAt: 0,
    lastEndText: '',
    lastEndAt: 0,
    lastErrorText: '',
    lastErrorAt: 0,
  };

  const speech = () => windowRef?.speechSynthesis;

  function emitTelemetry() {
    if (!supported()) return;
    const synth = speech();
    if (synth) {
      debugData.pending = synth.pending;
      debugData.speaking = synth.speaking;
      debugData.paused = synth.paused;
    }
    const voice = selectCoachVoice(cachedVoices());
    if (voice) {
      debugData.selectedVoiceName = voice.name;
      debugData.selectedVoiceLang = voice.lang;
    }
    debugData.voicesLoaded = cachedVoices().length;
    onTelemetry({ ...debugData });
  }

  function refreshVoices() {
    if (!supported()) {
      voices = [];
      return voices;
    }
    try {
      voices = speech().getVoices?.() || [];
    } catch {
      voices = [];
    }
    emitTelemetry();
    return voices;
  }

  function cachedVoices() {
    return voices || refreshVoices();
  }

  function attachVoicesChanged() {
    if (!supported()) return;
    const synthesis = speech();
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', refreshVoices);
      return;
    }
    if ('onvoiceschanged' in synthesis) {
      previousVoicesChanged = synthesis.onvoiceschanged;
      synthesis.onvoiceschanged = (...args) => {
        refreshVoices();
        if (typeof previousVoicesChanged === 'function') previousVoicesChanged.apply(synthesis, args);
      };
    }
  }

  function detachVoicesChanged() {
    if (!supported()) return;
    const synthesis = speech();
    if (typeof synthesis.removeEventListener === 'function') {
      synthesis.removeEventListener('voiceschanged', refreshVoices);
    } else if ('onvoiceschanged' in synthesis && previousVoicesChanged !== null) {
      synthesis.onvoiceschanged = previousVoicesChanged;
    }
  }

  function cancel() {
    if (!supported()) return;
    try {
      speech().cancel();
      emitTelemetry();
    } catch {
      // Speech is optional
    }
  }

  function directTestSpeak(message) {
    if (disposed || !supported() || !message) return false;
    try {
      cancel();
      const utterance = new windowRef.SpeechSynthesisUtterance(message);
      const voice = selectCoachVoice(cachedVoices());
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 0.98;
      utterance.pitch = 1;
      utterance.volume = 0.9;

      utterance.onstart = () => {
        debugData.lastStartText = message;
        debugData.lastStartAt = clock();
        emitTelemetry();
      };
      utterance.onend = () => {
        debugData.lastEndText = message;
        debugData.lastEndAt = clock();
        emitTelemetry();
      };
      utterance.onerror = (e) => {
        debugData.lastErrorText = `Error [${e.error}]: ${message}`;
        debugData.lastErrorAt = clock();
        emitTelemetry();
      };

      debugData.lastRequested = message;
      speech().speak(utterance);
      emitTelemetry();
      return true;
    } catch (e) {
      debugData.lastErrorText = `Throw: ${e.message}`;
      debugData.lastErrorAt = clock();
      emitTelemetry();
      return false;
    }
  }

  function speak(message, { enabled = true, force = false, priority = 4 } = {}) {
    if (disposed || !enabled || !supported() || !message) return false;
    const now = clock();

    if (!force && (message === lastSpokenCue || now - lastSpokenAt < throttleMs)) return false;

    lastSpokenCue = message;
    lastSpokenAt = now;
    lastPriority = priority;

    return directTestSpeak(message);
  }

  let lastPriority = 0;
  function resetThrottle() {
    lastSpokenCue = '';
    lastSpokenAt = -Infinity;
    lastPriority = 0;
  }

  function dispose() {
    disposed = true;
    detachVoicesChanged();
    cancel();
  }

  refreshVoices();
  attachVoicesChanged();

  return {
    cancel,
    dispose,
    refreshVoices,
    resetThrottle,
    selectVoice: () => selectCoachVoice(cachedVoices()),
    speak,
    directTestSpeak,
    supported,
    snapshot: () => ({ lastSpokenCue, lastSpokenAt, voiceCount: cachedVoices().length, disposed }),
  };
}
