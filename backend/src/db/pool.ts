import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });

/** Anything that can run a query: the pool or a client inside a transaction. */
export type Queryable = Pick<pg.PoolClient, 'query'>;

export function query<T extends pg.QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params);
}

/** Runs `fn` inside BEGIN/COMMIT, rolling back if it throws. */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
