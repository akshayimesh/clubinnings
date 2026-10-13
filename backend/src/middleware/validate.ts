import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/** Parses `req.body` with the schema, replacing it with the parsed value. ZodErrors reach errorHandler. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
