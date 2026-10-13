import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyToken } from '../../src/services/token.service.js';
import { app, signupClub, validSignup } from '../helpers/api.js';
import { closeDb, resetDb } from '../helpers/db.js';

beforeEach(resetDb);
afterAll(closeDb);

describe('POST /api/auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    const { user, club } = await signupClub();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignup.email, password: validSignup.password });

    expect(res.status).toBe(200);
    expect(verifyToken(res.body.token)).toEqual({ userId: user.id, clubId: club.id, role: 'admin' });
    expect(res.body.club.name).toBe('Riverside Cricket Club');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('treats the email case-insensitively', async () => {
    await signupClub();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'CAPTAIN@Riverside.test', password: validSignup.password });
    expect(res.status).toBe(200);
  });

  it('returns 401 for a wrong password', async () => {
    await signupClub();
    const res = await request(app).post('/api/auth/login').send({ email: validSignup.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  it('returns the same 401 for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.test', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
