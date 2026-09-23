import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, CheckCircle2, CircleStop, Info, LoaderCircle, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { getCameraErrorState, isCameraSupported, startCamera, stopCamera } from '../vision/camera';
import { clearPoseOverlay, drawPoseOverlay } from '../vision/poseLandmarker';
import { createPoseProvider } from '../vision/poseProvider';
import { createExerciseDetector, DETECTOR_CONFIGS } from '../vision/exerciseDetectors';
import { createSubjectTracker } from '../vision/subjectContinuity';
import { createVideoBrightnessSampler } from '../vision/frameReadiness';
import { VOICE_CUES, VOICE_STORAGE_KEY, createVoiceController, repVoiceMessage, savedVoicePreference } from '../vision/voiceCoach';

const INITIAL_FEEDBACK = { key: 'initial', message: 'Keep your full body visible and follow the setup guide', tone: 'neutral', priority: 0, until: 0 };

const CAMERA_EXERCISES = [
  { id: 'squats', name: 'Squats', detail: 'Knee angle' },
  { id: 'pushups', name: 'Push-ups', detail: 'Elbow angle' },
  { id: 'crunches', name: 'Crunches', detail: 'Torso angle' },
  { id: 'jumping-jacks', name: 'Jumping Jacks', detail: 'Stance width' },
];

export default function CoachScreen({
  exerciseId = 'squats',
  activeWorkout = null,
  onBack,
  onHome,
  onEndSession,
  onSkip,
  previewMode = false,
  onSelectExercise,
}) {
  const detectorConfig = DETECTOR_CONFIGS[exerciseId] || DETECTOR_CONFIGS.squats;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const trackEndCleanupRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const detectorRef = useRef(createExerciseDetector(exerciseId));
  const subjectTrackerRef = useRef(createSubjectTracker());
  const brightnessSamplerRef = useRef(createVideoBrightnessSampler());
  const voiceControllerRef = useRef(null);
  const feedbackRef = useRef(INITIAL_FEEDBACK);
  const sessionStartedAtRef = useRef(null);
  const framingInterruptionsRef = useRef(0);
  const missingPoseRef = useRef(false);
  const cueCountsRef = useRef({});
  const lastCueKeyRef = useRef(null);
  const lastMeasurementRef = useRef(null);
  const mountedRef = useRef(true);
  const cameraRequestRef = useRef(null);
  const modelRequestRef = useRef(0);
  const summaryRef = useRef(null);
  const processingRef = useRef(false);
  const lastUiStateRef = useRef({ at: 0, reps: 0, stage: 'Finding start', measurementValue: null, measurementUnit: '°' });
  const captureDataRef = useRef([]);

  // Developer mode backend selection
  const debugParams = new URLSearchParams(window.location.search);
  const isDebugMode = debugParams.get('cameraDebug') === '1';
  const [poseBackend, setPoseBackend] = useState(isDebugMode ? (debugParams.get('backend') || 'mediapipe') : 'mediapipe');
  const lastLatenciesRef = useRef([]);
  const [diagnosticData, setDiagnosticData] = useState({ fps: 0, latency: 0 });
  const [isCapturing, setIsCapturing] = useState(false);

  const [modelStatus, setModelStatus] = useState('loading');
  const [movenetStatus, setMovenetStatus] = useState({ status: 'NOT_REQUESTED', error: null });
  const [modelNote, setModelNote] = useState('Loading the lightweight pose model…');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [reps, setReps] = useState(0);
  const [stage, setStage] = useState('Finding start');
  const [measurementValue, setMeasurementValue] = useState(null);
  const [measurementUnit, setMeasurementUnit] = useState('°');
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(savedVoicePreference);
  const lastSpokenRepRef = useRef(0);
  const [voiceTelemetry, setVoiceTelemetry] = useState({});
  if (voiceControllerRef.current === null) voiceControllerRef.current = createVoiceController({ onTelemetry: (data) => setVoiceTelemetry(data) });
  const speechSupported = voiceControllerRef.current.supported();

  useEffect(() => {
    if (previewSummary) summaryRef.current?.showModal();
  }, [previewSummary]);

  const speakCue = useCallback((message, { force = false } = {}) => {
    voiceControllerRef.current?.speak(message, { enabled: voiceEnabled && speechSupported, force });
  }, [speechSupported, voiceEnabled]);

  const publishFeedback = useCallback((cue) => {
    const now = performance.now();
    const current = feedbackRef.current;

    if (cue.message === current.message) {
      if (!current.spoken && (now - current.firstSeen) > 400) {
        current.spoken = true;
        if (VOICE_CUES[cue.key]) speakCue(VOICE_CUES[cue.key], { force: false, priority: cue.priority });
      }
      current.until = now + (cue.holdMs || 700);
      return;
    }

    if (now < current.until && cue.priority <= current.priority) return;

    const next = { ...cue, firstSeen: now, spoken: false, until: now + (cue.holdMs || 700) };
    feedbackRef.current = next;

    if (cue.key && cue.key !== lastCueKeyRef.current) {
      cueCountsRef.current[cue.key] = (cueCountsRef.current[cue.key] || 0) + 1;
      lastCueKeyRef.current = cue.key;
    }

    if (mountedRef.current) setFeedback(next);

    // High priority readiness (6) or success (7+) cues speak faster, but let's just make success instant
    // framing cues (priority 6) are 400ms stable.
    if (cue.priority >= 7) {
      next.spoken = true;
      if (VOICE_CUES[cue.key]) speakCue(VOICE_CUES[cue.key], { force: true, priority: cue.priority });
    }
  }, [speakCue]);

  useEffect(() => {
    stopSessionCamera();
    sessionStartedAtRef.current = null;
    framingInterruptionsRef.current = 0;
    missingPoseRef.current = false;
    detectorRef.current = createExerciseDetector(exerciseId);
    subjectTrackerRef.current.reset();
    brightnessSamplerRef.current.reset();
    cueCountsRef.current = {};
    lastCueKeyRef.current = null;
    lastMeasurementRef.current = null;
    lastSpokenRepRef.current = 0;
    voiceControllerRef.current?.resetThrottle();
    voiceControllerRef.current?.cancel();
    feedbackRef.current = INITIAL_FEEDBACK;
    lastUiStateRef.current = { at: 0, reps: 0, stage: 'Finding start', measurementValue: null, measurementUnit: exerciseId === 'jumping-jacks' ? '×' : '°' };
    setReps(0);
    setStage('Finding start');
    setMeasurementValue(null);
    setMeasurementUnit(exerciseId === 'jumping-jacks' ? '×' : '°');
    setFeedback(INITIAL_FEEDBACK);
    setPreviewSummary(null);
  }, [exerciseId, poseBackend]);

  const loadModel = useCallback(async () => {
    const request = ++modelRequestRef.current;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setModelStatus('loading');
    setModelNote(`Loading the ${poseBackend === 'movenet' ? 'MoveNet Thunder' : 'MediaPipe'} pose model…`);
    try {
      const provider = await createPoseProvider(poseBackend, () => {
        if (mountedRef.current) setModelNote('GPU unavailable—switching to compatible CPU mode…');
      }, (statusUpdate) => {
        if (mountedRef.current) setMovenetStatus(statusUpdate);
      });
      if (!mountedRef.current || modelRequestRef.current !== request) {
        provider.close();
        return;
      }
      landmarkerRef.current = provider;
      setModelStatus('ready');
      setModelNote('Pose model ready');
    } catch (error) {
      console.error('Pose model initialization failed.', error);
      if (mountedRef.current && modelRequestRef.current === request) {
        setModelStatus('error');
        setModelNote('The pose model could not load. Check the connection and try again.');
      }
    }
  }, [poseBackend]);

  useEffect(() => {
    mountedRef.current = true;
    loadModel();
    return () => {
      mountedRef.current = false;
      modelRequestRef.current += 1;
      cameraRequestRef.current?.abort();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      releaseTrackEndListeners();
      stopCamera(streamRef.current, videoRef.current);
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      voiceControllerRef.current?.dispose();
    };
  }, [loadModel]);

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const provider = landmarkerRef.current;
    if (!video || !canvas || !provider || !streamRef.current || processingRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      processingRef.current = true;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (video.videoWidth && video.videoHeight) setVideoAspect(video.videoWidth / video.videoHeight);
      }

      try {
        const now = performance.now();
        const brightness = brightnessSamplerRef.current.sample(video, now);
        const result = await provider.detect(video, now);

        if (!mountedRef.current || streamRef.current !== video.srcObject) {
          processingRef.current = false;
          return;
        }

        const trackedPose = subjectTrackerRef.current.update(result.landmarks || [], result.worldLandmarks || []);
        const landmarks = trackedPose?.landmarks;
        drawPoseOverlay(canvas, landmarks);
        const state = detectorRef.current.update({
          landmarks,
          worldLandmarks: trackedPose?.worldLandmarks,
          frameBrightness: brightness,
        }, now);
        const measurement = state.measurement;

        // Diagnostic Data update
        if (isDebugMode) {
          lastLatenciesRef.current.push({ time: now, latency: result.inferenceLatency });
          if (lastLatenciesRef.current.length > 30) lastLatenciesRef.current.shift();
          const avgLatency = lastLatenciesRef.current.reduce((a, b) => a + b.latency, 0) / lastLatenciesRef.current.length;
          const oldest = lastLatenciesRef.current[0].time;
          const fps = lastLatenciesRef.current.length > 1 ? (lastLatenciesRef.current.length - 1) * 1000 / Math.max(1, now - oldest) : 0;
          setDiagnosticData((prev) => {
            const updates = {
              fps: Math.round(fps),
              latency: Math.round(avgLatency),
              poseDetected: !!landmarks,
              side: measurement.side || 'N/A',
              rawAngle: state.rawMeasurement?.primaryValue
            };
            if (state.event === 'rejected') updates.lastRejection = state.rejectReason || 'NOT_READY';
            else if (state.event) updates.lastTransition = state.event;
            return { ...prev, ...updates };
          });

          if (isCapturing) {
            captureDataRef.current.push({
              timestamp: now,
              exercise: exerciseId,
              poseBackend,
              visibility: measurement.valid ? measurement.visibility : 0,
              angles: measurement,
              movementPhase: state.phaseLabel,
              repCount: state.reps,
              event: state.event,
              rejectReason: state.rejectReason,
              manualLabel: null,
              landmarks: landmarks ? landmarks.map(l => l ? { x: l.x, y: l.y, z: l.z, v: l.visibility } : null) : null
            });
          }
        }

        if (state.reps > lastSpokenRepRef.current) {
          lastSpokenRepRef.current = state.reps;
          speakCue(repVoiceMessage(state.reps), { force: true });
        }

        const nextUi = {
          reps: state.reps,
          stage: state.phaseLabel,
          measurementValue: measurement.valid ? Math.round(measurement.primaryValue * 10) / 10 : null,
          measurementUnit: measurement.metricUnit || '°',
        };
        const previousUi = lastUiStateRef.current;
        const changed = previousUi.reps !== nextUi.reps
          || previousUi.stage !== nextUi.stage
          || previousUi.measurementValue !== nextUi.measurementValue
          || previousUi.measurementUnit !== nextUi.measurementUnit;
        if (changed || state.event === 'rep' || now - previousUi.at >= 120) {
          setReps(nextUi.reps);
          setStage(nextUi.stage);
          setMeasurementValue(nextUi.measurementValue);
          setMeasurementUnit(nextUi.measurementUnit);
          lastUiStateRef.current = { ...nextUi, at: now };
        }
        lastMeasurementRef.current = measurement.valid ? measurement : null;

        if (!measurement.valid) {
          if (!missingPoseRef.current) framingInterruptionsRef.current += 1;
          missingPoseRef.current = true;
          publishFeedback(state.feedback);
        } else {
          missingPoseRef.current = false;
          publishFeedback(state.feedback);
        }
      } catch (error) {
        console.error(error);
        stopSessionCamera();
        setModelStatus('error');
        setModelNote('Pose tracking stopped because the model could not process the camera. Retry the model, then start a new session.');
        processingRef.current = false;
        return;
      }
      processingRef.current = false;
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [publishFeedback, speakCue, isDebugMode, isCapturing, exerciseId, poseBackend]);

  function releaseTrackEndListeners() {
    trackEndCleanupRef.current?.();
    trackEndCleanupRef.current = null;
  }

  function handleUnexpectedTrackEnd(stream) {
    if (!mountedRef.current || streamRef.current !== stream) return;
    releaseTrackEndListeners();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
    brightnessSamplerRef.current.reset();
    clearPoseOverlay(canvasRef.current);
    setCameraStatus('error');
    setCameraError('The camera stopped unexpectedly. Check your camera and try again.');
    voiceControllerRef.current?.cancel();
  }

  function watchStreamEnd(stream) {
    releaseTrackEndListeners();
    const tracks = stream?.getVideoTracks?.() || stream?.getTracks?.() || [];
    const handleEnded = () => handleUnexpectedTrackEnd(stream);
    tracks.forEach((track) => track.addEventListener?.('ended', handleEnded));
    trackEndCleanupRef.current = () => {
      tracks.forEach((track) => track.removeEventListener?.('ended', handleEnded));
    };
  }

  async function handleStartCamera() {
    if (cameraRequestRef.current || streamRef.current || !DETECTOR_CONFIGS[exerciseId]) return;
    if (!isCameraSupported()) {
      setCameraStatus('unsupported');
      setCameraError('This browser does not provide camera access. Try a current version of Chrome, Edge or Safari.');
      return;
    }
    setCameraStatus('starting');
    setCameraError('');
    const request = new AbortController();
    cameraRequestRef.current = request;
    try {
      const stream = await startCamera(videoRef.current, { signal: request.signal });
      if (!mountedRef.current || request.signal.aborted) {
        stopCamera(stream, videoRef.current);
        return;
      }
      streamRef.current = stream;
      watchStreamEnd(stream);
      subjectTrackerRef.current.reset();
      brightnessSamplerRef.current.reset();
      sessionStartedAtRef.current = Date.now();
      lastVideoTimeRef.current = -1;
      setCameraStatus('running');
      speakCue(VOICE_CUES.ready, { force: true });
      animationRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      if (!mountedRef.current || request.signal.aborted) return;
      const state = getCameraErrorState(error);
      setCameraStatus(state.status);
      setCameraError(state.message);
    } finally {
      if (cameraRequestRef.current === request) cameraRequestRef.current = null;
    }
  }

  function stopSessionCamera() {
    cameraRequestRef.current?.abort();
    cameraRequestRef.current = null;
    releaseTrackEndListeners();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
    brightnessSamplerRef.current.reset();
    clearPoseOverlay(canvasRef.current);
    setCameraStatus('idle');
    voiceControllerRef.current?.cancel();
  }

  function handleReset() {
    detectorRef.current.reset();
    setReps(0);
    setStage('Finding start');
    setMeasurementValue(null);
    sessionStartedAtRef.current = Date.now();
    framingInterruptionsRef.current = 0;
    missingPoseRef.current = false;
    cueCountsRef.current = {};
    lastCueKeyRef.current = null;
    lastMeasurementRef.current = null;
    lastSpokenRepRef.current = 0;
    voiceControllerRef.current?.resetThrottle();
    voiceControllerRef.current?.cancel();
    const next = { ...INITIAL_FEEDBACK, until: performance.now() + 700 };
    feedbackRef.current = next;
    setFeedback(next);
    lastUiStateRef.current = { at: 0, reps: 0, stage: 'Finding start', measurementValue: null, measurementUnit };
  }

  function handleEnd() {
    if (!streamRef.current) return;
    const durationSeconds = sessionStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000))
      : 0;
    stopSessionCamera();

    if (previewMode) {
      setPreviewSummary({
        reps,
        durationSeconds,
        exerciseName: detectorConfig.name.replace(' coach', ''),
      });
      return;
    }

    const formSummary = reps === 0
      ? `No complete ${detectorConfig.name.toLowerCase()} movement cycle was captured yet.`
      : framingInterruptionsRef.current === 0
        ? `Completed ${reps} stable, visibility-qualified ${reps === 1 ? 'repetition' : 'repetitions'}.`
        : `Completed ${reps} ${reps === 1 ? 'repetition' : 'repetitions'} with ${framingInterruptionsRef.current} framing ${framingInterruptionsRef.current === 1 ? 'reminder' : 'reminders'}.`;
    onEndSession?.({
      exerciseId,
      exerciseName: detectorConfig.name.replace(' coach', ''),
      reps,
      durationSeconds,
      startedAt: sessionStartedAtRef.current ? new Date(sessionStartedAtRef.current).toISOString() : null,
      formSummary,
      framingInterruptions: framingInterruptionsRef.current,
      cueCounts: cueCountsRef.current,
      movementMetrics: lastMeasurementRef.current ? {
        metricLabel: lastMeasurementRef.current.metricLabel,
        lastValue: lastMeasurementRef.current.primaryValue,
        unit: lastMeasurementRef.current.metricUnit,
      } : {},
    });
  }

  function handleSkip() {
    stopSessionCamera();
    onSkip?.();
  }

  function handleBack() {
    stopSessionCamera();
    onBack();
  }

  function handleHome() {
    stopSessionCamera();
    onHome();
  }

  const canStart = modelStatus === 'ready' && ['idle', 'denied', 'unsupported', 'error'].includes(cameraStatus);
  const isRunning = cameraStatus === 'running';
  const isFloorExercise = exerciseId === 'pushups' || exerciseId === 'crunches';

  function dismissSummary() {
    summaryRef.current?.close();
    setPreviewSummary(null);
    handleReset();
    document.querySelector('.preview-exercise-tab[aria-pressed="true"]')?.focus();
  }


  function toggleCapture() {
    if (isCapturing) {
      setIsCapturing(false);
      // Export capture
      if (captureDataRef.current.length > 0) {
        const blob = new Blob([captureDataRef.current.map(d => JSON.stringify(d)).join('\n')], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pose-capture-${exerciseId}-${Date.now()}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
      }
      captureDataRef.current = [];
    } else {
      captureDataRef.current = [];
      setIsCapturing(true);
    }
  }

  function addManualLabel(label) {
    if (captureDataRef.current.length > 0) {
      captureDataRef.current[captureDataRef.current.length - 1].manualLabel = label;
      alert(`Labeled last frame: ${label}`);
    }
  }

  function copyDiagnostics() {
    const data = {
      timestamp: new Date().toISOString(),
      poseBackend,
      exercise: exerciseId,
      fps: diagnosticData.fps,
      inferenceLatency: diagnosticData.latency,
      poseDetected: diagnosticData.poseDetected,
      side: diagnosticData.side,
      reps,
      stage,
      visibleCue: feedback.message,
      lastTransition: diagnosticData.lastTransition,
      lastRejection: diagnosticData.lastRejection,
      smoothedAngle: measurementValue,
      rawAngle: diagnosticData.rawAngle,
      movenetStatus,
      speechTelemetry: voiceTelemetry,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).catch(console.error);
    alert('Diagnostics copied to clipboard');
  }

  return (
    <main className={'coach-page ' + (previewMode ? 'coach-page-preview' : '')}>
      {isDebugMode && (
        <div className="debug-panel" style={{ background: '#000', color: '#0f0', padding: '10px', fontSize: '12px', fontFamily: 'monospace', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <div><strong>DEBUG MODE</strong></div>
          <div>
            Backend:
            <select value={poseBackend} onChange={(e) => setPoseBackend(e.target.value)} style={{ background: '#333', color: '#0f0', marginLeft: '5px' }}>
              <option value="mediapipe">MediaPipe</option>
              <option value="movenet">MoveNet Thunder</option>
            </select>
          </div>
          <div>FPS: {diagnosticData.fps} | Latency: {diagnosticData.latency}ms</div>
          <div>Pose Detected: {diagnosticData.poseDetected ? 'YES' : 'NO'} | Side: {diagnosticData.side}</div>
          <div>Exercise: {exerciseId} | Phase: {stage}</div>
          <div>Reps: {reps}</div>
          <div>Smoothed Angle: {measurementValue}{measurementUnit} | Raw: {diagnosticData.rawAngle ? Math.round(diagnosticData.rawAngle * 10)/10 : 'N/A'}{measurementUnit}</div>
          <div>Visible Cue: {feedback.message}</div>
          <div>Last Transition: {diagnosticData.lastTransition || 'None'}</div>
          {diagnosticData.lastRejection && <div style={{ color: '#f00' }}>Last Rejection: {diagnosticData.lastRejection}</div>}

          {poseBackend === 'movenet' && (
            <div>MoveNet Status: {movenetStatus.status} {movenetStatus.error ? `(${movenetStatus.error})` : ''}</div>
          )}

          <div style={{ marginTop: '5px', borderTop: '1px solid #0f0', paddingTop: '5px' }}>
            <div><strong>VOICE DEBUG</strong></div>
            <div>Supported: {voiceTelemetry.supported ? 'YES' : 'NO'} | Voices: {voiceTelemetry.voicesLoaded}</div>
            <div>Voice: {voiceTelemetry.selectedVoiceName} ({voiceTelemetry.selectedVoiceLang})</div>
            <div>Pending: {voiceTelemetry.pending ? 'Y':'N'} | Speaking: {voiceTelemetry.speaking ? 'Y':'N'} | Paused: {voiceTelemetry.paused ? 'Y':'N'}</div>
            <div>Last Req: {voiceTelemetry.lastRequested}</div>
            <div>Last Start: {voiceTelemetry.lastStartText}</div>
            <div>Last End: {voiceTelemetry.lastEndText}</div>
            {voiceTelemetry.lastErrorText && <div style={{ color: '#f00' }}>Error: {voiceTelemetry.lastErrorText}</div>}
            <button onClick={() => voiceControllerRef.current?.directTestSpeak('Voice test successful.')} style={{ background: '#333', color: '#0f0', border: '1px solid #0f0', marginTop: '5px', padding: '2px 5px' }}>TEST VOICE</button>
          </div>

          <button onClick={copyDiagnostics} style={{ background: '#333', color: '#0f0', border: '1px solid #0f0', marginTop: '5px', padding: '2px 5px' }}>Copy Diagnostics</button>

          <div style={{ marginTop: '10px', borderTop: '1px solid #0f0', paddingTop: '5px' }}>
            <button onClick={toggleCapture} style={{ background: isCapturing ? '#f00' : '#333', color: '#fff', border: '1px solid #0f0', padding: '2px 5px' }}>
              {isCapturing ? 'Stop & Export JSONL' : 'Start Capture'}
            </button>
            {isCapturing && (
              <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                <button onClick={() => addManualLabel('VALID_REP')} style={{ background: '#333', color: '#0f0' }}>VALID_REP</button>
                <button onClick={() => addManualLabel('PARTIAL_REP')} style={{ background: '#333', color: '#0f0' }}>PARTIAL_REP</button>
                <button onClick={() => addManualLabel('BAD_FORM')} style={{ background: '#333', color: '#0f0' }}>BAD_FORM</button>
                <button onClick={() => addManualLabel('NOISE')} style={{ background: '#333', color: '#0f0' }}>NOISE</button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewMode && (
        <div className="preview-mode-banner" role="status">
          <span className="preview-mode-pill"><ShieldAlert size={14} /> Preview Mode</span>
          <span>This session will not be saved. Try on-device pose detection freely.</span>
        </div>
      )}

      <div className="coach-topbar">
        <div className="coach-navigation">
          <button className="icon-button icon-button-dark" onClick={handleBack} aria-label="Back to previous screen"><ArrowLeft size={21} /></button>
          <button className="coach-home-button" type="button" onClick={handleHome} aria-label="Go to BITS in Motion homepage"><img src="/logo.png" alt="" /><span>Home</span></button>
        </div>
        <div>
          <span className="eyebrow light">
            {activeWorkout ? `Workout · Movement ${activeWorkout.currentIndex + 1} of ${activeWorkout.exercises.length}` : previewMode ? 'Camera Coach Preview' : `Live ${detectorConfig.name}`}
          </span>
          <small>{activeWorkout ? activeWorkout.planTitle : previewMode ? detectorConfig.name : 'Basic observable pose feedback'}</small>
        </div>
        <div className="coach-topbar-actions">
          <button
            className={'coach-audio-toggle ' + (voiceEnabled ? 'active' : '')}
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              try { window.localStorage.setItem(VOICE_STORAGE_KEY, String(next)); } catch {}
              if (!next && speechSupported) {
                voiceControllerRef.current?.cancel();
              } else if (next && speechSupported) {
                voiceControllerRef.current?.speak('Voice coach on.', { enabled: true, force: true });
              }
            }}
            type="button"
            disabled={!speechSupported}
            aria-pressed={voiceEnabled}
            aria-label={!speechSupported ? 'Voice cues are not supported in this browser' : voiceEnabled ? 'Mute voice cues' : 'Enable audio voice cues'}
            title={!speechSupported ? 'Voice cues unavailable in this browser' : voiceEnabled ? 'Voice cues active' : 'Voice cues muted'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{!speechSupported ? 'Voice unavailable' : voiceEnabled ? 'Voice on' : 'Voice off'}</span>
          </button>
          <button className="coach-reset" onClick={handleReset} disabled={!isRunning}><RotateCcw size={17} /> Reset</button>
        </div>
      </div>

      {previewMode && (
        <div className="preview-exercise-nav" role="group" aria-label="Select camera exercise to preview">
          {CAMERA_EXERCISES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={exerciseId === item.id}
              className={'preview-exercise-tab ' + (exerciseId === item.id ? 'active' : '')}
              onClick={() => {
                if (exerciseId !== item.id) {
                  stopSessionCamera();
                  onSelectExercise?.(item.id);
                }
              }}
            >
              <strong>{item.name}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      )}

      <div className="coach-layout">
        <section className="camera-panel">
          {isFloorExercise && (
            <aside className="floor-placement-banner" role="note">
              <Info size={18} />
              <div>
                <strong>Floor setup tip</strong>
                <span>{detectorConfig.setupTip}</span>
              </div>
            </aside>
          )}

          <div className="camera-viewport" style={{ aspectRatio: videoAspect }} data-running={isRunning || undefined}>
            <video ref={videoRef} playsInline muted aria-label="Live camera preview" />
            <canvas ref={canvasRef} aria-label="Pose landmark overlay" />

            {!isRunning && (
              <div className="camera-empty">
                {modelStatus === 'loading' && <><LoaderCircle className="spin" size={38} /><h2>Preparing your coach</h2><p>{modelNote}</p></>}
                {modelStatus === 'error' && <><TriangleAlert size={38} /><h2>Model unavailable</h2><p>{modelNote}</p><button className="button button-white" onClick={loadModel}><RefreshCw size={18} /> Retry model</button></>}
                {modelStatus === 'ready' && ['idle', 'starting'].includes(cameraStatus) && <><Camera size={40} /><h2>{cameraStatus === 'starting' ? 'Starting camera…' : 'Ready when you are'}</h2><p>{detectorConfig.placement}</p><button className="button button-primary button-large" onClick={handleStartCamera} disabled={!canStart}>{cameraStatus === 'starting' ? <LoaderCircle className="spin" size={18} /> : <Camera size={18} />} Start Camera</button></>}
                {modelStatus === 'ready' && ['denied', 'unsupported', 'error'].includes(cameraStatus) && <><VideoOff size={40} /><h2>{cameraStatus === 'denied' ? 'Camera permission needed' : cameraStatus === 'unsupported' ? 'Camera not supported' : 'Camera could not start'}</h2><p>{cameraError}</p>{cameraStatus !== 'unsupported' && <button className="button button-white" onClick={handleStartCamera}><RefreshCw size={18} /> Try again</button>}</>}
              </div>
            )}

            {isRunning && (
              <>
                <div className="live-badge"><span /> Live<em> · on-device</em></div>
                <div className={`coach-ready-indicator ${measurementValue !== null ? 'ready' : 'waiting'}`}>
                  {measurementValue !== null ? (
                    <><Check size={14} /> Tracking</>
                  ) : (
                    <><Info size={14} /> {feedback.message}</>
                  )}
                </div>
              </>
            )}

            <div className="coach-hud" aria-hidden={!isRunning || undefined}>
              <div className="rep-card" data-testid="coach-rep-card">
                <span>Reps</span>
                <strong>{reps}</strong>
                <small>{detectorConfig.name}</small>
              </div>
              <div className="coach-hud-metrics">
                <div><span>Stage</span><strong>{stage}</strong></div>
                <div><span>{detectorConfig.metricLabel}</span><strong>{measurementValue === null ? '—' : `${Math.round(measurementValue * 10) / 10}${measurementUnit}`}</strong></div>
              </div>
            </div>
          </div>

          <div className={`coach-feedback ${feedback.tone}`} aria-live="polite" data-testid="coach-feedback">
            <span>{feedback.tone === 'success' ? 'On track' : feedback.tone === 'warning' ? 'Adjust' : 'Coach cue'}</span>
            <strong>{feedback.message}</strong>
          </div>

          <div className="coach-controls">
            <button className="button button-danger" onClick={handleEnd} disabled={!isRunning} data-testid="coach-end-session"><CircleStop size={18} /> End session</button>
            {activeWorkout && <button className="button button-quiet button-quiet-dark" type="button" onClick={handleSkip} data-testid="coach-skip-movement">Skip this movement</button>}
          </div>
        </section>

        <aside className="coach-metrics">
          <div className="coach-guide panel-dark">
            <span className="eyebrow light">Three simple cues</span>
            <ol>{detectorConfig.guide.map((cue, index) => <li key={cue}><i>{index + 1}</i>{cue}</li>)}</ol>
          </div>
          <div className="local-processing"><ShieldCheck size={20} /><p><strong>No camera recording.</strong> Frames are processed in the browser and discarded immediately.</p></div>
          <div className="coach-disclaimer"><Info size={16} /> This prototype gives basic visible pose cues, not medical or trainer-level assessment.</div>
        </aside>
      </div>

      {previewSummary && (
        <dialog ref={summaryRef} className="preview-summary-modal" aria-label="Preview summary" onCancel={(event) => { event.preventDefault(); dismissSummary(); }}>
          <div className="preview-summary-card">
            <div className="preview-summary-icon"><CheckCircle2 size={38} /></div>
            <h2>Preview Completed</h2>
            <p>
              You completed <strong>{previewSummary.reps} {previewSummary.reps === 1 ? 'rep' : 'reps'}</strong> of {previewSummary.exerciseName} in {previewSummary.durationSeconds}s.
            </p>
            <div className="preview-summary-note">
              <ShieldCheck size={18} />
              <span>Preview Mode: This session was not recorded or saved to any account or storage.</span>
            </div>
            <div className="preview-summary-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={dismissSummary}
              >
                <RotateCcw size={17} /> Try another movement
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={handleHome}
              >
                Return to Home
              </button>
            </div>
          </div>
        </dialog>
      )}
    </main>
  );
}
