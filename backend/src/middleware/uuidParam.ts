import type { RequestParamHandler } from 'express';
import { z } from 'zod';
import { notFound } from '../types/errors.js';

const uuid = z.uuid();

/** `router.param` handler: a path id that isn't a UUID can't exist, so answer 404 instead of a Postgres 500. */
export const uuidParam: RequestParamHandler = (_req, _res, next, value) => {
  if (!uuid.safeParse(value).success) return next(notFound());
  next();
};
