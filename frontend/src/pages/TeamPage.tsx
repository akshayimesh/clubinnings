import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { playersApi, teamsApi, type Player, type RosterEntry, type Team } from '../api/teams';
import { useAuth } from '../auth/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { FormError, errorMessage } from '../components/FormError';

const NEW_PLAYER = '__new__';

export function TeamPage() {
  const { teamId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role !== 'player';
  const isAdmin = user?.role === 'admin';

  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await teamsApi.get(teamId);
      setTeam(res.team);
      setRoster(res.roster);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setLoadError(errorMessage(err));
    }
  }, [teamId]);

  useEffect(() => {
    void reload();
    if (canEdit) {
      playersApi
        .list()
        .then((res) => setPlayers(res.players))
        .catch((err) => setLoadError(errorMessage(err)));
    }
  }, [reload, canEdit]);

  /** Runs a change, then refreshes the roster. Shows any API error and resolves to false on failure. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      await action();
      await reload();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteTeam() {
    if (!team || !window.confirm(`Delete ${team.name}? Its roster will be removed too.`)) return;
    setBusy(true);
    try {
      await teamsApi.remove(team.id);
      navigate('/teams', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <AppLayout>
        <h1>Team not found</h1>
        <Link to="/teams">Back to teams</Link>
      </AppLayout>
    );
  }

  const rosterIds = new Set(roster.map((e) => e.player.id));
  const available = players.filter((p) => !rosterIds.has(p.id));

  return (
    <AppLayout>
      <p className="muted">
        <Link to="/teams">Teams</Link>
      </p>
      <FormError message={loadError} />
      {!team && !loadError && <p className="muted">Loading…</p>}
      {team && (
        <>
          <div className="heading-row">
            <h1>{team.name}</h1>
            {isAdmin && (
              <button type="button" className="danger-button" disabled={busy} onClick={onDeleteTeam}>
                Delete team
              </button>
            )}
          </div>

          {canEdit && (
            <AddPlayerForm
              available={available}
              busy={busy}
              onAdd={(input) =>
                run(async () => {
                  let playerId = input.playerId;
                  if (playerId === NEW_PLAYER) {
                    const { player } = await playersApi.create(input.newName);
                    setPlayers((prev) => [...prev, player]);
                    // Point the form at the new player so a retry after a failed add doesn't create a duplicate.
                    input.onPlayerCreated(player.id);
                    playerId = player.id;
                  }
                  await teamsApi.addPlayer(team.id, { playerId, shirtNumber: input.shirtNumber });
                })
              }
            />
          )}
          <FormError message={error} />

          {roster.length === 0 ? (
            <p className="muted">No players on this team yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Shirt</th>
                  <th scope="col">Captain</th>
                  {canEdit && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {roster.map((entry) => (
                  <tr key={entry.player.id}>
                    <td>{entry.player.fullName}</td>
                    <td>
                      {canEdit ? (
                        <ShirtInput
                          value={entry.shirtNumber}
                          disabled={busy}
                          label={`Shirt number for ${entry.player.fullName}`}
                          onSave={(shirtNumber) =>
                            run(() => teamsApi.updateEntry(team.id, entry.player.id, { shirtNumber }))
                          }
                        />
                      ) : (
                        (entry.shirtNumber ?? '–')
                      )}
                    </td>
                    <td>
                      {entry.isCaptain ? (
                        <span className="badge">Captain</span>
                      ) : (
                        canEdit && (
                          <button
                            type="button"
                            className="link-button"
                            disabled={busy}
                            onClick={() => run(() => teamsApi.updateEntry(team.id, entry.player.id, { isCaptain: true }))}
                          >
                            Make captain
                          </button>
                        )
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          type="button"
                          className="link-button danger-link"
                          disabled={busy}
                          onClick={() => run(() => teamsApi.removePlayer(team.id, entry.player.id))}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </AppLayout>
  );
}

interface AddPlayerInput {
  playerId: string;
  newName: string;
  shirtNumber?: number;
  onPlayerCreated: (playerId: string) => void;
}

function AddPlayerForm({
  available,
  busy,
  onAdd,
}: {
  available: Player[];
  busy: boolean;
  onAdd: (input: AddPlayerInput) => Promise<boolean>;
}) {
  const [playerId, setPlayerId] = useState('');
  const [newName, setNewName] = useState('');
  const [shirt, setShirt] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const added = await onAdd({
      playerId,
      newName,
      shirtNumber: shirt === '' ? undefined : Number(shirt),
      onPlayerCreated: (id) => {
        setPlayerId(id);
        setNewName('');
      },
    });
    if (!added) return;
    setPlayerId('');
    setNewName('');
    setShirt('');
  }

  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <label>
        Player
        <select required value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          <option value="" disabled>
            Choose a player…
          </option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
          <option value={NEW_PLAYER}>+ New player…</option>
        </select>
      </label>
      {playerId === NEW_PLAYER && (
        <label>
          Full name
          <input required maxLength={100} value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      <label>
        Shirt <span className="hint">(optional)</span>
        <input
          type="number"
          min={0}
          max={999}
          step={1}
          className="shirt-input"
          value={shirt}
          onChange={(e) => setShirt(e.target.value)}
        />
      </label>
      <button type="submit" disabled={busy}>
        Add to team
      </button>
    </form>
  );
}

/** Shirt number cell: saves on blur or Enter when the value changed; empty clears it. */
function ShirtInput({
  value,
  disabled,
  label,
  onSave,
}: {
  value: number | null;
  disabled: boolean;
  label: string;
  onSave: (value: number | null) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));

  useEffect(() => setDraft(value === null ? '' : String(value)), [value]);

  function commit() {
    const next = draft.trim() === '' ? null : Number(draft);
    if (next === value) return;
    // On failure, put back the saved number; on success the new value arrives via props.
    void onSave(next).then((ok) => {
      if (!ok) setDraft(value === null ? '' : String(value));
    });
  }

  return (
    <input
      type="number"
      min={0}
      max={999}
      step={1}
      className="shirt-input"
      aria-label={label}
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
