import { BarChart3, Camera, Dumbbell, Home, ListChecks } from 'lucide-react';

const ITEMS = [
  ['dashboard', 'Home', Home],
  ['workouts', 'Workouts', Dumbbell],
  ['plan', 'Plan', ListChecks],
  ['coach', 'Coach', Camera],
  ['progress', 'Progress', BarChart3],
];

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {ITEMS.map(([destination, label, Icon]) => <button className={screen === destination ? 'active' : ''} aria-current={screen === destination ? 'page' : undefined} onClick={() => onNavigate(destination)} key={destination}><Icon size={20} /><span>{label}</span></button>)}
    </nav>
  );
}
