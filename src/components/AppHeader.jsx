import { BarChart3, Camera, Dumbbell, Home, ListChecks } from 'lucide-react';
import UserMenu from './UserMenu';

const NAV_ITEMS = [
  ['dashboard', 'Home', Home],
  ['workouts', 'Workouts', Dumbbell],
  ['plan', 'My Plan', ListChecks],
  ['coach', 'Coach', Camera],
  ['progress', 'Progress', BarChart3],
];

export default function AppHeader({ screen, onNavigate, user, status, displayName, onSignOut, onExitGuest }) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={() => onNavigate('dashboard')} aria-label="BITS in Motion dashboard">
        <img src="/logo.png" alt="" />
        <span>BITS <small>in Motion</small></span>
      </button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map(([destination, label, Icon]) => <button className={screen === destination ? 'active' : ''} aria-current={screen === destination ? 'page' : undefined} onClick={() => onNavigate(destination)} key={destination}><Icon size={17} /> {label}</button>)}
      </nav>
      <UserMenu user={user} status={status} displayName={displayName} onNavigate={onNavigate} onSignOut={onSignOut} onExitGuest={onExitGuest} />
    </header>
  );
}
