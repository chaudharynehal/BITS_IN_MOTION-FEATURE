import { ArrowRight, Check, Clock3, Info, LayoutDashboard, Play, RotateCcw, Sparkles } from 'lucide-react';
import ExerciseCard from '../components/ExerciseCard';
import FoodGuidanceCard from '../components/FoodGuidanceCard';
import ScreenHeader from '../components/ScreenHeader';
import { planActivity } from '../utils/planActivity';

export default function PlanScreen({
  profile,
  plan,
  sessions,
  progressState,
  onRetryProgress,
  planState,
  planErrorAction,
  onRetryPlan,
  onStartCoach,
  onStartSelfGuided,
  onStartWorkout,
  onResumeWorkout,
  activeWorkout,
  onCreatePlan,
  onExplore,
  onBack,
}) {
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

  const { practicedIds: completedIds } = planActivity(plan, sessions);
  const totalExercises = (plan.exercises || []).length;
  const completedCount = (plan.exercises || []).filter((exercise) => completedIds.has(exercise.id)).length;
  const completion = Math.round((completedCount / Math.max(1, totalExercises)) * 100);

  return (
    <main className="screen-page plan-page">
      <ScreenHeader eyebrow="My plan" title="A workout shaped around your day" description="Review every movement, start with camera guidance, or follow a continuous workout. Your plan remains saved." onBack={onBack} />

      <section className="plan-hero panel-dark">
        <div>
          <span className="status-pill dark"><Sparkles size={16} /> Built from your profile</span>
          <h2>{plan.title}</h2>
          <p>{plan.focus}</p>
        </div>
        <div className="plan-duration"><Clock3 size={25} /><strong>{plan.totalMinutes}</strong><span>minutes</span></div>
      </section>

      <section className="plan-decision panel">
        <div>
          <span className="eyebrow">Your plan is ready</span>
          <h2>Train now—or come back when it fits.</h2>
          <p>
            {activeWorkout
              ? `Workout in progress: you are on Movement ${activeWorkout.currentIndex + 1} of ${activeWorkout.exercises.length}.`
              : 'Follow your continuous workout from warm-up to cool-down, or practice any movement individually.'}
          </p>
        </div>
        <div className="plan-decision-actions">
          {activeWorkout ? (
            <>
              <button className="button button-primary button-large" type="button" onClick={onResumeWorkout}>
                <Play size={18} /> Resume workout ({activeWorkout.currentIndex + 1}/{activeWorkout.exercises.length})
              </button>
              <button className="button button-secondary" type="button" onClick={() => onStartWorkout(plan, 0)}>
                <RotateCcw size={16} /> Restart workout
              </button>
            </>
          ) : (
            <button className="button button-primary button-large" type="button" onClick={() => onStartWorkout(plan)}>
              <Play size={18} /> Start Workout ({plan.totalMinutes} min)
            </button>
          )}
          <button className="button button-quiet" type="button" onClick={onExplore}><LayoutDashboard size={17} /> Explore dashboard</button>
        </div>
      </section>

      <section className="plan-progress panel">
        {progressState === 'loading' ? <p role="status">Loading your plan activity…</p> : progressState === 'error' ? <p role="alert">Your plan is saved, but activity could not load. <button className="text-button" onClick={onRetryProgress}>Retry activity</button></p> : <>
          <div><span>Plan activity</span><strong>{completedCount} of {totalExercises} movements completed</strong></div>
          <div className="plan-progress-track"><i style={{ width: completion + '%' }} /></div>
          <small>{plan.createdAt ? 'Includes camera coaching and self-guided movements completed since this plan was created.' : 'Activity tracking starts when you next update your plan.'}</small>
        </>}
      </section>

      <section className="reason-strip"><strong>Why this plan?</strong><div>{plan.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></section>

      {plan.rounds > 1 && (
        <section className="circuit-structure-banner panel">
          <RotateCcw size={18} />
          <div>
            <strong>Structured {plan.rounds}-Round Circuit Routine</strong>
            <p>
              Instead of repetitive giant sets, this workout cycles through {plan.exercises.filter((e) => !['warmup', 'cooldown'].includes(e.id)).length} stations across {plan.rounds} rounds after your mobility warm-up.
            </p>
          </div>
        </section>
      )}

      <div className="plan-content-grid">
        <section className="exercise-list" aria-label="Workout exercises">
          {plan.exercises.map((exercise, index) => (
            <div className="plan-exercise-wrap" key={exercise.key || `${exercise.id}-${index}`}>
              {progressState === 'ready' && completedIds.has(exercise.id) && (
                <span className="completed-chip"><Check size={13} /> Completed</span>
              )}
              <ExerciseCard
                exercise={exercise}
                index={index}
                onStartCoach={(id) => onStartCoach(id, 'plan')}
                onStartSelfGuided={(id) => onStartSelfGuided?.(id, 'plan')}
              />
            </div>
          ))}
        </section>
        <div className="plan-side">
          <FoodGuidanceCard goal={profile.goal} />
          <aside className="note-card"><Info size={18} /><p>Work at a comfortable pace. Stop the session if you feel pain, dizziness or unusual discomfort.</p></aside>
        </div>
      </div>
    </main>
  );
}
