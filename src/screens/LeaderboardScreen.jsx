import { useEffect, useState } from 'react';
import { CalendarDays, Crown, LoaderCircle, ShieldCheck, Trophy, Users } from 'lucide-react';
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
  const [data, setData] = useState(SAMPLE);
  const [status, setStatus] = useState(user ? 'loading' : 'sample');

  useEffect(() => {
    let active = true;
    if (!user) {
      setData(SAMPLE);
      setStatus('sample');
      return undefined;
    }
    setStatus('loading');
    api.leaderboard(period).then((payload) => {
      if (active) { setData(payload); setStatus('ready'); }
    }).catch(() => {
      if (active) { setData(SAMPLE); setStatus('error'); }
    });
    return () => { active = false; };
  }, [period, user]);

  const community = data.community || {};
  return (
    <main className="screen-page leaderboard-page">
      <ScreenHeader
        eyebrow="Community momentum"
        title="A leaderboard built for consistency"
        description="Compare completed workouts and tracked repetitions—not body measurements or appearance."
        onBack={onHome}
      />

      <section className="leaderboard-hero panel-dark">
        <div><span className="eyebrow light">{period === 'week' ? 'Last 7 days' : 'All time'}</span><h2>{community.active_people || 0} students kept moving</h2><p>{community.workouts || 0} workouts and {community.reps || 0} camera-tracked repetitions.</p></div>
        <Users size={50} />
      </section>

      <div className="leaderboard-toolbar">
        <div className="period-toggle" aria-label="Leaderboard time period">
          <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}><CalendarDays size={16} /> This week</button>
          <button className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}><Trophy size={16} /> All time</button>
        </div>
        <div className="privacy-chip"><ShieldCheck size={16} /> Opt-in aliases only</div>
      </div>

      {(status === 'sample' || status === 'error') && (
        <div className="sample-banner">
          <strong>{status === 'sample' ? 'Sample leaderboard preview' : 'Live leaderboard is temporarily unavailable'}</strong>
          <span>{!accountSyncAvailable ? 'Configure Google and database credentials to activate live community rankings.' : !user ? 'Sign in from Home and opt in through Profile to join.' : 'Showing sample data while the service reconnects.'}</span>
        </div>
      )}

      <section className="leaderboard-panel panel" aria-label="Workout leaderboard">
        <div className="leaderboard-columns"><span>Rank & student</span><span>Active days</span><span>Workouts</span><span>Reps</span></div>
        {status === 'loading' ? (
          <div className="leaderboard-loading"><LoaderCircle className="spin" size={24} /> Loading community activity…</div>
        ) : data.leaders.length ? data.leaders.map((leader) => (
          <article className={`leader-row ${leader.isCurrentUser ? 'current' : ''}`} key={`${leader.rank}-${leader.name}`}>
            <div className="leader-person">
              <div className={`rank-badge rank-${leader.rank}`}>{leader.rank <= 3 ? <Crown size={17} /> : leader.rank}</div>
              {leader.avatarUrl ? <img src={leader.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div className="avatar-fallback">{leader.name.slice(0, 1).toUpperCase()}</div>}
              <strong>{leader.name}{leader.isCurrentUser && <small>You</small>}</strong>
            </div>
            <span data-label="Active days">{leader.activeDays}</span>
            <span data-label="Workouts">{leader.workouts}</span>
            <span data-label="Reps">{leader.reps}</span>
          </article>
        )) : <div className="leaderboard-empty"><Trophy size={27} /><h3>The first weekly ranking starts here</h3><p>Opt in from Profile and complete a session.</p></div>}
      </section>

      <aside className="leaderboard-note"><ShieldCheck size={18} /><p>Rankings are motivational prototype totals, not verified sporting results. Emails, BMI, weight and private profile details are never displayed.</p></aside>
    </main>
  );
}
