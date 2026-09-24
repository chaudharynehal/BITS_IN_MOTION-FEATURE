export const VOICE_STORAGE_KEY = 'bits-motion-voice-coach';

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

function selectVoice(voices = []) {
  // Use default voice first by trying to find one, but fallback gracefully
  const english = voices.filter(v => v.lang.startsWith('en'));
  if (english.length === 0) return null;
  // If possible prefer en-IN, then en-GB, then en-US, but don't force 'Rishi'
  return english.sort((a, b) => {
    if (a.default) return -1;
    if (b.default) return 1;
    if (a.lang.startsWith('en-IN') && !b.lang.startsWith('en-IN')) return -1;
    if (b.lang.startsWith('en-IN') && !a.lang.startsWith('en-IN')) return 1;
    return 0;
  })[0];
}

export function createVoiceController({
  windowRef = globalThis.window,
  clock = () => performance.now(),
  throttleMs = 5000,
  onTelemetry = () => {},
} = {}) {
  const supported = () => isSpeechSupported(windowRef);
  let voices = [];
  let disposed = false;
  
  let lastSpokenCue = '';
  let lastSpokenAt = -Infinity;
  let activeUtterance = null;
  
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
    const voice = selectVoice(voices);
    if (voice) {
      debugData.selectedVoiceName = voice.name;
      debugData.selectedVoiceLang = voice.lang;
    }
    debugData.voicesLoaded = voices.length;
    onTelemetry({ ...debugData });
  }

  function refreshVoices() {
    if (!supported()) return [];
    try {
      voices = speech().getVoices?.() || [];
    } catch {
      voices = [];
    }
    emitTelemetry();
    return voices;
  }

  function attachVoicesChanged() {
    if (!supported()) return;
    const synthesis = speech();
    if (typeof synthesis.addEventListener === 'function') {
      synthesis.addEventListener('voiceschanged', refreshVoices);
    }
  }

  function detachVoicesChanged() {
    if (!supported()) return;
    const synthesis = speech();
    if (typeof synthesis.removeEventListener === 'function') {
      synthesis.removeEventListener('voiceschanged', refreshVoices);
    }
  }

  function cancel(reason = 'explicit', source = 'unknown') {
    if (!supported()) return;
    
    debugData.lastCancelReason = reason;
    debugData.lastCancelSource = source;
    activeUtterance = null;
    
    try {
      speech().cancel();
      emitTelemetry();
    } catch {
      // Speech is optional
    }
  }

  function doSpeak(message, isRepCount = false) {
    if (disposed || !supported() || !message) return false;
    
    try {
      if (speech().speaking && !isRepCount) {
        // Do not interrupt currently speaking cue unless it's a rep count
        // "Avoid elaborate global cancellation behavior"
        return false;
      }
      
      const utterance = new windowRef.SpeechSynthesisUtterance(message);
      const voice = selectVoice(voices);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 0.98;
      
      utterance.onstart = () => {
        debugData.lastStartText = message;
        debugData.lastStartAt = clock();
        emitTelemetry();
      };
      utterance.onend = () => {
        debugData.lastEndText = message;
        debugData.lastEndAt = clock();
        activeUtterance = null;
        emitTelemetry();
      };
      utterance.onerror = (e) => {
        debugData.lastErrorText = `Error [${e.error}]: ${message}`;
        debugData.lastErrorAt = clock();
        activeUtterance = null;
        emitTelemetry();
      };

      activeUtterance = utterance;
      debugData.lastRequested = message;
      
      if (isRepCount) {
        // High priority: we can cancel existing speech to speak the rep count immediately
        cancel('rep priority', 'rep-count');
      }
      
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

  function speak(message, { enabled = true, force = false, isRepCount = false } = {}) {
    if (!enabled) return false;
    
    const now = clock();
    
    // Exact live-cue matching + throttle for repeat cues
    if (!force && message === lastSpokenCue && (now - lastSpokenAt < throttleMs)) {
      return false;
    }

    // Normalizing wording slightly per requirements "Step into frame — no body detected" -> "Step into frame."
    let speakMessage = message;
    if (message.includes('—')) {
      speakMessage = message.split('—')[0].trim() + '.';
    } else if (!message.endsWith('.')) {
      speakMessage = message + '.';
    }

    if (doSpeak(speakMessage, isRepCount)) {
      lastSpokenCue = message;
      lastSpokenAt = now;
      return true;
    }
    
    return false;
  }
  
  function speakRep(count, enabled = true) {
    if (!enabled) return false;
    
    let message = String(count);
    const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    if (count >= 0 && count <= 10) {
      message = NUMBER_WORDS[count];
    }
    
    if (count % 5 === 0 && count > 0) {
      message = `${message}, keep going`;
    }
    
    return speak(message, { enabled, force: true, isRepCount: true });
  }

  function directTestSpeak(message) {
    if (!supported()) return false;
    return doSpeak(message, true); // Force speak
  }

  function resetThrottle() {
    lastSpokenCue = '';
    lastSpokenAt = -Infinity;
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
    selectVoice: () => selectVoice(voices),
    speak,
    speakRep,
    directTestSpeak,
    supported,
    snapshot: () => ({ lastSpokenCue, lastSpokenAt, voiceCount: voices.length, disposed }),
  };
}
