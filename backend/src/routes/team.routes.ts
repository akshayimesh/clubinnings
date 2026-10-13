import { Router } from 'express';
import {
  addPlayer,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  removePlayer,
  renameTeam,
  updateEntry,
} from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { uuidParam } from '../middleware/uuidParam.js';
import { validateBody } from '../middleware/validate.js';
import { addRosterEntrySchema, teamNameSchema, updateRosterEntrySchema } from '../validation/team.schemas.js';

/** Mounted at /api/teams. Every role can read; admins and coaches can write; only admins delete teams. */
export const teamRouter = Router();

const write = requireRole('admin', 'coach');

teamRouter.use(requireAuth);
teamRouter.param('teamId', uuidParam);
teamRouter.param('playerId', uuidParam);

teamRouter.get('/', listTeams);
teamRouter.post('/', write, validateBody(teamNameSchema), createTeam);
teamRouter.get('/:teamId', getTeam);
teamRouter.patch('/:teamId', write, validateBody(teamNameSchema), renameTeam);
teamRouter.delete('/:teamId', requireRole('admin'), deleteTeam);

teamRouter.post('/:teamId/players', write, validateBody(addRosterEntrySchema), addPlayer);
teamRouter.patch('/:teamId/players/:playerId', write, validateBody(updateRosterEntrySchema), updateEntry);
teamRouter.delete('/:teamId/players/:playerId', write, removePlayer);
