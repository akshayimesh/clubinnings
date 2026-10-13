import type { Request, Response } from 'express';
import * as playerService from '../services/player.service.js';
import type { CreatePlayerInput } from '../validation/team.schemas.js';
import { clubIdOf } from './requestAuth.js';

export async function listPlayers(req: Request, res: Response) {
  const players = await playerService.listPlayers(clubIdOf(req));
  res.status(200).json({ players });
}

export async function createPlayer(req: Request<unknown, unknown, CreatePlayerInput>, res: Response) {
  const player = await playerService.createPlayer(clubIdOf(req), req.body.fullName);
  res.status(201).json({ player });
}
