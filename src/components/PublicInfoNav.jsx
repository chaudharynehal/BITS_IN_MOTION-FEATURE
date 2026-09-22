import { FileText, HeartPulse, ListChecks, ShieldCheck, Sparkles } from 'lucide-react';

const ITEMS = [
  ['features', 'Features', Sparkles],
  ['how-it-works', 'How It Works', ListChecks],
  ['terms', 'Terms', FileText],
  ['privacy', 'Privacy', ShieldCheck],
  ['health-disclaimer', 'Health Disclaimer', HeartPulse],
];

export default function PublicInfoNav({ current, onNavigate }) {
  function follow(event, route) {
    event.preventDefault();
    if (route !== current) onNavigate(route);
  }

  return (
    <nav className="trust-subnav" aria-label="Product information and trust pages">
      {ITEMS.map(([route, label, Icon]) => (
        <a
          className={`trust-subnav-pill${current === route ? ' active' : ''}`}
          href={`#${route}`}
          aria-current={current === route ? 'page' : undefined}
          onClick={(event) => follow(event, route)}
          key={route}
        >
          <Icon size={16} aria-hidden="true" /> {label}
        </a>
      ))}
    </nav>
  );
}
