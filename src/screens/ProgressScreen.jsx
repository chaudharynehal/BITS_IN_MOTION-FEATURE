import { useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, Cloud, Dumbbell, Flame, History, LoaderCircle, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import WeeklyActivityCard from '../components/WeeklyActivityCard';
import { getProgressSummary } from '../utils/storage';

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ProgressScreen({ sessions, sessionSummary = null, loadState, persistenceMode, onRetry, onHome, onStart }) {
  const accountMode = persistenceMode === 'account';
  const demoMode = persistenceMode === 'demo';
  const summary = getProgressSummary(sessions, sessionSummary);
  const [visibleCount, setVisibleCount] = useState(6);
  return (
    <main className="screen-page progress-page" data-testid="progress-page">
      <ScreenHeader eyebrow="Progress" title="How am I doing?" description={accountMode ? 'Your private history, loaded only from your signed-in account.' : demoMode ? 'Judge Demo history is temporary and separate from all saved data.' : 'Guest history is stored only in this browser.'} onBack={onHome} />

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
          <div className="progress-source"><Cloud size={15} /> {accountMode ? 'Synced account records only' : demoMode ? 'Temporary Judge Demo records only' : 'On-device guest records only'}</div>
          <section className="progress-overview">
            <WeeklyActivityCard sessions={sessions} streak={summary.streak} />
            <aside className="progress-totals panel" aria-label="All-time totals" data-testid="progress-totals">
              <span className="eyebrow">All time</span>
              <div><Dumbbell size={17} /><strong>{summary.workouts}</strong><span>completed sessions</span></div>
              <div><Trophy size={17} /><strong>{summary.reps}</strong><span>tracked reps</span></div>
              <div><CalendarDays size={17} /><strong>{summary.weeklyActiveDays}<small>/7</small></strong><span>active days this week</span></div>
              <div><Flame size={17} /><strong>{summary.streak}</strong><span>{summary.streak === 1 ? 'day streak' : 'day streak'}</span></div>
            </aside>
          </section>

          <section className="history-panel panel" data-testid="progress-history">
            <div className="history-heading"><div><span className="eyebrow">Workout history</span><h2>Recent sessions</h2></div><History size={21} /></div>
            {sessions.length ? (
              <div className="history-list">
                {sessions.slice(0, visibleCount).map((session) => (
                  <article className="history-row" key={session.id}>
                    <div className={`history-icon ${session.source === 'sample' ? 'sample' : ''}`}>{session.source === 'sample' ? <Sparkles size={19} /> : <Dumbbell size={19} />}</div>
                    <div className="history-copy">
                      <div>
                        <strong>
                          {session.source === 'self-guided'
                            ? `${session.exerciseName || session.exerciseId}`
                            : `${session.exerciseName || (session.exerciseId === 'squats' || !session.exerciseId ? 'Squat' : session.exerciseId)}`}
                        </strong>
                        {session.source === 'sample' && <span className="sample-label">Sample</span>}
                        {session.source === 'self-guided' && <span className="sample-label is-guided">Self-guided</span>}
                      </div>
                      <small>{dateFormat.format(new Date(session.completedAt))} · {formatDuration(session.durationSeconds || 0)} · {Number(session.calories || 0).toFixed(0)} kcal est.</small>
                    </div>
                    <div className="history-reps"><strong>{Number(session.reps) > 0 ? session.reps : '—'}</strong><small>{Number(session.reps) > 0 ? 'reps' : 'timed'}</small></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-history"><Dumbbell size={28} /><h3>Your first session starts here</h3><p>Finish and save a workout session to see your progress here.</p></div>
            )}
            {sessions.length > visibleCount && <button className="button button-quiet" onClick={() => setVisibleCount((count) => count + 10)}>Show more sessions</button>}
          </section>
        </>
      )}

      <section className="progress-cta"><div><span className="eyebrow light">Keep it going</span><h2>Ready for another short session?</h2></div><button className="button button-white" onClick={onStart}>Start a workout <ChevronRight size={18} /></button></section>
    </main>
  );
}
