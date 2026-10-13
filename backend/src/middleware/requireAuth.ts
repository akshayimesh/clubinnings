import type { RequestHandler } from 'express';
import { verifyToken } from '../services/token.service.js';
import { unauthorized } from '../types/errors.js';

/** Requires `Authorization: Bearer <jwt>` and attaches `req.auth` ({ userId, clubId, role }). */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Missing bearer token'));
  }
  req.auth = verifyToken(token);
  next();
};
