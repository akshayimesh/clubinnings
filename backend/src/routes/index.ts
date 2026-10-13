import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { meRouter } from './me.routes.js';

/** Routes mounted under /api. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(meRouter);
