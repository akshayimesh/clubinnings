import type { Request } from 'express';
import { unauthorized } from '../types/errors.js';

/** The caller's club from the verified token: the only source of `club_id` for tenant queries. */
export function clubIdOf(req: Pick<Request, 'auth'>): string {
  if (!req.auth) throw unauthorized();
  return req.auth.clubId;
}
