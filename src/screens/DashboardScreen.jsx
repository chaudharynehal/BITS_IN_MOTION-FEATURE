import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronRight,
  Clock3,
  Cloud,
  Dumbbell,
  Flame,
  Lightbulb,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { getProgressSummary } from '../utils/storage';
import { planActivity } from '../utils/planActivity';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function shortExerciseName(exercise) {
  return exercise?.name?.replace('Bodyweight ', '').replace('Incline or knee ', '') || 'camera workout';
}

function weeklyActivity(sessions) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const count = sessions.filter((session) => {
      const completed = new Date(session.completedAt);
      return completed.toDateString() === date.toDateString();
    }).length;
    return {
      date: date.toISOString(),
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date).slice(0, 1),
      count,
    };
  });
}

export default function DashboardScreen({
  displayName,
  profile,
  plan,
  planState,
  sessions,
  progressState,
  onRetryProgress,
  onRetryPlan,
  persistenceMode,
  onNavigate,
  onStartCoach,
  onCreatePlan,
}) {
  const summary = getProgressSummary(sessions);
  const activity = weeklyActivity(sessions);
  const { nextExercise: firstCameraExercise } = planActivity(plan, sessions);
  const recent = sessions[0];

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <span className="eyebrow">Your dashboard</span>
          <h1>{displayName ? greeting() + ', ' + displayName : 'Ready to move?'}</h1>
          <p>Your plan, camera coach and progress are all here. Choose what fits today.</p>
        </div>
        <div className="dashboard-mode">
          {persistenceMode === 'account' ? <Cloud size={17} /> : <MapPin size={17} />}
          <span>{persistenceMode === 'account' ? 'Google account' : persistenceMode === 'demo' ? 'Temporary judge demo' : 'Saved on this device'}</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-today">
          <div className="dashboard-today-copy">
            <span className="status-pill dark"><Sparkles size={15} /> Today’s recommendation</span>
            <h2>{planState === 'loading' ? 'Loading your personal plan' : planState === 'error' ? 'Your plan needs a retry' : plan ? plan.title : 'Build your first personal plan'}</h2>
            <p>{plan?.focus || 'Use your fitness profile to create a practical workout for your time, space and equipment.'}</p>
            <div className="dashboard-today-actions">
              {planState === 'loading' ? (
                <button className="button button-primary" disabled><LoaderCircle className="spin" size={18} /> Loading plan…</button>
              ) : planState === 'error' ? (
                <button className="button button-primary" onClick={onRetryPlan}><RefreshCw size={18} /> Retry plan</button>
              ) : firstCameraExercise ? (
                <button className="button button-primary" onClick={() => onStartCoach(firstCameraExercise.id, 'dashboard')}>
                  <Camera size={18} /> Practice {shortExerciseName(firstCameraExercise)}
                </button>
              ) : plan ? (
                <button className="button button-primary" onClick={() => onNavigate('plan')}>Follow my plan <ArrowRight size={17} /></button>
              ) : (
                <button className="button button-primary" onClick={onCreatePlan}><Sparkles size={18} /> Create my plan</button>
              )}
              {firstCameraExercise && <button className="button button-on-dark" onClick={() => onNavigate('plan')}>View my plan <ArrowRight size={17} /></button>}
            </div>
          </div>
          <div className="dashboard-pose" aria-hidden="true">
            <svg viewBox="0 0 280 250">
              <defs>
                <linearGradient id="dash-line" x1="0" x2="1"><stop stopColor="#23e3c1" /><stop offset="1" stopColor="#3b82ff" /></linearGradient>
              </defs>
              <circle cx="140" cy="45" r="23" />
              <path d="M140 69L140 132M140 85L92 118M140 85L188 118M140 132L103 201M140 132L177 201" />
              <path className="pose-guide" d="M75 208H205M73 118H207" />
              {[ [140,45], [140,86], [92,118], [188,118], [140,132], [103,201], [177,201] ].map(([x, y]) => <circle className="dash-pose-node" cx={x} cy={y} r="5" key={x + '-' + y} />)}
            </svg>
            <span><Camera size={15} /> Landmark-ready coaching</span>
          </div>
        </article>

        <article className="dashboard-progress panel">
          <div className="dashboard-card-heading">
            <div><span className="eyebrow">Activity overview</span><h2>Your momentum</h2></div>
            <button type="button" onClick={() => onNavigate('progress')} aria-label="Open progress"><ChevronRight size={20} /></button>
          </div>
          {progressState === 'loading' ? (
            <div className="dashboard-inline-state" role="status"><LoaderCircle className="spin" size={21} /> Loading your activity…</div>
          ) : progressState === 'error' ? (
            <div className="dashboard-inline-state error" role="alert"><span>Your activity could not load.</span><button onClick={onRetryProgress}><RefreshCw size={15} /> Try again</button></div>
          ) : <><div className="mini-chart" aria-label={summary.weeklyActiveDays + ' active days this week'}>
            {activity.map((day) => <div key={day.date}><i style={{ height: (18 + Math.min(day.count, 3) * 18) + 'px' }} className={day.count ? 'active' : ''} /><span>{day.label}</span></div>)}
          </div>
          <div className="dashboard-stats">
            <span><strong>{summary.workouts}</strong> saved sessions</span>
            <span><strong>{summary.reps}</strong> tracked reps</span>
            <span><strong>{summary.streak}</strong> day streak</span>
          </div><p className="field-help">Chart: last 7 days. Totals use {persistenceMode === 'account' ? 'your latest 50 account sessions' : 'your saved sessions'}.</p></>}
        </article>

        <article className="dashboard-plan panel">
          <div className="dashboard-card-heading">
            <div><span className="eyebrow">My plan</span><h2>{planState === 'loading' ? 'Loading your plan' : planState === 'error' ? 'Plan unavailable' : plan?.title || 'No plan yet'}</h2></div>
            <Target size={22} />
          </div>
          {planState === 'loading' ? (
            <div className="dashboard-inline-state"><LoaderCircle className="spin" size={21} /> Loading your saved plan…</div>
          ) : planState === 'error' ? (
            <div className="dashboard-inline-state error"><span>Plan sync is temporarily unavailable.</span><button onClick={onRetryPlan}><RefreshCw size={15} /> Try again</button></div>
          ) : plan ? (
            <>
              <p>{plan.exercises.length} movements · {plan.totalMinutes} minutes</p>
              <div className="plan-mini-list">
                {plan.exercises.slice(0, 4).map((exercise, index) => <span key={exercise.id}><i>{index + 1}</i>{exercise.name}</span>)}
              </div>
              <p className="field-help">{plan.reasons.find((reason) => reason.includes('space:'))}</p>
            </>
          ) : (
            <div className="dashboard-inline-state"><span>Your profile is ready. Create a plan whenever you want.</span><button onClick={onCreatePlan}><Sparkles size={15} /> Create plan</button></div>
          )}
        </article>

        <article className="dashboard-actions panel">
          <span className="eyebrow">Quick start</span>
          <h2>Move your way</h2>
          <button onClick={() => onNavigate('workouts')}><Dumbbell size={20} /><span><strong>Explore workouts</strong><small>See every supported movement</small></span><ChevronRight size={18} /></button>
          <button onClick={() => onStartCoach('squats', 'dashboard')}><Camera size={20} /><span><strong>Open camera coach</strong><small>Start directly with squats</small></span><ChevronRight size={18} /></button>
          <button onClick={() => onNavigate('leaderboard')}><Trophy size={20} /><span><strong>Leaderboard</strong><small>Consistency, with privacy</small></span><ChevronRight size={18} /></button>
        </article>

        <article className="dashboard-recent panel">
          <div className="dashboard-card-heading">
            <div><span className="eyebrow">Recent activity</span><h2>{progressState === 'loading' ? 'Loading activity' : progressState === 'error' ? 'Activity unavailable' : recent ? recent.exerciseName || recent.exerciseId : 'No workouts yet'}</h2></div>
            <BarChart3 size={22} />
          </div>
          {progressState === 'loading' ? <p>Checking your saved sessions…</p> : progressState === 'error' ? <p>Retry your progress to see your latest workout.</p> : recent ? (
            <div className="recent-session">
              <span><Clock3 size={17} /> {Math.max(1, Math.round(recent.durationSeconds / 60))} minutes</span>
              <span><Dumbbell size={17} /> {recent.reps} reps</span>
              <span><Flame size={17} /> {Number(recent.calories || 0).toFixed(1)} kcal estimate</span>
            </div>
          ) : (
            <p>Finish your first camera-coach session when you’re ready. Your history will appear here.</p>
          )}
          <button className="text-button" onClick={() => onNavigate('progress')}>View progress <ArrowRight size={16} /></button>
        </article>

        <article className="dashboard-tip">
          <Lightbulb size={24} />
          <div><span className="eyebrow light">Coach tip</span><h2>Make the camera work for you</h2><p>Keep your full body visible, use even light and leave a little space around you.</p></div>
        </article>

        <article className="dashboard-goal panel">
          <div><Target size={20} /><span>Current goal</span><strong>{profile.goal}</strong></div>
          <div><Clock3 size={20} /><span>Session length</span><strong>{profile.time} minutes</strong></div>
          <button type="button" onClick={() => onNavigate('profile')}>Edit fitness profile</button>
        </article>
      </section>
    </main>
  );
}
