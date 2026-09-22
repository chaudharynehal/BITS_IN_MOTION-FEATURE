import { useState } from 'react';
import { Camera, Check, Dumbbell, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { EXERCISES } from '../data/exercises';
import { MOVEMENT_SPACE } from '../../shared/recommendation';

const LIBRARY = Object.values(EXERCISES);

export default function WorkoutLibraryScreen({ onStartCoach, onNavigate }) {
  const [filter, setFilter] = useState('all');
  const exercises = filter === 'camera' ? LIBRARY.filter((exercise) => exercise.cameraSupported) : LIBRARY;

  return (
    <main className="screen-page library-page">
      <header className="library-heading">
        <div><span className="eyebrow">Workout library</span><h1>Find a movement that fits today</h1><p>Explore the exercises BITS in Motion actually supports. Four include live camera guidance; the others appear in personal plans with written cues.</p></div>
        <div className="library-privacy"><ShieldCheck size={18} /><span>Camera frames stay in your browser</span></div>
      </header>

      <div className="library-toolbar">
        <div className="library-filters" aria-label="Filter workouts">
          <button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}><Dumbbell size={16} /> All movements</button>
          <button className={filter === 'camera' ? 'active' : ''} aria-pressed={filter === 'camera'} onClick={() => setFilter('camera')}><Camera size={16} /> Camera guided</button>
        </div>
        <button className="text-button" onClick={() => onNavigate('plan')}>View my personal plan</button>
      </div>

      <section className="library-grid">
        {exercises.map((exercise) => (
          <article className={'library-card ' + (exercise.cameraSupported ? 'camera-ready' : '')} key={exercise.id}>
            <div className="library-card-top">
              <span className="library-category">{exercise.category}</span>
              {exercise.cameraSupported ? <span className="camera-tag"><ScanLine size={14} /> Live guidance</span> : <span className="plan-tag"><Check size={14} /> Plan movement</span>}
            </div>
            <div className="library-icon">{exercise.cameraSupported ? <Camera size={27} /> : <Dumbbell size={27} />}</div>
            <h2>{exercise.name}</h2>
            <p>{exercise.instruction}</p>
            <div className="library-details">
              <span><strong>Example target</strong>{exercise.duration}</span>
              <span><strong>Equipment</strong>{exercise.equipment}</span>
              <span><strong>Level / impact</strong>{exercise.minLevel} · {exercise.impact}</span>
              <span><strong>Space</strong>{MOVEMENT_SPACE[exercise.id] === 'open' ? 'Open space' : 'Small space'}</span>
            </div>
            <p className="field-help">{exercise.primaryMuscles.join(' · ')}</p>
            {exercise.cameraSupported ? (
              <button className="button button-primary" onClick={() => onStartCoach(exercise.id, 'workouts')}><ScanLine size={17} /> Start camera coach</button>
            ) : (
              <span className="field-help">Self-guided movement · written cues only</span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
