import type { RequestHandler } from 'express';
import { notFound as notFoundError } from '../types/errors.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(notFoundError(`Route ${req.method} ${req.path} not found`));
};
