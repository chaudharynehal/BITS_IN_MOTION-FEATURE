export const VOICE_STORAGE_KEY = 'bits-motion-voice-coach';

export const VOICE_CUES = Object.freeze({
  ready: 'Ready.',
  'no-person': 'Step into view.',
  'move-farther': 'Move back.',
  'move-closer': 'Move closer.',
  'full-body': 'Full body in frame.',
  'key-joints': 'Keep joints visible.',
  'adjust-angle': 'Adjust camera angle.',
  'improve-lighting': 'Improve lighting.',
  'overhead-room': 'More overhead room.',
  lower: 'Go lower.',
  'curl-more': 'Curl further.',
  'body-line': 'Straighten your body.',
  wider: 'Open wider.',
  'good-depth': 'Good depth.',
  'great-rep': 'Good rep.',
  'press-up': 'Press back up.',
  return: 'Return with control.',
  close: 'Return to center.',
});

/** Speech priority levels */
export const SPEECH_PRIORITY = Object.freeze({
  SETUP: 6,       // readiness / framing
  REP_COUNT: 9,   // rep completion
  FORM: 4,        // form corrections
  POSITIVE: 7,    // positive form feedback (good depth, good rep)
  TEST: 10,       // manual test voice (highest)
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

/**
 * Voice controller with ownership-token-based cancellation protection.
 *
 * Each utterance gets a unique generation token. Only a higher-priority or
 * explicit cancel can terminate the current utterance. The cancel reason
 * and source are always tracked for telemetry.
 */
export function createVoiceController({
  windowRef = globalThis.window,
  clock = () => performance.now(),
  throttleMs = 5500,
  onTelemetry = () => {},
} = {}) {
  const supported = () => isSpeechSupported(windowRef);
  let lastSpokenCue = '';
  let lastSpokenAt = -Infinity;
  let lastPriority = 0;
  let voices = null;
  let disposed = false;
  let previousVoicesChanged = null;
  let utteranceGeneration = 0;  // monotonically increasing ownership token
  let activeGeneration = 0;     // generation of the currently speaking utterance
  let activePriority = 0;       // priority of the currently speaking utterance

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
    lastCancelReason: '',
    lastCancelSource: '',
    lastCancelAt: 0,
    utteranceId: 0,
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
    debugData.utteranceId = utteranceGeneration;
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

  /**
   * Cancel current speech with a tracked reason and source.
   * @param {string} reason - why the cancellation happened
   * @param {string} source - which code path triggered it
   */
  function cancel(reason = 'explicit', source = 'unknown') {
    if (!supported()) return;
    debugData.lastCancelReason = reason;
    debugData.lastCancelSource = source;
    debugData.lastCancelAt = clock();
    activeGeneration = 0;
    activePriority = 0;
    try {
      speech().cancel();
      emitTelemetry();
    } catch {
      // Speech is optional
    }
  }

  /**
   * Internal: create and speak an utterance with ownership tracking.
   * @returns {number} the generation token of the utterance
   */
  function _doSpeak(message, priority, voiceMode = 'coach') {
    const gen = ++utteranceGeneration;
    try {
      if (activePriority > priority) {
        // Drop lower-priority cue, do not interrupt the higher priority one
        return 0;
      }

      // If we are replacing an existing utterance of equal or lower priority
      if (activePriority > 0) {
        cancel(activePriority < priority ? `preempted by priority ${priority}` : 'new equal priority utterance', 'speak-replace');
      }

      const utterance = new windowRef.SpeechSynthesisUtterance(message);
      if (voiceMode === 'coach') {
        const voice = selectCoachVoice(cachedVoices());
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
      }
      utterance.rate = 0.98;
      utterance.pitch = 1;
      utterance.volume = 0.9;

      utterance.onstart = () => {
        if (activeGeneration === gen) {
          debugData.lastStartText = message;
          debugData.lastStartAt = clock();
          emitTelemetry();
        }
      };
      utterance.onend = () => {
        if (activeGeneration === gen) {
          debugData.lastEndText = message;
          debugData.lastEndAt = clock();
          activeGeneration = 0;
          activePriority = 0;
          emitTelemetry();
        }
      };
      utterance.onerror = (e) => {
        debugData.lastErrorText = `Error [${e.error}]: ${message}`;
        debugData.lastErrorAt = clock();
        if (activeGeneration === gen) {
          activeGeneration = 0;
          activePriority = 0;
        }
        emitTelemetry();
      };

      activeGeneration = gen;
      activePriority = priority;
      debugData.lastRequested = message;
      speech().speak(utterance);
      emitTelemetry();
      return gen;
    } catch (e) {
      debugData.lastErrorText = `Throw: ${e.message}`;
      debugData.lastErrorAt = clock();
      emitTelemetry();
      return 0;
    }
  }

  /**
   * Direct test speak - highest priority, immune to coaching cancellation.
   * @param {string} message
   * @param {string} [voiceMode] - 'auto' uses default browser voice, otherwise uses coach voice
   * @returns {boolean}
   */
  function directTestSpeak(message, voiceMode = 'coach') {
    if (disposed || !supported() || !message) return false;
    const gen = _doSpeak(message, SPEECH_PRIORITY.TEST, voiceMode);
    return gen > 0;
  }

  /**
   * Speak a coaching cue. Respects throttling and priority.
   * Will NOT cancel a higher-priority utterance (e.g., TEST VOICE).
   */
  function speak(message, { enabled = true, force = false, priority = SPEECH_PRIORITY.FORM } = {}) {
    if (disposed || !enabled || !supported() || !message) return false;
    const now = clock();

    // Never cancel a higher-priority utterance
    if (activePriority > priority && activeGeneration > 0) return false;

    if (!force && (message === lastSpokenCue || now - lastSpokenAt < throttleMs)) return false;

    lastSpokenCue = message;
    lastSpokenAt = now;
    lastPriority = priority;

    return _doSpeak(message, priority) > 0;
  }

  function resetThrottle() {
    lastSpokenCue = '';
    lastSpokenAt = -Infinity;
    lastPriority = 0;
  }

  function dispose() {
    disposed = true;
    detachVoicesChanged();
    cancel('dispose', 'controller-dispose');
  }

  refreshVoices();
  attachVoicesChanged();

  return {
    cancel: (reason, source) => cancel(reason || 'explicit', source || 'external'),
    dispose,
    refreshVoices,
    resetThrottle,
    selectVoice: () => selectCoachVoice(cachedVoices()),
    speak,
    directTestSpeak,
    supported,
    snapshot: () => ({ lastSpokenCue, lastSpokenAt, voiceCount: cachedVoices().length, disposed, activeGeneration, activePriority }),
  };
}
