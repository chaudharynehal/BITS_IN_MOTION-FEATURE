import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CircleStop, Info, LoaderCircle, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert, VideoOff } from 'lucide-react';
import { getCameraErrorState, isCameraSupported, startCamera, stopCamera } from '../vision/camera';
import { clearPoseOverlay, drawPoseOverlay, initializePoseLandmarker } from '../vision/poseLandmarker';
import { createExerciseDetector, DETECTOR_CONFIGS } from '../vision/exerciseDetectors';

const INITIAL_FEEDBACK = { key: 'initial', message: 'Keep your full body visible and follow the setup guide', tone: 'neutral', priority: 0, until: 0 };

export default function CoachScreen({ exerciseId = 'squats', onBack, onHome, onEndSession }) {
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
  }, []);

  useEffect(() => {
    detectorRef.current = createExerciseDetector(exerciseId);
    cueCountsRef.current = {};
    lastCueKeyRef.current = null;
    lastMeasurementRef.current = null;
    feedbackRef.current = INITIAL_FEEDBACK;
    setReps(0);
    setStage('Finding start');
    setMeasurementValue(null);
    setMeasurementUnit(exerciseId === 'jumping-jacks' ? '×' : '°');
    setFeedback(INITIAL_FEEDBACK);
  }, [exerciseId]);

  const loadModel = useCallback(async () => {
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setModelStatus('loading');
    setModelNote('Loading the lightweight pose model…');
    try {
      const landmarker = await initializePoseLandmarker(() => {
        if (mountedRef.current) setModelNote('GPU unavailable—switching to compatible CPU mode…');
      });
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setModelStatus('ready');
      setModelNote('Pose model ready');
    } catch (error) {
      console.error('Pose model initialization failed.', error);
      if (mountedRef.current) {
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopCamera(streamRef.current, videoRef.current);
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
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
        console.error('Pose detection frame failed.', error);
        publishFeedback({ key: 'tracking-paused', message: 'Tracking paused — hold still for a moment', tone: 'warning', holdMs: 900, priority: 6 });
      }
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [publishFeedback]);

  async function handleStartCamera() {
    if (!isCameraSupported()) {
      setCameraStatus('unsupported');
      setCameraError('This browser does not provide camera access. Try a current version of Chrome, Edge or Safari.');
      return;
    }
    setCameraStatus('starting');
    setCameraError('');
    try {
      const stream = await startCamera(videoRef.current);
      if (!mountedRef.current) {
        stopCamera(stream, videoRef.current);
        return;
      }
      streamRef.current = stream;
      sessionStartedAtRef.current = Date.now();
      lastVideoTimeRef.current = -1;
      setCameraStatus('running');
      animationRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      const state = getCameraErrorState(error);
      setCameraStatus(state.status);
      setCameraError(state.message);
    }
  }

  function stopSessionCamera() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    stopCamera(streamRef.current, videoRef.current);
    streamRef.current = null;
    clearPoseOverlay(canvasRef.current);
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
    const durationSeconds = sessionStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000))
      : 0;
    stopSessionCamera();
    const formSummary = reps === 0
      ? `No complete ${detectorConfig.name.toLowerCase()} movement cycle was captured yet.`
      : framingInterruptionsRef.current === 0
        ? `Completed ${reps} stable, visibility-qualified ${reps === 1 ? 'repetition' : 'repetitions'}.`
        : `Completed ${reps} ${reps === 1 ? 'repetition' : 'repetitions'} with ${framingInterruptionsRef.current} framing ${framingInterruptionsRef.current === 1 ? 'reminder' : 'reminders'}.`;
    onEndSession({
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

  return (
    <main className="coach-page">
      <div className="coach-topbar">
        <div className="coach-navigation">
          <button className="icon-button icon-button-dark" onClick={handleBack} aria-label="Back to previous screen"><ArrowLeft size={21} /></button>
          <button className="coach-home-button" type="button" onClick={handleHome} aria-label="Go to BITS in Motion homepage"><img src="/logo.png" alt="" /><span>Home</span></button>
        </div>
        <div><span className="eyebrow light">Live {detectorConfig.name}</span><small>Basic observable pose feedback</small></div>
        <button className="coach-reset" onClick={handleReset} disabled={!isRunning}><RotateCcw size={17} /> Reset</button>
      </div>

      <div className="coach-layout">
        <section className="camera-panel">
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

            {isRunning && <div className="live-badge"><span /> Live · processed locally</div>}
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
        </aside>
      </div>
    </main>
  );
}
