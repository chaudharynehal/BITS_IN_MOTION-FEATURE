import { Activity, BriefcaseBusiness, Footprints, Move, ScanLine, Timer, Wind, Zap } from 'lucide-react';

const ICONS = {
  activity: Activity,
  briefcase: BriefcaseBusiness,
  footprints: Footprints,
  move: Move,
  scan: ScanLine,
  timer: Timer,
  wind: Wind,
  zap: Zap,
};

export default function ExerciseCard({ exercise, index, onStartCoach }) {
  const Icon = ICONS[exercise.icon] || Activity;
  return (
    <article className={`exercise-card ${exercise.cameraSupported ? 'exercise-card-featured' : ''}`}>
      <div className="exercise-order">{String(index + 1).padStart(2, '0')}</div>
      <div className="exercise-icon"><Icon size={23} /></div>
      <div className="exercise-copy">
        <div className="exercise-meta"><span>{exercise.category}</span><strong>{exercise.duration}</strong></div>
        <h3>{exercise.name}</h3>
        <p>{exercise.instruction}</p>
      </div>
      {exercise.cameraSupported && (
        <button className="button button-camera" onClick={() => onStartCoach(exercise.id)}><ScanLine size={18} /> Start camera coach</button>
      )}
    </article>
  );
}
