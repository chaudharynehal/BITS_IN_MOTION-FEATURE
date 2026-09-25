import { ArrowLeft, BarChart3, Camera, Dumbbell, Home, ListChecks } from 'lucide-react';
import UserMenu from './UserMenu';

const NAV_ITEMS = [
  ['dashboard', 'Home', Home],
  ['workouts', 'Workouts', Dumbbell],
  ['plan', 'My Plan', ListChecks],
  ['coach', 'Coach', Camera],
  ['progress', 'Progress', BarChart3],
];

export default function AppHeader({ screen, showPrimaryNavigation = true, onBack, onHome, onNavigate, user, status, displayName, onSignOut, onExitGuest }) {
  return (
    <header className="app-header">
      <div className="app-header-start">
        <button className="icon-button app-back-button" type="button" onClick={onBack} aria-label="Go back"><ArrowLeft size={20} /></button>
        <button className="brand-button" type="button" onClick={onHome} aria-label="Go to BITS in Motion homepage">
          <img src="/logo.svg" alt="" />
          <span>BITS <small>in Motion</small></span>
        </button>
      </div>
      {showPrimaryNavigation && <nav className="desktop-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map(([destination, label, Icon]) => <button className={screen === destination ? 'active' : ''} aria-current={screen === destination ? 'page' : undefined} onClick={() => onNavigate(destination)} key={destination}><Icon size={17} /> {label}</button>)}
      </nav>}
      <div className="app-header-account">
        <UserMenu user={user} status={status} displayName={displayName} onNavigate={onNavigate} onSignOut={onSignOut} onExitGuest={onExitGuest} />
      </div>
    </header>
  );
}
