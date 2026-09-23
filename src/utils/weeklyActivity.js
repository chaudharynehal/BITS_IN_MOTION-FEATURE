const DAY_LABEL = new Intl.DateTimeFormat('en', { weekday: 'short' });

// Groups existing saved sessions into the last seven calendar days. Only real recorded
// fields are summed (duration, reps, calorie estimate); nothing is inferred or scored.
export function weeklyActivity(sessions = [], now = new Date()) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { key: date.toDateString(), date: date.toISOString(), label: DAY_LABEL.format(date).slice(0, 2), isToday: index === 6, count: 0, minutes: 0, reps: 0, calories: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const session of sessions) {
    const day = byKey.get(new Date(session.completedAt).toDateString());
    if (!day) continue;
    day.count += 1;
    day.minutes += (Number(session.durationSeconds) || 0) / 60;
    day.reps += Number(session.reps) || 0;
    day.calories += Number(session.calories) || 0;
  }
  const totals = days.reduce((sum, day) => ({
    sessions: sum.sessions + day.count,
    minutes: sum.minutes + day.minutes,
    reps: sum.reps + day.reps,
    calories: sum.calories + day.calories,
    activeDays: sum.activeDays + (day.count ? 1 : 0),
  }), { sessions: 0, minutes: 0, reps: 0, calories: 0, activeDays: 0 });
  return {
    days,
    totals: { ...totals, minutes: Math.round(totals.minutes), calories: Math.round(totals.calories) },
    maxMinutes: Math.max(1, ...days.map((day) => day.minutes)),
  };
}
