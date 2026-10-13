import { pool } from '../../src/db/pool.js';

export async function resetDb() {
  await pool.query('TRUNCATE team_players, players, teams, users, clubs RESTART IDENTITY CASCADE');
}

export async function closeDb() {
  await pool.end();
}

export async function count(table: 'clubs' | 'users' | 'teams' | 'players' | 'team_players'): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(rows[0]!.n);
}
