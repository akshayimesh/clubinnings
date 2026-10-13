import { pool, type Queryable } from '../db/pool.js';
import type { RosterEntry } from '../types/domain.js';
import { toPlayer, type PlayerRow } from './player.repository.js';

type EntryRow = PlayerRow & { shirt_number: number | null; is_captain: boolean; added_at: Date };

const toEntry = (r: EntryRow): RosterEntry => ({
  player: toPlayer(r),
  shirtNumber: r.shirt_number,
  isCaptain: r.is_captain,
  addedAt: r.added_at,
});

/** Joins a CTE of team_players rows named `e` to their players. */
const SELECT_WITH_PLAYER = `
  SELECT p.id, p.club_id, p.user_id, p.full_name, p.created_at, e.shirt_number, e.is_captain, e.added_at
  FROM e JOIN players p ON p.id = e.player_id AND p.club_id = e.club_id`;

/** The whole roster in one query: captain first, then by shirt number and name. */
export async function listRoster(teamId: string, clubId: string, db: Queryable = pool): Promise<RosterEntry[]> {
  const { rows } = await db.query<EntryRow>(
    `WITH e AS (SELECT * FROM team_players WHERE team_id = $1 AND club_id = $2)
     ${SELECT_WITH_PLAYER}
     ORDER BY e.is_captain DESC, e.shirt_number NULLS LAST, lower(p.full_name), p.id`,
    [teamId, clubId],
  );
  return rows.map(toEntry);
}

export async function insertEntry(
  db: Queryable,
  input: { teamId: string; playerId: string; clubId: string; shirtNumber: number | null; isCaptain: boolean },
): Promise<RosterEntry> {
  const { rows } = await db.query<EntryRow>(
    `WITH e AS (
       INSERT INTO team_players (team_id, player_id, club_id, shirt_number, is_captain)
       VALUES ($1, $2, $3, $4, $5) RETURNING *
     )
     ${SELECT_WITH_PLAYER}`,
    [input.teamId, input.playerId, input.clubId, input.shirtNumber, input.isCaptain],
  );
  return toEntry(rows[0]!);
}

/** Updates only the given fields. Returns null when the player isn't on the team. */
export async function updateEntry(
  db: Queryable,
  key: { teamId: string; playerId: string; clubId: string },
  patch: { shirtNumber?: number | null; isCaptain?: boolean },
): Promise<RosterEntry | null> {
  const params: unknown[] = [key.teamId, key.playerId, key.clubId];
  const sets: string[] = [];
  // Column names are fixed here; only values come from the request, as parameters.
  if (patch.shirtNumber !== undefined) {
    params.push(patch.shirtNumber);
    sets.push(`shirt_number = $${params.length}`);
  }
  if (patch.isCaptain !== undefined) {
    params.push(patch.isCaptain);
    sets.push(`is_captain = $${params.length}`);
  }
  if (sets.length === 0) throw new Error('updateEntry needs at least one field');

  const { rows } = await db.query<EntryRow>(
    `WITH e AS (
       UPDATE team_players SET ${sets.join(', ')}
       WHERE team_id = $1 AND player_id = $2 AND club_id = $3 RETURNING *
     )
     ${SELECT_WITH_PLAYER}`,
    params,
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

/** Removes the captain flag from whoever holds it on this team. */
export async function clearCaptain(db: Queryable, teamId: string, clubId: string): Promise<void> {
  await db.query('UPDATE team_players SET is_captain = false WHERE team_id = $1 AND club_id = $2 AND is_captain', [
    teamId,
    clubId,
  ]);
}

/** Returns false when the player wasn't on the team. */
export async function deleteEntry(
  teamId: string,
  playerId: string,
  clubId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM team_players WHERE team_id = $1 AND player_id = $2 AND club_id = $3', [
    teamId,
    playerId,
    clubId,
  ]);
  return (rowCount ?? 0) > 0;
}
