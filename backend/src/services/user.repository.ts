import { pool, type Queryable } from '../db/pool.js';
import type { Role, User } from '../types/domain.js';

interface UserRow {
  id: string;
  club_id: string;
  email: string;
  role: Role;
  created_at: Date;
}

export interface UserWithHash extends User {
  passwordHash: string;
}

const COLUMNS = 'id, club_id, email, role, created_at';

const toUser = (r: UserRow): User => ({
  id: r.id,
  clubId: r.club_id,
  email: r.email,
  role: r.role,
  createdAt: r.created_at,
});

export async function createUser(
  db: Queryable,
  input: { clubId: string; email: string; passwordHash: string; role: Role },
): Promise<User> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (club_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [input.clubId, input.email, input.passwordHash, input.role],
  );
  return toUser(rows[0]!);
}

export async function findUserByEmail(email: string, db: Queryable = pool): Promise<UserWithHash | null> {
  const { rows } = await db.query<UserRow & { password_hash: string }>(
    `SELECT ${COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  const row = rows[0];
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

/** Tenant-scoped lookup: a user is only visible within their own club. */
export async function findUserInClub(userId: string, clubId: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1 AND club_id = $2`, [
    userId,
    clubId,
  ]);
  return rows[0] ? toUser(rows[0]) : null;
}
