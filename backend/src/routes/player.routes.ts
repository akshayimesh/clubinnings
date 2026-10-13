import { Router } from 'express';
import { createPlayer, listPlayers } from '../controllers/player.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody } from '../middleware/validate.js';
import { createPlayerSchema } from '../validation/team.schemas.js';

/** Mounted at /api/players. Every role can read; admins and coaches can create. */
export const playerRouter = Router();

playerRouter.use(requireAuth);

playerRouter.get('/', listPlayers);
playerRouter.post('/', requireRole('admin', 'coach'), validateBody(createPlayerSchema), createPlayer);
