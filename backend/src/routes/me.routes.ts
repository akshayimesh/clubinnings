import { Router } from 'express';
import { me } from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const meRouter = Router();

meRouter.get('/me', requireAuth, me);
