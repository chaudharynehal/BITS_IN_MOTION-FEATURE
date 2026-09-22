import { Activity, ArrowRight, Check, Clock3, Cloud, CloudOff, Flame, RefreshCw, Save, ScanLine } from 'lucide-react';
import FoodGuidanceCard from '../components/FoodGuidanceCard';
import ScreenHeader from '../components/ScreenHeader';
import { getExerciseMet } from '../utils/calories';

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function ResultScreen({
  result,
  profile,
  saveState,
  automaticSave,
  onSave,
  onHome,
  onProgress,
  onRetry,
  activeWorkout = null,
  onContinueWorkout = null,
  onFinishWorkoutEarly = null,
  isWorkoutComplete = false,
}) {
  const saved = saveState === 'saved';
  const saving = saveState === 'saving';

  const isWorkoutSession = Boolean(activeWorkout && Array.isArray(activeWorkout.exercises));
  const currentStep = isWorkoutSession ? activeWorkout.currentIndex + 1 : 1;
  const totalSteps = isWorkoutSession ? activeWorkout.exercises.length : 1;
  const nextMovement = isWorkoutSession && currentStep < totalSteps ? activeWorkout.exercises[activeWorkout.currentIndex + 1] : null;
  // Finishing the last movement clears activeWorkout (so Plan never offers "Resume" into an
  // already-finished workout), so the celebration copy falls back to the snapshot captured
  // on the result itself rather than the now-cleared activeWorkout.
  const completedTotalSteps = result.completedWorkoutTotalSteps ?? totalSteps;
  const completedPlanTitle = result.completedWorkoutPlanTitle ?? activeWorkout?.planTitle;

  return (
    <main className="screen-page result-page">
      <ScreenHeader
        eyebrow={isWorkoutComplete ? 'Full workout complete' : isWorkoutSession ? `Movement ${currentStep} of ${totalSteps} complete` : 'Workout summary'}
        title={isWorkoutComplete ? 'Outstanding work! Workout finished' : 'Session complete'}
        description={isWorkoutComplete ? `You completed all ${completedTotalSteps} movements prescribed in ${completedPlanTitle || 'your plan'}.` : 'You showed up—and that is how momentum starts.'}
      />

      <section className="result-hero panel-dark">
        <div className="result-check"><Check size={30} /></div>
        <div>
          <span className="eyebrow light">
            {isWorkoutComplete ? 'Full workout celebration' : `${result.exerciseName || 'Movement'} summary`}
          </span>
          <h2>{isWorkoutComplete ? `All ${completedTotalSteps} movements complete!` : result.reps > 0 ? `${result.reps} complete reps` : `${formatDuration(result.durationSeconds)} session`}</h2>
          <p>{isWorkoutComplete ? `Great job maintaining focus throughout the routine. Every completed movement builds endurance, strength and consistency.` : result.formSummary}</p>
        </div>
      </section>

      <section className="result-stats">
        <article>
          <ScanLine size={21} />
          <span>{result.reps > 0 ? `${result.exerciseName || 'Exercise'} repetitions` : 'Movement guidance'}</span>
          <strong>{result.reps > 0 ? result.reps : 'Self-guided'}</strong>
        </article>
        <article>
          <Clock3 size={21} />
          <span>Session duration</span>
          <strong>{formatDuration(result.durationSeconds)}</strong>
        </article>
        <article>
          <Flame size={21} />
          <span>Estimated calories</span>
          <strong>{result.calories.toFixed(1)} <small>kcal</small></strong>
        </article>
      </section>

      {result.impact && (
        <section className="impact-panel panel">
          <div className="impact-heading"><Activity size={22} /><div><span className="eyebrow">Workout impact summary</span><h2>What this session worked</h2></div></div>
          <div className="impact-grid">
            <div><span>Primary muscle groups</span><strong>{result.impact.primaryMuscles.join(' · ') || 'Whole body'}</strong></div>
            <div><span>Supporting muscle groups</span><strong>{result.impact.secondaryMuscles.join(' · ') || 'Movement dependent'}</strong></div>
          </div>
          <p>{result.impact.movementSummary} {result.impact.coachingSummary}</p>
          <small>{result.impact.disclaimer}</small>
        </section>
      )}

      <div className="result-grid">
        <section className="panel result-next">
          <span className="eyebrow">Your next action</span>
          <h2>{nextMovement ? `Ready for ${nextMovement.name}?` : 'Choose what feels right next'}</h2>
          <p>
            {nextMovement
              ? `You are on Movement ${currentStep} of ${totalSteps}. Continue directly to ${nextMovement.name} (${nextMovement.duration}), or finish early.`
              : 'Save this session, review your progress or head back to your dashboard. Your plan will be there whenever you’re ready.'}
          </p>
          <div className="result-actions">
            {nextMovement && onContinueWorkout ? (
              <button className="button button-primary button-large" type="button" onClick={onContinueWorkout}>
                Continue Workout: Next {nextMovement.name} <ArrowRight size={18} />
              </button>
            ) : null}

            <button className="button button-primary" onClick={onSave} disabled={saved || saving}>
              {saving ? <><Cloud size={18} /> Saving automatically…</> : saved ? <><Check size={18} /> {automaticSave ? 'Saved to your account' : 'Session saved'}</> : saveState === 'error' ? <><CloudOff size={18} /> {automaticSave ? 'Retry account save' : 'Retry browser save'}</> : <><Save size={18} /> Save session</>}
            </button>
            <button className="button button-secondary" onClick={onProgress}>View progress <ArrowRight size={18} /></button>
          </div>
          {saveState === 'error' && !automaticSave && <p role="alert">Browser storage is unavailable or contains unreadable history. Your result is still on this screen. Check site storage before retrying.</p>}
          {nextMovement && onFinishWorkoutEarly ? (
            <button className="text-button" type="button" onClick={onFinishWorkoutEarly}>
              Finish workout early and return to plan
            </button>
          ) : (
            <button className="text-button" onClick={onRetry}><RefreshCw size={16} /> {result.source === 'self-guided' ? 'Practice this movement again' : 'Try camera coach again'}</button>
          )}
        </section>
        <FoodGuidanceCard goal={profile.goal} />
      </div>

      <aside className="estimate-note"><Flame size={17} /><span><strong>Estimated calculation:</strong> {getExerciseMet(result.exerciseId)} MET × {profile.weight} kg × session hours. Actual energy use varies by person and intensity.</span></aside>
      <button className="button button-quiet home-action" onClick={onHome}>Return to dashboard</button>
    </main>
  );
}
