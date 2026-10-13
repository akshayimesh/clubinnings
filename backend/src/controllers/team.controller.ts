import type { Request, Response } from 'express';
import * as rosterService from '../services/roster.service.js';
import * as teamService from '../services/team.service.js';
import type { AddRosterEntryInput, TeamNameInput, UpdateRosterEntryInput } from '../validation/team.schemas.js';
import { clubIdOf } from './requestAuth.js';

type TeamParams = { teamId: string };
type EntryParams = { teamId: string; playerId: string };

export async function listTeams(req: Request, res: Response) {
  const teams = await teamService.listTeams(clubIdOf(req));
  res.status(200).json({ teams });
}

export async function createTeam(req: Request<unknown, unknown, TeamNameInput>, res: Response) {
  const team = await teamService.createTeam(clubIdOf(req), req.body.name);
  res.status(201).json({ team });
}

export async function getTeam(req: Request<TeamParams>, res: Response) {
  const result = await teamService.getTeamWithRoster(clubIdOf(req), req.params.teamId);
  res.status(200).json(result);
}

export async function renameTeam(req: Request<TeamParams, unknown, TeamNameInput>, res: Response) {
  const team = await teamService.renameTeam(clubIdOf(req), req.params.teamId, req.body.name);
  res.status(200).json({ team });
}

export async function deleteTeam(req: Request<TeamParams>, res: Response) {
  await teamService.deleteTeam(clubIdOf(req), req.params.teamId);
  res.status(204).end();
}

export async function addPlayer(req: Request<TeamParams, unknown, AddRosterEntryInput>, res: Response) {
  const entry = await rosterService.addPlayer(clubIdOf(req), req.params.teamId, req.body);
  res.status(201).json({ entry });
}

export async function updateEntry(req: Request<EntryParams, unknown, UpdateRosterEntryInput>, res: Response) {
  const { teamId, playerId } = req.params;
  const entry = await rosterService.updateEntry(clubIdOf(req), teamId, playerId, req.body);
  res.status(200).json({ entry });
}

export async function removePlayer(req: Request<EntryParams>, res: Response) {
  await rosterService.removePlayer(clubIdOf(req), req.params.teamId, req.params.playerId);
  res.status(204).end();
}
