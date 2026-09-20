import { ArrowLeft } from 'lucide-react';

export default function ScreenHeader({ eyebrow, title, description, onBack, action }) {
  return (
    <div className="screen-heading">
      <div className="screen-heading-row">
        <div>
          {onBack && <button className="icon-button back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={21} /></button>}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
