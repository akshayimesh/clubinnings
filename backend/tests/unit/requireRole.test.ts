import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../../src/middleware/requireRole.js';
import type { Role } from '../../src/types/domain.js';
import { AppError } from '../../src/types/errors.js';

function run(role: Role | undefined, ...allowed: Role[]) {
  const next = vi.fn();
  const req = { auth: role ? { userId: 'u', clubId: 'c', role } : undefined } as Request;
  requireRole(...allowed)(req, {} as Response, next);
  return next.mock.calls[0]?.[0] as AppError | undefined;
}

describe('requireRole', () => {
  it('calls next() for an allowed role', () => {
    expect(run('coach', 'admin', 'coach')).toBeUndefined();
  });

  it('rejects a disallowed role with 403 FORBIDDEN', () => {
    const err = run('player', 'admin', 'coach');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('rejects a request without auth with 401', () => {
    expect(run(undefined, 'admin')).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});
