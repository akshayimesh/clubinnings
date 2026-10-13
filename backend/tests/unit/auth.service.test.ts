import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({
  pool: {},
  withTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ tx: true })),
}));
vi.mock('../../src/services/club.repository.js', () => ({
  createClub: vi.fn(),
  findClubById: vi.fn(),
  slugExists: vi.fn(),
}));
vi.mock('../../src/services/user.repository.js', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserInClub: vi.fn(),
}));

const clubRepo = await import('../../src/services/club.repository.js');
const userRepo = await import('../../src/services/user.repository.js');
const { hashPassword } = await import('../../src/services/password.service.js');
const { verifyToken } = await import('../../src/services/token.service.js');
const { getCurrentUser, login, signup, slugify } = await import('../../src/services/auth.service.js');
const { AppError } = await import('../../src/types/errors.js');

const club = { id: 'club-1', name: 'Riverside CC', slug: 'riverside-cc', plan: 'free' as const, createdAt: new Date() };
const user = { id: 'user-1', clubId: 'club-1', email: 'a@b.test', role: 'admin' as const, createdAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clubRepo.slugExists).mockResolvedValue(false);
  vi.mocked(clubRepo.createClub).mockResolvedValue(club);
  vi.mocked(clubRepo.findClubById).mockResolvedValue(club);
  vi.mocked(userRepo.createUser).mockResolvedValue(user);
});

describe('slugify', () => {
  it.each([
    ['Riverside Cricket Club', 'riverside-cricket-club'],
    ['  St. Mary’s XI!! ', 'st-mary-s-xi'],
    ['Café Strikers', 'cafe-strikers'],
    ['***', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('caps length at 50 without a trailing hyphen', () => {
    const slug = slugify(`${'a'.repeat(49)} b`);
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('signup', () => {
  const input = { clubName: 'Riverside CC', email: 'a@b.test', password: 'password123' };

  it('creates the club and an admin user with a hashed password', async () => {
    const result = await signup(input);

    expect(clubRepo.createClub).toHaveBeenCalledWith({ tx: true }, { name: 'Riverside CC', slug: 'riverside-cc' });
    const created = vi.mocked(userRepo.createUser).mock.calls[0]![1];
    expect(created).toMatchObject({ clubId: 'club-1', email: 'a@b.test', role: 'admin' });
    expect(created.passwordHash).not.toBe('password123');
    expect(created.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(result.user).toEqual(user);
    expect(result.club).toEqual(club);
  });

  it('returns a token carrying userId, clubId and role', async () => {
    const { token } = await signup(input);
    expect(verifyToken(token)).toEqual({ userId: 'user-1', clubId: 'club-1', role: 'admin' });
  });

  it('uses an explicit slug when given', async () => {
    await signup({ ...input, clubSlug: 'rcc' });
    expect(clubRepo.createClub).toHaveBeenCalledWith(expect.anything(), { name: 'Riverside CC', slug: 'rcc' });
  });

  it('rejects an explicit slug that is taken with 409', async () => {
    vi.mocked(clubRepo.slugExists).mockResolvedValue(true);
    await expect(signup({ ...input, clubSlug: 'rcc' })).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(clubRepo.createClub).not.toHaveBeenCalled();
  });

  it('adds a random suffix when the derived slug is taken', async () => {
    vi.mocked(clubRepo.slugExists).mockResolvedValueOnce(true);
    await signup(input);
    const { slug } = vi.mocked(clubRepo.createClub).mock.calls[0]![1];
    expect(slug).toMatch(/^riverside-cc-[0-9a-f]{6}$/);
  });

  it('maps a unique-email violation to a 409 AppError', async () => {
    vi.mocked(userRepo.createUser).mockRejectedValue(
      Object.assign(new Error('duplicate'), { code: '23505', constraint: 'users_email_unique' }),
    );
    const err = await signup(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 409, message: 'An account with this email already exists' });
  });

  it('rethrows unexpected errors untouched', async () => {
    const boom = new Error('db down');
    vi.mocked(clubRepo.createClub).mockRejectedValue(boom);
    await expect(signup(input)).rejects.toBe(boom);
  });
});

describe('login', () => {
  it('returns a token and the user without the password hash', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue({ ...user, passwordHash: await hashPassword('secret-pw') });

    const result = await login({ email: 'a@b.test', password: 'secret-pw' });

    expect(result.user).toEqual(user);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.club).toEqual(club);
    expect(verifyToken(result.token)).toEqual({ userId: 'user-1', clubId: 'club-1', role: 'admin' });
  });

  it('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue({ ...user, passwordHash: await hashPassword('secret-pw') });
    await expect(login({ email: 'a@b.test', password: 'nope' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects an unknown email with the same error', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    await expect(login({ email: 'ghost@b.test', password: 'whatever' })).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });
});

describe('getCurrentUser', () => {
  it('looks the user up within their club', async () => {
    vi.mocked(userRepo.findUserInClub).mockResolvedValue(user);
    await expect(getCurrentUser('user-1', 'club-1')).resolves.toEqual({ user, club });
    expect(userRepo.findUserInClub).toHaveBeenCalledWith('user-1', 'club-1');
  });

  it('throws 404 when the user is not in the club', async () => {
    vi.mocked(userRepo.findUserInClub).mockResolvedValue(null);
    await expect(getCurrentUser('user-1', 'other-club')).rejects.toMatchObject({ status: 404 });
  });
});
