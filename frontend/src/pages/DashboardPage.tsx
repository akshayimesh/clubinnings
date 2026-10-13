import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user, club, logout } = useAuth();
  if (!user || !club) return null;

  return (
    <>
      <header className="topbar">
        <span className="brand">ClubInnings</span>
        <span className="topbar-right">
          <span className="muted">{user.email}</span>
          <button type="button" className="link-button" onClick={logout}>
            Log out
          </button>
        </span>
      </header>
      <main className="page">
        <p className="muted">Dashboard</p>
        <h1>{club.name}</h1>
        <dl className="facts">
          <div>
            <dt>Your role</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>{club.plan}</dd>
          </div>
          <div>
            <dt>Club URL slug</dt>
            <dd>{club.slug}</dd>
          </div>
        </dl>
      </main>
    </>
  );
}
