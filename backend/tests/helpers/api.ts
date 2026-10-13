import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { signToken } from '../../src/services/token.service.js';
import type { Role } from '../../src/types/domain.js';

export const app = createApp();

export const validSignup = {
  clubName: 'Riverside Cricket Club',
  email: 'captain@riverside.test',
  password: 'correct-horse-battery',
};

export async function signupClub(overrides: Partial<typeof validSignup> & { clubSlug?: string } = {}) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ ...validSignup, ...overrides });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as {
    token: string;
    user: { id: string; clubId: string; email: string; role: string };
    club: { id: string; name: string; slug: string; plan: string };
  };
}

/** Adds a user with the given role to a club and returns a token for them (there is no invite endpoint yet). */
export async function memberToken(clubId: string, role: Role): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (club_id, email, password_hash, role) VALUES ($1, $2, 'not-a-real-hash', $3) RETURNING id`,
    [clubId, `${role}-${randomUUID()}@members.test`, role],
  );
  return signToken({ userId: rows[0]!.id, clubId, role });
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
