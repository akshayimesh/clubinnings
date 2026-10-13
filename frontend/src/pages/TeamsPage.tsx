import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { teamsApi, type Team } from '../api/teams';
import { useAuth } from '../auth/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { FormError, errorMessage } from '../components/FormError';

export function TeamsPage() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'player';
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    teamsApi
      .list()
      .then((res) => setTeams(res.teams))
      .catch((err) => setLoadError(errorMessage(err)));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { team } = await teamsApi.create(name);
      setTeams((prev) => [...(prev ?? []), team].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <h1>Teams</h1>

      {canEdit && (
        <form className="inline-form" onSubmit={onCreate}>
          <label>
            New team
            <input required maxLength={60} placeholder="e.g. 1st XI" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create team'}
          </button>
          <FormError message={error} />
        </form>
      )}

      <FormError message={loadError} />
      {teams === null && !loadError && <p className="muted">Loading…</p>}
      {teams?.length === 0 && <p className="muted">No teams yet.</p>}
      {teams && teams.length > 0 && (
        <ul className="list">
          {teams.map((team) => (
            <li key={team.id}>
              <Link to={`/teams/${team.id}`}>{team.name}</Link>
              <span className="muted">
                {team.playerCount} {team.playerCount === 1 ? 'player' : 'players'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
