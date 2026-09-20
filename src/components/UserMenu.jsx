import { LogOut, UserRound } from 'lucide-react';

export default function UserMenu({ user, onSignOut }) {
  if (!user) return <span className="guest-chip"><UserRound size={15} /> Guest mode</span>;
  return (
    <div className="user-menu">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <UserRound size={18} />}
      <span><strong>{user.name}</strong><small>Synced account</small></span>
      <button type="button" onClick={onSignOut} aria-label="Sign out"><LogOut size={17} /></button>
    </div>
  );
}
