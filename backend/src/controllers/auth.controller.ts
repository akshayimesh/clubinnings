import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { LoginInput, SignupInput } from '../validation/auth.schemas.js';

export async function signup(req: Request<unknown, unknown, SignupInput>, res: Response) {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
}

export async function login(req: Request<unknown, unknown, LoginInput>, res: Response) {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}
