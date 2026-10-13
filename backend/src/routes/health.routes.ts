import { Router } from 'express';
import { healthz } from '../controllers/health.controller.js';

export const healthRouter = Router();

healthRouter.get('/healthz', healthz);
