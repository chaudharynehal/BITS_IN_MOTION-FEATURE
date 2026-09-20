import { Activity, ArrowRight, Check, Clock3, Cloud, CloudOff, Flame, RefreshCw, Save, ScanLine } from 'lucide-react';
import FoodGuidanceCard from '../components/FoodGuidanceCard';
import ScreenHeader from '../components/ScreenHeader';
import StepRail from '../components/StepRail';
import { getExerciseMet } from '../utils/calories';

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function ResultScreen({ result, profile, saveState, automaticSave, onSave, onHome, onProgress, onRetry }) {
  const saved = saveState === 'saved';
  const saving = saveState === 'saving';
  return (
    <main className="screen-page result-page">
      <StepRail current="Result" />
      <ScreenHeader eyebrow="Step 4 of 5" title="Session complete" description="You showed up—and that is how momentum starts." />

      <section className="result-hero panel-dark">
        <div className="result-check"><Check size={30} /></div>
        <div><span className="eyebrow light">{result.exerciseName || 'Movement'} coach summary</span><h2>{result.reps} complete reps</h2><p>{result.formSummary}</p></div>
      </section>

      <section className="result-stats">
        <article><ScanLine size={21} /><span>{result.exerciseName || 'Exercise'} repetitions</span><strong>{result.reps}</strong></article>
        <article><Clock3 size={21} /><span>Session duration</span><strong>{formatDuration(result.durationSeconds)}</strong></article>
        <article><Flame size={21} /><span>Estimated calories</span><strong>{result.calories.toFixed(1)} <small>kcal</small></strong></article>
      </section>

      <section className="impact-panel panel">
        <div className="impact-heading"><Activity size={22} /><div><span className="eyebrow">Workout impact summary</span><h2>What this session worked</h2></div></div>
        <div className="impact-grid">
          <div><span>Primary muscle groups</span><strong>{result.impact.primaryMuscles.join(' · ') || 'Whole body'}</strong></div>
          <div><span>Supporting muscle groups</span><strong>{result.impact.secondaryMuscles.join(' · ') || 'Movement dependent'}</strong></div>
        </div>
        <p>{result.impact.movementSummary} {result.impact.coachingSummary}</p>
        <small>{result.impact.disclaimer}</small>
      </section>

      <div className="result-grid">
        <section className="panel result-next">
          <span className="eyebrow">Your next action</span>
          <h2>Complete the rest of today’s plan</h2>
          <p>Move on to low-impact jumping jacks, push-ups and a supported plank. Keep the pace comfortable.</p>
          <div className="result-actions">
            <button className="button button-primary" onClick={onSave} disabled={saved || saving}>
              {saving ? <><Cloud size={18} /> Saving automatically…</> : saved ? <><Check size={18} /> {automaticSave ? 'Saved to your account' : 'Session saved'}</> : saveState === 'error' ? <><CloudOff size={18} /> Retry account save</> : <><Save size={18} /> Save session</>}
            </button>
            <button className="button button-secondary" onClick={onProgress}>View progress <ArrowRight size={18} /></button>
          </div>
          <button className="text-button" onClick={onRetry}><RefreshCw size={16} /> Try camera coach again</button>
        </section>
        <FoodGuidanceCard goal={profile.goal} />
      </div>

      <aside className="estimate-note"><Flame size={17} /><span><strong>Estimated calculation:</strong> {getExerciseMet(result.exerciseId)} MET × {profile.weight} kg × session hours. Actual energy use varies by person and intensity.</span></aside>
      <button className="button button-quiet home-action" onClick={onHome}>Return home</button>
    </main>
  );
}
