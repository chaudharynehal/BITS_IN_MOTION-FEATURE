import {
  ArrowRight,
  Camera,
  ChevronRight,
  Clock3,
  Cloud,
  Dumbbell,
  Flame,
  LoaderCircle,
  MapPin,
  Play,
  RefreshCw,
  Repeat,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import WeeklyActivityCard from '../components/WeeklyActivityCard';
import { getProgressSummary } from '../utils/storage';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeDay(iso) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function InlineState({ children, error = false, onAction, actionLabel, actionIcon }) {
  return (
    <div className={`dashboard-inline-state${error ? ' error' : ''}`} role={error ? 'alert' : undefined}>
      <span>{children}</span>
      {onAction && <button type="button" onClick={onAction}>{actionIcon} {actionLabel}</button>}
    </div>
  );
}

export default function DashboardScreen({
  displayName,
  profile,
  plan,
  planState,
  sessions,
  sessionSummary = null,
  progressState,
  onRetryProgress,
  onRetryPlan,
  persistenceMode,
  onNavigate,
  onStartCoach,
  onStartWorkout,
  onCreatePlan,
}) {
  const summary = getProgressSummary(sessions, sessionSummary);
  const recent = sessions[0];
  const stations = plan?.exercises?.filter((exercise) => !['warmup', 'cooldown'].includes(exercise.id)) || [];

  return (
    <main className="dashboard-page" data-testid="dashboard-page">
      <section className="dash-welcome">
        <div>
          <span className="eyebrow">Your dashboard</span>
          <h1>{displayName ? `${greeting()}, ${displayName}` : 'Ready to move?'}</h1>
        </div>
        <div className="dash-mode" data-testid="dashboard-mode">
          {persistenceMode === 'account' ? <Cloud size={15} /> : <MapPin size={15} />}
          <span>{persistenceMode === 'account' ? 'Synced to your account' : persistenceMode === 'demo' ? 'Temporary judge demo' : 'Saved on this device'}</span>
        </div>
      </section>

      <section className="dash-grid">
        <article className="dash-today" data-testid="dashboard-today">
          <div className="dash-today-copy">
            <span className="status-pill dark"><Sparkles size={14} /> Today’s workout</span>
            <h2>{planState === 'loading' ? 'Loading your plan' : planState === 'error' ? 'Your plan needs a retry' : plan ? plan.title : 'Build your first plan'}</h2>
            <p>{plan?.focus || 'Use your fitness profile to create a practical workout for your time, space and equipment.'}</p>
            {plan && planState === 'ready' && (
              <ul className="dash-today-meta" aria-label="Plan summary">
                <li><Clock3 size={15} /> {plan.totalMinutes} min</li>
                <li><Dumbbell size={15} /> {stations.length} movements</li>
                {plan.rounds > 1 && <li><Repeat size={15} /> {plan.rounds} rounds</li>}
              </ul>
            )}
            <div className="dash-today-actions">
              {planState === 'loading' ? (
                <button className="button button-primary" disabled><LoaderCircle className="spin" size={18} /> Loading plan…</button>
              ) : planState === 'error' ? (
                <button className="button button-primary" onClick={onRetryPlan}><RefreshCw size={18} /> Retry plan</button>
              ) : plan ? (
                <>
                  <button className="button button-primary" data-testid="dashboard-start-workout" onClick={() => onStartWorkout ? onStartWorkout(plan) : onNavigate('plan')}>
                    <Play size={18} /> Start workout
                  </button>
                  <button className="button button-on-dark" data-testid="dashboard-view-plan" onClick={() => onNavigate('plan')}>
                    View plan <ArrowRight size={17} />
                  </button>
                </>
              ) : (
                <button className="button button-primary" data-testid="dashboard-create-plan" onClick={onCreatePlan}><Sparkles size={18} /> Create my plan</button>
              )}
            </div>
          </div>
          {plan && planState === 'ready' && (
            <ol className="dash-today-list" aria-label="Movements in today’s plan">
              {plan.exercises.slice(0, 5).map((exercise, index) => (
                <li key={exercise.id}>
                  <i>{index + 1}</i>
                  <span>{exercise.name}</span>
                  {exercise.cameraSupported && <Camera size={14} aria-label="Camera supported" />}
                </li>
              ))}
              {plan.exercises.length > 5 && <li className="is-more">+{plan.exercises.length - 5} more</li>}
            </ol>
          )}
        </article>

        {progressState === 'loading' ? (
          <article className="panel dash-week-state" role="status"><LoaderCircle className="spin" size={21} /> Loading your activity…</article>
        ) : progressState === 'error' ? (
          <article className="panel dash-week-state">
            <InlineState error onAction={onRetryProgress} actionLabel="Try again" actionIcon={<RefreshCw size={15} />}>Your activity could not load.</InlineState>
          </article>
        ) : (
          <WeeklyActivityCard sessions={sessions} streak={summary.streak} onOpenProgress={() => onNavigate('progress')} />
        )}

        <article className="dash-recent panel" data-testid="dashboard-recent">
          <div className="dash-card-heading">
            <span className="eyebrow">Last session</span>
            <h2>{progressState === 'loading' ? 'Loading…' : progressState === 'error' ? 'Unavailable' : recent ? (recent.exerciseName || recent.exerciseId) : 'No workouts yet'}</h2>
          </div>
          {recent && progressState === 'ready' ? (
            <>
              <p className="dash-recent-when">{relativeDay(recent.completedAt)}{recent.source === 'self-guided' ? ' · Self-guided' : ''}</p>
              <ul className="dash-recent-stats">
                <li><Clock3 size={16} /> {Math.max(1, Math.round(recent.durationSeconds / 60))} min</li>
                {recent.source !== 'self-guided' && <li><Dumbbell size={16} /> {recent.reps} reps</li>}
                <li><Flame size={16} /> {Number(recent.calories || 0).toFixed(0)} kcal est.</li>
              </ul>
            </>
          ) : progressState === 'ready' ? (
            <p className="dash-recent-when">Finish a workout and it will show up here.</p>
          ) : null}
          <button className="text-button" type="button" onClick={() => onStartCoach('squats')} data-testid="dashboard-open-coach">
            Open Camera Coach <ArrowRight size={16} />
          </button>
        </article>

        <article className="dash-actions panel" data-testid="dashboard-quick-start">
          <span className="eyebrow">Quick start</span>
          <button type="button" onClick={() => onStartCoach('squats')}><Camera size={19} /><span><strong>Camera Coach</strong><small>Rep counting and form cues</small></span><ChevronRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('workouts')}><Dumbbell size={19} /><span><strong>Workout library</strong><small>Every supported movement</small></span><ChevronRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('leaderboard')}><Trophy size={19} /><span><strong>Campus leaderboard</strong><small>Consistency, with privacy</small></span><ChevronRight size={17} /></button>
        </article>

        <article className="dash-profile panel" data-testid="dashboard-profile">
          <div><Target size={17} /><span>Goal</span><strong>{profile.goal}</strong></div>
          <div><Clock3 size={17} /><span>Session</span><strong>{profile.time} min</strong></div>
          <div><MapPin size={17} /><span>Space</span><strong>{profile.location}</strong></div>
          <button type="button" onClick={() => onNavigate('profile')}>Edit profile <ArrowRight size={14} /></button>
          <p className="dash-tip"><Camera size={15} /> Camera tip: keep your full body in frame, in even light, with a little space around you.</p>
        </article>
      </section>
    </main>
  );
}
