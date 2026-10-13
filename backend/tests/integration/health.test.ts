import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { closeDb } from '../helpers/db.js';
import { app } from '../helpers/api.js';

afterAll(closeDb);

describe('GET /healthz', () => {
  it('returns 200 ok when the database is reachable', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 when the database check fails', async () => {
    const spy = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('connection refused') as never);
    const res = await request(app).get('/healthz');
    spy.mockRestore();

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

describe('unknown routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });
});
