import request from 'supertest';
import { createApp } from '../../src/app.js';

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
