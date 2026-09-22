import { useEffect, useState } from 'react';
import { CalendarDays, CloudOff, Crown, LoaderCircle, RefreshCw, ShieldCheck, Trophy, Users } from 'lucide-react';
import ScreenHeader from '../components/ScreenHeader';
import { api } from '../services/api';

const SAMPLE = {
  community: { active_people: 18, workouts: 47, reps: 864 },
  leaders: [
    { rank: 1, name: 'Campus Mover', workouts: 6, reps: 148, activeDays: 5 },
    { rank: 2, name: 'Hostel Hero', workouts: 5, reps: 132, activeDays: 4 },
    { rank: 3, name: 'Room Runner', workouts: 4, reps: 105, activeDays: 4 },
    { rank: 4, name: 'Study Break', workouts: 3, reps: 86, activeDays: 3 },
  ],
};

export default function LeaderboardScreen({ user, accountSyncAvailable, onHome }) {
  const [period, setPeriod] = useState('week');
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState(null);
  const accountId = user?.email;
  const requestKey = accountId ? accountId + ':' + period + ':' + attempt : 'sample';
  const current = resource?.key === requestKey ? resource : null;
  const status = !accountId ? 'sample' : current?.status || 'loading';
  const data = status === 'sample' ? SAMPLE : current?.data;

  useEffect(() => {
    if (!accountId) return undefined;
    let active = true;
    setResource({ key: requestKey, status: 'loading', data: null });
    api.leaderboard(period).then((payload) => {
      if (active) setResource({ key: requestKey, status: 'ready', data: payload });
    }).catch(() => {
      if (active) setResource({ key: requestKey, status: 'error', data: null });
    });
    return () => { active = false; };
  }, [accountId, period, requestKey]);

  const community = data?.community || {};
  const leaders = data?.leaders || [];
  return (
    <main className="screen-page leaderboard-page">
      <ScreenHeader
        eyebrow="Community momentum"
        title="A leaderboard built for consistency"
        description="Compare completed workouts and tracked repetitions—not body measurements or appearance."
      />

      {status === 'sample' && (
        <div className="sample-banner">
          <strong>Sample leaderboard preview</strong>
          <span>{accountSyncAvailable ? 'These are example rankings. Sign in from Home and opt in through Profile to join the live leaderboard.' : 'These are example rankings. Live rankings will be available when cloud sign-in is connected.'}</span>
        </div>
      )}

      <section className="leaderboard-hero panel-dark" aria-live="polite">
        <div>
          <span className="eyebrow light">{status === 'sample' ? 'Illustrative community activity' : period === 'week' ? 'Last 7 days' : 'All time'}</span>
          {status === 'loading' ? <><h2>Loading community activity…</h2><p>Getting the latest opt-in rankings.</p></> : status === 'error' ? <><h2>Rankings are unavailable right now</h2><p>Your personal workout history is unchanged.</p></> : <><h2>{community.active_people || 0} students kept moving</h2><p>{community.sessions ?? community.workouts ?? 0} logged sessions and {community.reps || 0} camera-tracked repetitions.</p></>}
        </div>
        <Users size={50} />
      </section>

      <div className="leaderboard-toolbar">
        <div className="period-toggle" aria-label="Leaderboard time period">
          <button className={period === 'week' ? 'active' : ''} aria-pressed={period === 'week'} onClick={() => setPeriod('week')}><CalendarDays size={16} /> This week</button>
          <button className={period === 'all' ? 'active' : ''} aria-pressed={period === 'all'} onClick={() => setPeriod('all')}><Trophy size={16} /> All time</button>
        </div>
        <div className="privacy-chip"><ShieldCheck size={16} /> Opt-in aliases only</div>
      </div>

      <section className="leaderboard-panel panel" aria-label="Workout leaderboard" aria-busy={status === 'loading'}>
        <div className="leaderboard-columns"><span>Rank & student</span><span>Active days</span><span>Sessions</span><span>Reps</span></div>
        {status === 'loading' ? (
          <div className="leaderboard-loading" role="status"><LoaderCircle className="spin" size={24} /> Loading community activity…</div>
        ) : status === 'error' ? (
          <div className="leaderboard-empty" role="alert"><CloudOff size={27} /><h3>We couldn’t load the leaderboard</h3><p>Check your connection and try again.</p><button className="button button-primary" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={17} /> Retry leaderboard</button></div>
        ) : leaders.length ? leaders.map((leader) => (
          <article className={'leader-row ' + (leader.isCurrentUser ? 'current' : '')} key={leader.rank + '-' + leader.name}>
            <div className="leader-person">
              <div className={'rank-badge rank-' + leader.rank}>{leader.rank <= 3 ? <Crown size={17} /> : leader.rank}</div>
              {leader.avatarUrl ? <img src={leader.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className="avatar-fallback">{leader.name.slice(0, 1).toUpperCase()}</div>}
              <strong>{leader.name}{leader.isCurrentUser && <small>You</small>}</strong>
            </div>
            <span data-label="Active days">{leader.activeDays}</span>
            <span data-label="Sessions">{leader.sessions ?? leader.workouts}</span>
            <span data-label="Reps">{leader.reps}</span>
          </article>
        )) : <div className="leaderboard-empty"><Trophy size={27} /><h3>{period === 'week' ? 'This week’s ranking starts here' : 'The first ranking starts here'}</h3><p>Opt in from Profile and complete a session when you’re ready.</p></div>}
      </section>

      <aside className="leaderboard-note"><ShieldCheck size={18} /><p>Rankings celebrate consistency and are not verified sporting results. Emails, body measurements and private profile details are never displayed.</p></aside>
    </main>
  );
}
