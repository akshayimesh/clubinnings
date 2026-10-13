import type { RequestHandler } from 'express';
import { pool } from '../db/pool.js';

export const healthz: RequestHandler = async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', error: { code: 'DB_UNAVAILABLE', message: 'Database unreachable' } });
  }
};
