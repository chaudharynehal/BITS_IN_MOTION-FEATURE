import { ArrowLeft, Clock3, Info, Sparkles } from 'lucide-react';
import ExerciseCard from '../components/ExerciseCard';
import FoodGuidanceCard from '../components/FoodGuidanceCard';
import ScreenHeader from '../components/ScreenHeader';
import StepRail from '../components/StepRail';

export default function PlanScreen({ profile, plan, onStartCoach, onBack }) {
  return (
    <main className="screen-page plan-page">
      <StepRail current="Plan" />
      <ScreenHeader
        eyebrow="Step 2 of 5"
        title="Your plan fits the room"
        description="A balanced sequence with camera coaching for squats, push-ups, crunches and jumping jacks."
        onBack={onBack}
      />

      <section className="plan-hero panel-dark">
        <div>
          <span className="status-pill dark"><Sparkles size={16} /> Built from your profile</span>
          <h2>{plan.title}</h2>
          <p>{plan.focus}</p>
        </div>
        <div className="plan-duration"><Clock3 size={25} /><strong>{plan.totalMinutes}</strong><span>minutes</span></div>
      </section>

      <section className="reason-strip">
        <strong>Why this plan?</strong>
        <div>{plan.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
      </section>

      <div className="plan-content-grid">
        <section className="exercise-list" aria-label="Workout exercises">
          {plan.exercises.map((exercise, index) => <ExerciseCard exercise={exercise} index={index} key={exercise.id} onStartCoach={onStartCoach} />)}
        </section>
        <div className="plan-side">
          <FoodGuidanceCard goal={profile.goal} />
          <aside className="note-card"><Info size={18} /><p>Work at a comfortable pace. Stop the session if you feel pain, dizziness or unusual discomfort.</p></aside>
        </div>
      </div>

      <button className="text-button" onClick={onBack}><ArrowLeft size={16} /> Edit profile</button>
    </main>
  );
}
