import type { Request, Response } from 'express';
import { getCurrentUser } from '../services/auth.service.js';
import { unauthorized } from '../types/errors.js';

export async function me(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const result = await getCurrentUser(req.auth.userId, req.auth.clubId);
  res.status(200).json(result);
}
