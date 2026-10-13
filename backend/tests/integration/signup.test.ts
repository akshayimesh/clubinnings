import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { app, signupClub, validSignup } from '../helpers/api.js';
import { closeDb, count, resetDb } from '../helpers/db.js';

beforeEach(resetDb);
afterAll(closeDb);

describe('POST /api/auth/signup', () => {
  it('creates a club and its admin user and returns a token', async () => {
    const res = await request(app).post('/api/auth/signup').send(validSignup);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.club).toMatchObject({ name: 'Riverside Cricket Club', slug: 'riverside-cricket-club', plan: 'free' });
    expect(res.body.user).toMatchObject({ email: 'captain@riverside.test', role: 'admin', clubId: res.body.club.id });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    await signupClub();
    const { rows } = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users');
    expect(rows[0]!.password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0]!.password_hash).not.toContain(validSignup.password);
  });

  it('normalises the email to lowercase', async () => {
    const { user } = await signupClub({ email: 'Captain@Riverside.TEST' });
    expect(user.email).toBe('captain@riverside.test');
  });

  it('accepts an explicit club slug', async () => {
    const { club } = await signupClub({ clubSlug: 'rcc' });
    expect(club.slug).toBe('rcc');
  });

  it('suffixes the derived slug when the club name is already used', async () => {
    await signupClub();
    const { club } = await signupClub({ email: 'other@riverside.test' });
    expect(club.slug).toMatch(/^riverside-cricket-club-[0-9a-f]{6}$/);
  });

  it('returns 409 for a taken explicit slug', async () => {
    await signupClub({ clubSlug: 'rcc' });
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignup, email: 'other@riverside.test', clubSlug: 'rcc' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 409 for a duplicate email and rolls back the new club', async () => {
    await signupClub();
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignup, clubName: 'Another Club', email: 'CAPTAIN@riverside.test' });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CONFLICT', message: 'An account with this email already exists' });
    expect(await count('clubs')).toBe(1);
    expect(await count('users')).toBe(1);
  });

  it.each([
    ['missing fields', {}],
    ['invalid email', { ...validSignup, email: 'not-an-email' }],
    ['short password', { ...validSignup, password: 'short' }],
    ['invalid slug', { ...validSignup, clubSlug: 'Bad Slug!' }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]));
    expect(await count('clubs')).toBe(0);
  });
});
