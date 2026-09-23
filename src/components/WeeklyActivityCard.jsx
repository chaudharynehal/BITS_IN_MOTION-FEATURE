import { ArrowRight, Flame } from 'lucide-react';
import { weeklyActivity } from '../utils/weeklyActivity';

function Stat({ value, label }) {
  return (
    <div className="week-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function WeeklyActivityCard({ sessions, streak, onOpenProgress, compact = false }) {
  const week = weeklyActivity(sessions);
  const { totals } = week;
  const headline = totals.sessions === 0
    ? 'No sessions yet this week'
    : `${totals.activeDays} active ${totals.activeDays === 1 ? 'day' : 'days'} this week`;

  return (
    <article className={`week-card panel${compact ? ' is-compact' : ''}`} data-testid="weekly-activity-card">
      <div className="week-card-heading">
        <div>
          <span className="eyebrow">This week</span>
          <h2>{headline}</h2>
        </div>
        {streak > 0 && (
          <span className="week-streak" data-testid="weekly-streak"><Flame size={15} /> {streak}-day streak</span>
        )}
      </div>
      <div className="week-bars" role="img" aria-label={`${totals.activeDays} of the last 7 days active`}>
        {week.days.map((day) => (
          <div key={day.key} className={day.count ? 'is-active' : ''} data-today={day.isToday || undefined}>
            <i style={{ height: `${day.count ? 22 + Math.round((day.minutes / week.maxMinutes) * 78) : 8}%` }} title={day.count ? `${day.count} session${day.count === 1 ? '' : 's'} · ${Math.round(day.minutes)} min` : 'Rest day'} />
            <span>{day.label}</span>
          </div>
        ))}
      </div>
      <div className="week-stats">
        <Stat value={totals.sessions} label="sessions" />
        <Stat value={totals.minutes} label="minutes" />
        <Stat value={totals.reps} label="reps" />
        <Stat value={totals.calories} label="kcal est." />
      </div>
      {onOpenProgress && (
        <button className="week-link" type="button" onClick={onOpenProgress} data-testid="weekly-open-progress">
          Full progress <ArrowRight size={15} />
        </button>
      )}
    </article>
  );
}
