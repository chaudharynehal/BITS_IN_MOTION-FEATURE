import { ArrowRight, Check, Clock3, Info, LayoutDashboard, Sparkles } from 'lucide-react';
import ExerciseCard from '../components/ExerciseCard';
import FoodGuidanceCard from '../components/FoodGuidanceCard';
import ScreenHeader from '../components/ScreenHeader';
import { planActivity } from '../utils/planActivity';

export default function PlanScreen({ profile, plan, sessions, progressState, onRetryProgress, planState, planErrorAction, onRetryPlan, onStartCoach, onCreatePlan, onExplore, onBack }) {
  if (!plan || planState === 'loading' || planState === 'error') {
    return (
      <main className="screen-page plan-page">
        <ScreenHeader eyebrow="My plan" title="A plan when you’re ready" description="Your profile is complete. Generate a personal plan without starting a workout or creating progress." onBack={onBack} />
        <section className="plan-empty panel">
          {planState === 'loading' ? <><span className="plan-empty-icon spin"><Sparkles size={27} /></span><h2>Loading your saved plan</h2><p>We’re checking the plan attached to this account.</p></> : <><span className="plan-empty-icon"><Sparkles size={27} /></span><h2>{planState === 'error' ? 'Your saved plan is unavailable' : 'Create your personal plan'}</h2><p>{planState === 'error' ? planErrorAction === 'generate' ? 'Your profile is saved, but we could not create your plan yet.' : 'We could not load your saved plan. Please try again.' : 'We’ll use the fitness profile you already saved.'}</p><button className="button button-primary" onClick={planState === 'error' ? onRetryPlan : onCreatePlan}><Sparkles size={17} /> {planState === 'error' ? 'Try again' : 'Create my plan'}</button></>}
        </section>
      </main>
    );
  }

  const { practicedIds: completedIds, cameraExercises, nextExercise: firstCameraExercise } = planActivity(plan, sessions);
  const completedCount = cameraExercises.filter((exercise) => completedIds.has(exercise.id)).length;
  const completion = Math.round((completedCount / Math.max(1, cameraExercises.length)) * 100);

  return (
    <main className="screen-page plan-page">
      <ScreenHeader eyebrow="My plan" title="A workout shaped around your day" description="Review every movement, start with camera guidance, or explore the rest of the app. Your plan remains saved." onBack={onBack} />

      <section className="plan-hero panel-dark">
        <div>
          <span className="status-pill dark"><Sparkles size={16} /> Built from your profile</span>
          <h2>{plan.title}</h2>
          <p>{plan.focus}</p>
        </div>
        <div className="plan-duration"><Clock3 size={25} /><strong>{plan.totalMinutes}</strong><span>minutes</span></div>
      </section>

      <section className="plan-decision panel">
        <div><span className="eyebrow">Your plan is ready</span><h2>Train now—or come back when it fits.</h2><p>Start with the warm-up below. Camera coaching tracks one movement at a time; follow the listed intervals at your own pace.</p></div>
        <div>
          {firstCameraExercise && <button className="button button-primary" onClick={() => onStartCoach(firstCameraExercise.id, 'plan')}>Practice {firstCameraExercise.name} <ArrowRight size={17} /></button>}
          <button className="button button-quiet" onClick={onExplore}><LayoutDashboard size={17} /> Explore dashboard</button>
        </div>
      </section>

      <section className="plan-progress panel">
        {progressState === 'loading' ? <p role="status">Loading your plan activity…</p> : progressState === 'error' ? <p role="alert">Your plan is saved, but activity could not load. <button className="text-button" onClick={onRetryProgress}>Retry activity</button></p> : <>
          <div><span>Plan activity</span><strong>{completedCount} of {cameraExercises.length} camera movements practiced</strong></div>
          <div className="plan-progress-track"><i style={{ width: completion + '%' }} /></div>
          <small>{plan.createdAt ? 'Based on saved sessions with tracked reps since this plan was created. ' : 'Activity tracking starts when you next update your plan. '}Self-guided movements and full sets are not automatically marked complete.</small>
        </>}
      </section>

      <section className="reason-strip"><strong>Why this plan?</strong><div>{plan.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></section>

      <div className="plan-content-grid">
        <section className="exercise-list" aria-label="Workout exercises">
          {plan.exercises.map((exercise, index) => <div className="plan-exercise-wrap" key={exercise.id}>{progressState === 'ready' && completedIds.has(exercise.id) && <span className="completed-chip"><Check size={13} /> Practiced</span>}<ExerciseCard exercise={exercise} index={index} onStartCoach={(id) => onStartCoach(id, 'plan')} /></div>)}
        </section>
        <div className="plan-side">
          <FoodGuidanceCard goal={profile.goal} />
          <aside className="note-card"><Info size={18} /><p>Work at a comfortable pace. Stop the session if you feel pain, dizziness or unusual discomfort.</p></aside>
        </div>
      </div>
    </main>
  );
}
