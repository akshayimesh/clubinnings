import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { meRouter } from './me.routes.js';
import { playerRouter } from './player.routes.js';
import { teamRouter } from './team.routes.js';

/** Routes mounted under /api. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(meRouter);
// Mounted on a prefix so their router-level requireAuth doesn't turn unknown /api routes into 401s.
apiRouter.use('/teams', teamRouter);
apiRouter.use('/players', playerRouter);
