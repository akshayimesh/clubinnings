import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../types/errors.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const PG_UNIQUE_VIOLATION = '23505';

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

/** Turns any thrown error into `{ error: { code, message, details? } }`. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };

  if (err instanceof AppError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } };
  } else if (isPgError(err) && err.code === PG_UNIQUE_VIOLATION) {
    status = 409;
    body = { error: { code: 'CONFLICT', message: 'Resource already exists' } };
  }

  if (status >= 500 && env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(status).json(body);
};
