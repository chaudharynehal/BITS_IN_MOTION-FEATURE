import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, CheckCircle2, CircleStop, Info, LoaderCircle, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { getCameraErrorState, isCameraSupported, startCamera, stopCamera } from '../vision/camera';
import { clearPoseOverlay, drawPoseOverlay, initializePoseLandmarker } from '../vision/poseLandmarker';
import { createExerciseDetector, DETECTOR_CONFIGS } from '../vision/exerciseDetectors';

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
  const lastVideoTimeRef = useRef(-1);
  const detectorRef = useRef(createExerciseDetector(exerciseId));
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

  const [modelStatus, setModelStatus] = useState('loading');
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastSpokenCueRef = useRef('');
  const lastSpokenTimeRef = useRef(0);
  const lastSpokenRepRef = useRef(0);

  useEffect(() => {
    if (previewSummary) summaryRef.current?.showModal();
  }, [previewSummary]);

  const publishFeedback = useCallback((cue) => {
    const now = performance.now();
    const current = feedbackRef.current;
    if (now < current.until && cue.priority < current.priority) return;
    if (cue.message === current.message && now < current.until) return;
    const next = { ...cue, until: now + (cue.holdMs || 700) };
    feedbackRef.current = next;
    if (cue.key && cue.key !== lastCueKeyRef.current) {
      cueCountsRef.current[cue.key] = (cueCountsRef.current[cue.key] || 0) + 1;
      lastCueKeyRef.current = cue.key;
    }
    if (mountedRef.current) setFeedback(next);

    if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window && cue.message) {
      if (cue.message !== lastSpokenCueRef.current && (now - lastSpokenTimeRef.current > 3500)) {
        lastSpokenCueRef.current = cue.message;
        lastSpokenTimeRef.current = now;
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cue.message);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch {}
      }
    }
  }, [voiceEnabled]);

  useEffect(() => {
    stopSessionCamera();
    sessionStartedAtRef.current = null;
    framingInterruptionsRef.current = 0;
    missingPoseRef.current = false;
    detectorRef.current = createExerciseDetector(exerciseId);
    cueCountsRef.current = {};
    lastCueKeyRef.current = null;
    lastMeasurementRef.current = null;
    lastSpokenRepRef.current = 0;
    feedbackRef.current = INITIAL_FEEDBACK;
    setReps(0);
    setStage('Finding start');
    setMeasurementValue(null);
    setMeasurementUnit(exerciseId === 'jumping-jacks' ? '×' : '°');
    setFeedback(INITIAL_FEEDBACK);
    setPreviewSummary(null);
  }, [exerciseId]);

  const loadModel = useCallback(async () => {
    const request = ++modelRequestRef.current;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setModelStatus('loading');
    setModelNote('Loading the lightweight pose model…');
    try {
      const landmarker = await initializePoseLandmarker(() => {
        if (mountedRef.current) setModelNote('GPU unavailable—switching to compatible CPU mode…');
      });
      if (!mountedRef.current || modelRequestRef.current !== request) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setModelStatus('ready');
      setModelNote('Pose model ready');
    } catch (error) {
      console.error('Pose model initialization failed.', error);
      if (mountedRef.current && modelRequestRef.current === request) {
        setModelStatus('error');
        setModelNote('The pose model could not load. Check the connection and try again.');
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadModel();
    return () => {
      mountedRef.current = false;
      modelRequestRef.current += 1;
      cameraRequestRef.current?.abort();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopCamera(streamRef.current, videoRef.current);
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, [loadModel]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (video.videoWidth && video.videoHeight) setVideoAspect(video.videoWidth / video.videoHeight);
      }

      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.landmarks?.[0];
        drawPoseOverlay(canvas, landmarks);
        const state = detectorRef.current.update(landmarks, performance.now());
        const measurement = state.measurement;

        if (state.reps > lastSpokenRepRef.current) {
          lastSpokenRepRef.current = state.reps;
          if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              const repUtterance = new SpeechSynthesisUtterance(`Rep ${state.reps}`);
              repUtterance.rate = 1.1;
              window.speechSynthesis.speak(repUtterance);
            } catch {}
          }
        }

        setReps(state.reps);
        setStage(state.phaseLabel);
        setMeasurementValue(measurement.valid ? measurement.primaryValue : null);
        setMeasurementUnit(measurement.metricUnit || '°');
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
        stopSessionCamera();
        setModelStatus('error');
        setModelNote('Pose tracking stopped because the model could not process the camera. Retry the model, then start a new session.');
        return;
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [publishFeedback]);

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
      sessionStartedAtRef.current = Date.now();
      lastVideoTimeRef.current = -1;
      setCameraStatus('running');
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
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
    clearPoseOverlay(canvasRef.current);
    setCameraStatus('idle');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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
    const next = { ...INITIAL_FEEDBACK, until: performance.now() + 700 };
    feedbackRef.current = next;
    setFeedback(next);
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

  return (
    <main className={'coach-page ' + (previewMode ? 'coach-page-preview' : '')}>
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
              if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            type="button"
            aria-label={voiceEnabled ? 'Mute voice cues' : 'Enable audio voice cues'}
            title={voiceEnabled ? 'Voice cues active' : 'Voice cues muted'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{voiceEnabled ? 'Voice on' : 'Voice off'}</span>
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
                <span>Place your device low (1–2 ft off ground or tilted down) about 6–8 ft away, with a side-on view so your entire body from head to feet is visible on the floor.</span>
              </div>
            </aside>
          )}

          <div className="camera-viewport" style={{ aspectRatio: videoAspect }}>
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
                <div className="live-badge"><span /> Live · processed locally</div>
                <div className={`coach-ready-indicator ${measurementValue !== null ? 'ready' : 'waiting'}`}>
                  {measurementValue !== null ? (
                    <><Check size={14} /> Full body in frame · Ready</>
                  ) : (
                    <><Info size={14} /> Step full body into camera view</>
                  )}
                </div>
              </>
            )}
          </div>

          <div className={`coach-feedback ${feedback.tone}`} aria-live="polite">
            <span>{feedback.tone === 'success' ? 'On track' : feedback.tone === 'warning' ? 'Adjust' : 'Coach cue'}</span>
            <strong>{feedback.message}</strong>
          </div>
        </section>

        <aside className="coach-metrics">
          <div className="rep-card"><span>Complete reps</span><strong>{reps}</strong><small>Stable full movement cycles</small></div>
          <div className="metric-row"><div><span>Movement stage</span><strong>{stage}</strong></div><div><span>{detectorConfig.metricLabel}</span><strong>{measurementValue === null ? '—' : `${Math.round(measurementValue * 10) / 10}${measurementUnit}`}</strong></div></div>
          <div className="coach-guide panel-dark">
            <span className="eyebrow light">Three simple cues</span>
            <ol>{detectorConfig.guide.map((cue, index) => <li key={cue}><i>{index + 1}</i>{cue}</li>)}</ol>
          </div>
          <div className="local-processing"><ShieldCheck size={20} /><p><strong>No camera recording.</strong> Frames are processed in the browser and discarded immediately.</p></div>
          <div className="coach-disclaimer"><Info size={16} /> This prototype gives basic visible pose cues, not medical or trainer-level assessment.</div>
          <button className="button button-danger" onClick={handleEnd} disabled={!isRunning}><CircleStop size={18} /> End session</button>
          {activeWorkout && <button className="button button-quiet" type="button" onClick={handleSkip}>Skip this movement</button>}
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
