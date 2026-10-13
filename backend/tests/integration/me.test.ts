import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { signToken } from '../../src/services/token.service.js';
import { app, signupClub } from '../helpers/api.js';
import { closeDb, resetDb } from '../helpers/db.js';

beforeEach(resetDb);
afterAll(closeDb);

describe('GET /api/me', () => {
  it('returns the current user and club', async () => {
    const { token, user, club } = await signupClub();

    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email, role: 'admin', clubId: club.id });
    expect(res.body.club).toMatchObject({ id: club.id, name: 'Riverside Cricket Club' });
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a non-bearer scheme', async () => {
    const { token } = await signupClub();
    const res = await request(app).get('/api/me').set('Authorization', `Basic ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ sub: 'x', clubId: 'y', role: 'admin' }, 'some-other-secret-that-is-long-enough!!');
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const { user, club } = await signupClub();
    const expired = jwt.sign({ sub: user.id, clubId: club.id, role: 'admin' }, env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token with an unknown role', async () => {
    const { user, club } = await signupClub();
    const bad = jwt.sign({ sub: user.id, clubId: club.id, role: 'superuser' }, env.JWT_SECRET);
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('does not resolve a user against another club (tenant isolation)', async () => {
    const a = await signupClub();
    const b = await signupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });

    const crossTenant = signToken({ userId: a.user.id, clubId: b.club.id, role: 'admin' });
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${crossTenant}`);

    expect(res.status).toBe(404);
  });
});
