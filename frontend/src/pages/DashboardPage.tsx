import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppLayout } from '../components/AppLayout';

export function DashboardPage() {
  const { user, club } = useAuth();
  if (!user || !club) return null;

  return (
    <AppLayout>
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
      <p>
        <Link to="/teams">View teams and rosters →</Link>
      </p>
    </AppLayout>
  );
}
