import { pool, type Queryable } from '../db/pool.js';
import type { Player } from '../types/domain.js';

export interface PlayerRow {
  id: string;
  club_id: string;
  user_id: string | null;
  full_name: string;
  created_at: Date;
}

const COLUMNS = 'id, club_id, user_id, full_name, created_at';

export const toPlayer = (r: PlayerRow): Player => ({
  id: r.id,
  clubId: r.club_id,
  userId: r.user_id,
  fullName: r.full_name,
  createdAt: r.created_at,
});

export async function listPlayers(clubId: string, db: Queryable = pool): Promise<Player[]> {
  const { rows } = await db.query<PlayerRow>(
    `SELECT ${COLUMNS} FROM players WHERE club_id = $1 ORDER BY lower(full_name), id`,
    [clubId],
  );
  return rows.map(toPlayer);
}

/** Tenant-scoped lookup: a player is only visible within their own club. */
export async function findPlayer(playerId: string, clubId: string, db: Queryable = pool): Promise<Player | null> {
  const { rows } = await db.query<PlayerRow>(`SELECT ${COLUMNS} FROM players WHERE id = $1 AND club_id = $2`, [
    playerId,
    clubId,
  ]);
  return rows[0] ? toPlayer(rows[0]) : null;
}

export async function createPlayer(clubId: string, fullName: string, db: Queryable = pool): Promise<Player> {
  const { rows } = await db.query<PlayerRow>(
    `INSERT INTO players (club_id, full_name) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [clubId, fullName],
  );
  return toPlayer(rows[0]!);
}
