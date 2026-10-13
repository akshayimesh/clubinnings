import { Router } from 'express';
import { login, signup } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, signupSchema } from '../validation/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), signup);
authRouter.post('/login', validateBody(loginSchema), login);
