import { useEffect, useRef } from 'react';
import { ChevronDown, LayoutDashboard, LogIn, LogOut, Trophy, UserRound } from 'lucide-react';

export default function UserMenu({ user, status, displayName, onNavigate, onSignOut, onExitGuest, dark = false }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function dismiss(event) {
      const menu = menuRef.current;
      if (!menu?.open) return;
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return;
        menu.open = false;
        menu.querySelector('summary')?.focus();
      } else if (!menu.contains(event.target)) {
        menu.open = false;
      }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, []);

  function choose(action) {
    if (menuRef.current) menuRef.current.open = false;
    action?.();
  }

  if (!['signed-in', 'guest', 'demo'].includes(status)) return null;
  const accountName = displayName || user?.name || (status === 'demo' ? 'Judge demo' : 'Guest');
  const accountLabel = status === 'signed-in' ? 'Synced account' : status === 'demo' ? 'Temporary demo' : 'Guest account';

  return (
    <details ref={menuRef} className={'account-menu ' + (dark ? 'account-menu-dark' : '')}>
      <summary>
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="account-avatar"><UserRound size={17} /></span>}
        <span><strong>{accountName}</strong><small>{accountLabel}</small></span>
        <ChevronDown size={15} />
      </summary>
      <div className="account-popover">
        <div className="account-popover-heading">
          <strong>{accountName}</strong>
          {user?.email && <small>{user.email}</small>}
          {!user?.email && <small>{accountLabel} · no cloud sync</small>}
        </div>
        <button onClick={() => choose(() => onNavigate('dashboard'))}><LayoutDashboard size={17} /> Dashboard</button>
        <button onClick={() => choose(() => onNavigate('profile'))}><UserRound size={17} /> Fitness profile</button>
        <button onClick={() => choose(() => onNavigate('leaderboard'))}><Trophy size={17} /> Leaderboard</button>
        <div className="account-popover-divider" />
        {status === 'signed-in' ? (
          <button className="account-signout" onClick={() => choose(onSignOut)}><LogOut size={17} /> Sign out</button>
        ) : status === 'guest' ? (
          <button className="account-signout" onClick={() => choose(onExitGuest)}><LogIn size={17} /> Sign in or exit guest</button>
        ) : (
          <button className="account-signout" onClick={() => choose(onExitGuest)}><LogOut size={17} /> Exit judge demo</button>
        )}
      </div>
    </details>
  );
}
