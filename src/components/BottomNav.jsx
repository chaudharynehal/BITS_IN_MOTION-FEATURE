import { BarChart3, Home, Trophy, UserRound } from 'lucide-react';

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <button className={screen === 'welcome' ? 'active' : ''} onClick={() => onNavigate('welcome')}><Home size={20} /><span>Home</span></button>
      <button className={screen === 'profile' ? 'active' : ''} onClick={() => onNavigate('profile')}><UserRound size={20} /><span>Profile</span></button>
      <button className={screen === 'progress' ? 'active' : ''} onClick={() => onNavigate('progress')}><BarChart3 size={20} /><span>Progress</span></button>
      <button className={screen === 'leaderboard' ? 'active' : ''} onClick={() => onNavigate('leaderboard')}><Trophy size={20} /><span>Leaders</span></button>
    </nav>
  );
}
