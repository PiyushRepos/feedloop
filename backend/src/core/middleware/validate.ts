import type { RequestHandler } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../errors/AppError.js';

type RequestKey = 'body' | 'params' | 'query';

export function validate(key: RequestKey, schema: z.ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[key]);

    if (!result.success) {
      return next(
        new BadRequestError(result.error.issues[0]?.message ?? `Invalid ${key}`)
      );
    }

    req[key] = result.data;
    next();
  };
}
