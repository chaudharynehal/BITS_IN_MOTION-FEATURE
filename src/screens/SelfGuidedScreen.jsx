import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Info,
  Move,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  Wind,
  Zap,
} from 'lucide-react';

const ICONS = {
  activity: Activity,
  footprints: Footprints,
  move: Move,
  timer: Timer,
  wind: Wind,
  zap: Zap,
};

function formatTimer(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function SelfGuidedScreen({
  exercise,
  activeWorkout,
  onComplete,
  onSkip,
  onBack,
  onHome,
}) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const Icon = (exercise && ICONS[exercise.icon]) || Dumbbell;

  const isWorkoutActive = Boolean(activeWorkout && Array.isArray(activeWorkout.exercises));
  const currentStep = isWorkoutActive ? activeWorkout.currentIndex + 1 : 1;
  const totalSteps = isWorkoutActive ? activeWorkout.exercises.length : 1;
  const isLastMovement = isWorkoutActive && currentStep >= totalSteps;
  const nextMovement = isWorkoutActive && !isLastMovement ? activeWorkout.exercises[activeWorkout.currentIndex + 1] : null;

  useEffect(() => {
    setSeconds(0);
    setIsRunning(true);
    startTimeRef.current = Date.now();
  }, [exercise?.id]);

  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  function handleToggleTimer() {
    setIsRunning((prev) => !prev);
  }

  const [completed, setCompleted] = useState(false);

  function handleResetTimer() {
    setIsRunning(false);
    setSeconds(0);
    setCompleted(false);
    startTimeRef.current = Date.now();
  }

  function handleCompleteMovement() {
    if (completed) return;
    setCompleted(true);
    setIsRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const elapsed = Math.max(seconds, 5);
    onComplete?.({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      durationSeconds: elapsed,
      startedAt: startTimeRef.current ? new Date(startTimeRef.current).toISOString() : new Date().toISOString(),
    });
  }

  return (
    <main className="screen-page self-guided-page">
      <div className="coach-topbar self-guided-topbar">
        <div className="coach-navigation">
          <button className="icon-button icon-button-dark" onClick={onBack} aria-label="Back">
            <ArrowLeft size={21} />
          </button>
          <button className="coach-home-button" type="button" onClick={onHome} aria-label="Go to BITS in Motion homepage">
            <img src="/logo.png" alt="" />
            <span>Home</span>
          </button>
        </div>
        <div>
          <span className="eyebrow light">
            {isWorkoutActive ? `Active Workout · Movement ${currentStep} of ${totalSteps}` : 'Self-Guided Movement'}
          </span>
          <small>{isWorkoutActive ? activeWorkout.planTitle : 'Follow at your own comfortable pace'}</small>
        </div>
        <button className="coach-reset" onClick={handleResetTimer} aria-label="Reset movement timer">
          <RotateCcw size={17} /> Reset
        </button>
      </div>

      <div className="self-guided-layout">
        <section className="self-guided-main panel-dark">
          <div className="self-guided-header">
            <div className="self-guided-badge">
              <Icon size={24} />
              <span>{exercise?.category || 'General fitness'}</span>
            </div>
            <h2>{exercise?.name || 'Movement'}</h2>
            <p>{exercise?.instruction || 'Follow the posture cues and breathe steadily through each repetition.'}</p>
          </div>

          <div className="self-guided-timer-box">
            <span className="timer-label">Elapsed Movement Time</span>
            <div className="digital-timer" role="timer" aria-live="off">
              {formatTimer(seconds)}
            </div>
            <div className="timer-target">
              <Clock3 size={16} /> Target: <strong>{exercise?.duration || '3–4 min'}</strong>
            </div>

            <div className="timer-controls">
              <button
                className={`button ${isRunning ? 'button-quiet-dark' : 'button-primary'} button-large`}
                onClick={handleToggleTimer}
                type="button"
              >
                {isRunning ? <><Pause size={19} /> Pause Timer</> : <><Play size={19} /> {seconds === 0 ? 'Start Timer' : 'Resume Timer'}</>}
              </button>
            </div>
          </div>

          <div className="self-guided-guidance">
            <h3><Info size={17} /> Form & Execution Guide</h3>
            <ul>
              <li>Perform with controlled tempo—avoid rushing or compromising posture.</li>
              <li>Keep your core braced and maintain natural breathing rhythm.</li>
              <li>Stop or rest if you feel acute joint pain or dizziness.</li>
            </ul>
          </div>
        </section>

        <aside className="self-guided-sidebar">
          <div className="panel workout-flow-card">
            <span className="eyebrow">Session progress</span>
            {isWorkoutActive ? (
              <>
                <h3>Movement {currentStep} of {totalSteps}</h3>
                <div className="flow-steps-mini">
                  {activeWorkout.exercises.map((item, idx) => (
                    <div
                      key={item.id + '-' + idx}
                      className={`flow-step-row ${idx === activeWorkout.currentIndex ? 'active' : idx < activeWorkout.currentIndex ? 'done' : ''}`}
                    >
                      <span className="flow-step-num">{idx + 1}</span>
                      <div className="flow-step-name">
                        <strong>{item.name}</strong>
                        <small>{item.duration}</small>
                      </div>
                      {idx < activeWorkout.currentIndex && <span className="flow-step-check"><CheckCircle2 size={16} /></span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3>Standalone Movement</h3>
                <p>Completing this exercise will save your session to your personal activity and streak.</p>
              </>
            )}

            <div className="self-guided-actions">
              <button
                className="button button-primary button-large full-width"
                type="button"
                disabled={completed}
                onClick={handleCompleteMovement}
              >
                {isLastMovement ? (
                  <><CheckCircle2 size={19} /> Complete & Finish Workout</>
                ) : isWorkoutActive ? (
                  <><ArrowRight size={19} /> Complete & Next: {nextMovement?.name || 'Next'}</>
                ) : (
                  <><CheckCircle2 size={19} /> Complete Movement</>
                )}
              </button>

              {isWorkoutActive && (
                <button
                  className="button button-quiet full-width"
                  type="button"
                  onClick={onSkip}
                >
                  Skip this movement
                </button>
              )}
            </div>
          </div>

          <div className="panel-dark privacy-pill-card">
            <ShieldCheck size={20} />
            <div>
              <strong>Self-Guided Privacy</strong>
              <p>No camera is used for this movement. Your time and estimated calories are saved to your activity record.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
