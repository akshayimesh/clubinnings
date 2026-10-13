import type { RequestHandler } from 'express';
import type { Role } from '../types/domain.js';
import { forbidden, unauthorized } from '../types/errors.js';

/** Allows the request only for the given roles. Must run after requireAuth. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
}
