import { Check } from 'lucide-react';

const STEPS = ['Profile', 'Plan', 'Coach', 'Result', 'Progress'];

export default function StepRail({ current }) {
  const activeIndex = STEPS.indexOf(current);
  return (
    <div className="step-rail" aria-label={`Current step: ${current}`}>
      {STEPS.map((step, index) => (
        <div className={`step-node ${index < activeIndex ? 'complete' : ''} ${index === activeIndex ? 'active' : ''}`} key={step}>
          <span className="step-dot">{index < activeIndex ? <Check size={13} /> : index + 1}</span>
          <span className="step-name">{step}</span>
          {index < STEPS.length - 1 && <i className="step-line" />}
        </div>
      ))}
    </div>
  );
}
