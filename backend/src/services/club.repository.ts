import { pool, type Queryable } from '../db/pool.js';
import type { Club, Plan } from '../types/domain.js';

interface ClubRow {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  created_at: Date;
}

const COLUMNS = 'id, name, slug, plan, created_at';

const toClub = (r: ClubRow): Club => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  plan: r.plan,
  createdAt: r.created_at,
});

export async function createClub(db: Queryable, input: { name: string; slug: string }): Promise<Club> {
  const { rows } = await db.query<ClubRow>(
    `INSERT INTO clubs (name, slug) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [input.name, input.slug],
  );
  return toClub(rows[0]!);
}

export async function slugExists(db: Queryable, slug: string): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM clubs WHERE slug = $1', [slug]);
  return (rowCount ?? 0) > 0;
}

export async function findClubById(id: string, db: Queryable = pool): Promise<Club | null> {
  const { rows } = await db.query<ClubRow>(`SELECT ${COLUMNS} FROM clubs WHERE id = $1`, [id]);
  return rows[0] ? toClub(rows[0]) : null;
}
