import { useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, Cloud, Dumbbell, Flame, History, LoaderCircle, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import { getProgressSummary } from '../utils/storage';

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function ProgressScreen({ sessions, loadState, persistenceMode, onRetry, onHome, onStart }) {
  const accountMode = persistenceMode === 'account';
  const demoMode = persistenceMode === 'demo';
  const summary = getProgressSummary(sessions);
  const [visibleCount, setVisibleCount] = useState(6);
  const hasSampleHistory = sessions.some((session) => session.source === 'sample');
  return (
    <main className="screen-page progress-page">
      <ScreenHeader eyebrow="Your progress" title="Momentum, made visible" description={accountMode ? 'Your private history is loaded only from your signed-in account.' : demoMode ? 'Judge Demo history is temporary and separate from all saved data.' : 'Guest history is stored only in this browser.'} onBack={onHome} />

      {loadState === 'loading' ? (
        <section className="progress-load-state panel" aria-live="polite">
          <LoaderCircle className="spin" size={30} />
          <h2>Loading your progress</h2>
          <p>{accountMode ? 'Reading your account history securely…' : demoMode ? 'Preparing isolated demo history…' : 'Reading this browser’s guest history…'}</p>
        </section>
      ) : loadState === 'error' ? (
        <section className="progress-load-state progress-load-error panel" role="alert">
          <AlertTriangle size={30} />
          <h2>Progress could not be loaded</h2>
          <p>{accountMode ? 'Your account history is temporarily unavailable. Guest or sample history has not been substituted.' : demoMode ? 'Restart Judge Demo from Home.' : 'Choose Continue as Guest from Home to view data stored in this browser.'}</p>
          <button className="button button-secondary" type="button" onClick={onRetry}><RefreshCw size={17} /> Retry</button>
        </section>
      ) : (
        <>
          <div className="progress-source"><Cloud size={16} /> {accountMode ? 'Synced account records only' : demoMode ? 'Temporary Judge Demo records only' : 'On-device guest records only'}</div>
          <section className="progress-stats">
            <article className="progress-stat-main"><Dumbbell size={24} /><span>Saved camera sessions</span><strong>{summary.workouts}</strong><small>{hasSampleHistory ? 'temporary, clearly labelled demo history' : accountMode ? 'up to 50 most recent account sessions' : 'saved in this browser'}</small></article>
            <article><CalendarDays size={22} /><span>Weekly active days</span><strong>{summary.weeklyActiveDays}</strong><small>out of 7 days</small></article>
            <article><Trophy size={22} /><span>Tracked reps</span><strong>{summary.reps}</strong><small>across loaded camera sessions</small></article>
            <article><Flame size={22} /><span>Current streak</span><strong>{summary.streak}</strong><small>{summary.streak === 1 ? 'day' : 'days'} in a row</small></article>
          </section>

          <section className="history-panel panel">
            <div className="history-heading"><div><span className="eyebrow">Workout history</span><h2>Recent sessions</h2></div><History size={23} /></div>
            {sessions.length ? (
              <div className="history-list">
                {sessions.slice(0, visibleCount).map((session) => (
                  <article className="history-row" key={session.id}>
                    <div className={`history-icon ${session.source === 'sample' ? 'sample' : ''}`}>{session.source === 'sample' ? <Sparkles size={19} /> : <Dumbbell size={19} />}</div>
                    <div className="history-copy">
                      <div><strong>{session.exerciseName || (session.exerciseId === 'squats' || !session.exerciseId ? 'Squat' : session.exerciseId)} coach session</strong>{session.source === 'sample' && <span className="sample-label">Sample history</span>}</div>
                      <small>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(session.completedAt))} · {formatDuration(session.durationSeconds || 0)} · {Number(session.calories || 0).toFixed(1)} kcal estimate</small>
                    </div>
                    <div className="history-reps"><strong>{session.reps}</strong><small>reps</small></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-history"><Dumbbell size={28} /><h3>Your first session starts here</h3><p>Finish and save a camera-coach session to see it in progress.</p></div>
            )}
            {sessions.length > visibleCount && <button className="button button-quiet" onClick={() => setVisibleCount((count) => count + 10)}>Show more sessions</button>}
          </section>
        </>
      )}

      <section className="progress-cta"><div><span className="eyebrow light">Keep the streak going</span><h2>Ready for another short session?</h2></div><button className="button button-white" onClick={onStart}>Start a workout <ChevronRight size={18} /></button></section>
    </main>
  );
}
