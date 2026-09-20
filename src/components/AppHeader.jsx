import { BarChart3, Home, Trophy, UserRound } from 'lucide-react';
import UserMenu from './UserMenu';

export default function AppHeader({ screen, onNavigate, user, onSignOut, compact = false }) {
  return (
    <header className={`app-header ${compact ? 'app-header-compact' : ''}`}>
      <button className="brand-button" onClick={() => onNavigate('welcome')} aria-label="BITS in Motion home">
        <img src="/logo.png" alt="" />
        <span>BITS <small>in Motion</small></span>
      </button>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <button className={screen === 'welcome' ? 'active' : ''} onClick={() => onNavigate('welcome')}><Home size={17} /> Home</button>
        <button className={screen === 'profile' ? 'active' : ''} onClick={() => onNavigate('profile')}><UserRound size={17} /> Profile</button>
        <button className={screen === 'progress' ? 'active' : ''} onClick={() => onNavigate('progress')}><BarChart3 size={17} /> Progress</button>
        <button className={screen === 'leaderboard' ? 'active' : ''} onClick={() => onNavigate('leaderboard')}><Trophy size={17} /> Leaderboard</button>
      </nav>
      <UserMenu user={user} onSignOut={onSignOut} />
    </header>
  );
}
