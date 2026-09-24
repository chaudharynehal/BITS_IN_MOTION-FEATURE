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
  const sysDefault = voices.find(v => v.default);
  if (sysDefault) return sysDefault;
  return null;
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
  let nextUtteranceMessage = null;
  let nextUtteranceIsRep = false;
  
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
    } else {
      debugData.selectedVoiceName = 'System default';
      debugData.selectedVoiceLang = 'System default';
    }
    debugData.voicesLoaded = voices.length;
    onTelemetry({ ...debugData, queuedText: nextUtteranceMessage || 'None' });
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
    nextUtteranceMessage = null;
    nextUtteranceIsRep = false;
    
    try {
      speech().cancel();
      emitTelemetry();
    } catch {
      // Speech is optional
    }
  }

  function processQueue() {
    if (activeUtterance) return;
    if (!nextUtteranceMessage) return;
    
    const message = nextUtteranceMessage;
    const isRep = nextUtteranceIsRep;
    nextUtteranceMessage = null;
    nextUtteranceIsRep = false;
    
    startSpeech(message, isRep);
  }

  function startSpeech(message, isRepCount = false) {
    try {
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
      
      const onComplete = () => {
        activeUtterance = null;
        emitTelemetry();
        processQueue();
      };
      
      utterance.onend = () => {
        debugData.lastEndText = message;
        debugData.lastEndAt = clock();
        onComplete();
      };
      
      utterance.onerror = (e) => {
        debugData.lastErrorText = `Error [${e.error}]: ${message}`;
        debugData.lastErrorAt = clock();
        onComplete();
      };

      activeUtterance = utterance;
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

  function doSpeak(message, isRepCount = false) {
    if (disposed || !supported() || !message) return false;
    
    if (activeUtterance || speech().speaking || speech().pending) {
      if (nextUtteranceMessage === message) {
        return false; // Drop duplicate
      }
      nextUtteranceMessage = message;
      nextUtteranceIsRep = isRepCount;
      emitTelemetry();
      return true;
    }
    
    return startSpeech(message, isRepCount);
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
