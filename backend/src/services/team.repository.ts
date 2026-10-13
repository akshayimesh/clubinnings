import { pool, type Queryable } from '../db/pool.js';
import type { Team } from '../types/domain.js';

interface TeamRow {
  id: string;
  club_id: string;
  name: string;
  player_count: number;
  created_at: Date;
}

const toTeam = (r: TeamRow): Team => ({
  id: r.id,
  clubId: r.club_id,
  name: r.name,
  playerCount: r.player_count,
  createdAt: r.created_at,
});

const SELECT_TEAMS = `
  SELECT t.id, t.club_id, t.name, t.created_at, count(tp.player_id)::int AS player_count
  FROM teams t
  LEFT JOIN team_players tp ON tp.team_id = t.id
  WHERE t.club_id = $1`;

export async function listTeams(clubId: string, db: Queryable = pool): Promise<Team[]> {
  const { rows } = await db.query<TeamRow>(`${SELECT_TEAMS} GROUP BY t.id ORDER BY lower(t.name), t.id`, [clubId]);
  return rows.map(toTeam);
}

/** Tenant-scoped lookup: a team is only visible within its own club. */
export async function findTeam(teamId: string, clubId: string, db: Queryable = pool): Promise<Team | null> {
  const { rows } = await db.query<TeamRow>(`${SELECT_TEAMS} AND t.id = $2 GROUP BY t.id`, [clubId, teamId]);
  return rows[0] ? toTeam(rows[0]) : null;
}

/**
 * Locks the team row until the transaction ends, so concurrent roster changes on one team
 * (e.g. two captain swaps) run one after another. Returns false when the team isn't in the club.
 */
export async function lockTeam(db: Queryable, teamId: string, clubId: string): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM teams WHERE id = $1 AND club_id = $2 FOR UPDATE', [
    teamId,
    clubId,
  ]);
  return (rowCount ?? 0) > 0;
}

export async function createTeam(clubId: string, name: string, db: Queryable = pool): Promise<Team> {
  const { rows } = await db.query<TeamRow>(
    'INSERT INTO teams (club_id, name) VALUES ($1, $2) RETURNING id, club_id, name, created_at, 0 AS player_count',
    [clubId, name],
  );
  return toTeam(rows[0]!);
}

export async function renameTeam(teamId: string, clubId: string, name: string, db: Queryable = pool): Promise<Team | null> {
  const { rows } = await db.query<TeamRow>(
    `WITH t AS (
       UPDATE teams SET name = $3 WHERE id = $1 AND club_id = $2 RETURNING id, club_id, name, created_at
     )
     SELECT t.*, (SELECT count(*)::int FROM team_players tp WHERE tp.team_id = t.id) AS player_count FROM t`,
    [teamId, clubId, name],
  );
  return rows[0] ? toTeam(rows[0]) : null;
}

/** Returns false when no team with this id exists in the club. Roster entries cascade. */
export async function deleteTeam(teamId: string, clubId: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM teams WHERE id = $1 AND club_id = $2', [teamId, clubId]);
  return (rowCount ?? 0) > 0;
}
