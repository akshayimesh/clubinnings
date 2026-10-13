import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Top bar with navigation and logout, shared by the signed-in pages. */
export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="topbar">
        <span className="topbar-left">
          <span className="brand">ClubInnings</span>
          <nav className="nav">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/teams">Teams</NavLink>
          </nav>
        </span>
        <span className="topbar-right">
          <span className="muted">{user?.email}</span>
          <button type="button" className="link-button" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
