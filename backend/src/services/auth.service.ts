import { randomBytes } from 'node:crypto';
import { withTransaction, type Queryable } from '../db/pool.js';
import type { Club, User } from '../types/domain.js';
import { AppError, conflict, notFound, unauthorized } from '../types/errors.js';
import type { LoginInput, SignupInput } from '../validation/auth.schemas.js';
import { createClub, findClubById, slugExists } from './club.repository.js';
import { getDummyHash, hashPassword, verifyPassword } from './password.service.js';
import { signToken } from './token.service.js';
import { createUser, findUserByEmail, findUserInClub } from './user.repository.js';

export interface AuthResult {
  token: string;
  user: User;
  club: Club;
}

const PG_UNIQUE_VIOLATION = '23505';

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50)
    .replace(/^-+|-+$/g, '');
}

/** Creates a club and its first admin user in a single transaction. */
export async function signup(input: SignupInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  try {
    return await withTransaction(async (tx) => {
      const slug = await resolveSlug(tx, input);
      const club = await createClub(tx, { name: input.clubName, slug });
      const user = await createUser(tx, { clubId: club.id, email: input.email, passwordHash, role: 'admin' });
      return { token: signToken({ userId: user.id, clubId: club.id, role: user.role }), user, club };
    });
  } catch (err) {
    throw mapUniqueViolation(err);
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const found = await findUserByEmail(input.email);
  const ok = await verifyPassword(input.password, found?.passwordHash ?? (await getDummyHash()));
  if (!found || !ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const club = await findClubById(found.clubId);
  if (!club) throw unauthorized();

  const { passwordHash: _omit, ...user } = found;
  return { token: signToken({ userId: user.id, clubId: club.id, role: user.role }), user, club };
}

export async function getCurrentUser(userId: string, clubId: string): Promise<{ user: User; club: Club }> {
  const [user, club] = await Promise.all([findUserInClub(userId, clubId), findClubById(clubId)]);
  if (!user || !club) throw notFound('User not found');
  return { user, club };
}

async function resolveSlug(tx: Queryable, input: SignupInput): Promise<string> {
  if (input.clubSlug) {
    if (await slugExists(tx, input.clubSlug)) throw conflict('Club slug is already taken');
    return input.clubSlug;
  }
  const base = slugify(input.clubName) || 'club';
  if (!(await slugExists(tx, base))) return base;
  return `${base}-${randomBytes(3).toString('hex')}`;
}

function mapUniqueViolation(err: unknown): unknown {
  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
    const constraint = (err as { constraint?: string }).constraint ?? '';
    if (constraint.includes('email')) return conflict('An account with this email already exists');
    if (constraint.includes('slug')) return conflict('Club slug is already taken');
  }
  return err;
}
